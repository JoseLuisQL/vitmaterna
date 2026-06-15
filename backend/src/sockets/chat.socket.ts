import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AccessTokenPayload } from '../types/index.js';

/**
 * Sockets de chat en tiempo real.
 *
 * Eventos cliente -> servidor:
 *  - join_conversation(conversationId)
 *  - leave_conversation(conversationId)
 *  - send_message({ conversationId, content, type?, mediaUrl?, clientId? })
 *  - typing({ conversationId, isTyping })
 *  - mark_read({ conversationId })
 *
 * Eventos servidor -> cliente:
 *  - receive_message(message)         message incluye clientId para reconciliar el optimista
 *  - presence({ userId, online })     estado en línea del otro participante de la sala
 *  - typing({ userId, isTyping })     el otro participante está escribiendo
 *  - messages_read({ conversationId, readerId })  el otro leyó los mensajes
 *  - error({ message })
 */
export const setupChatSockets = (io: Server) => {
  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization'];
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(
        token.replace('Bearer ', ''),
        env.JWT_ACCESS_SECRET
      ) as AccessTokenPayload;

      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;

    // Sala personal para notificaciones directas.
    socket.join(`user:${user.userId}`);

    // Resuelve si el usuario participa en la conversación.
    const isParticipant = async (conversationId: string): Promise<boolean> => {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conversation) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'gestante') {
        const gestante = await prisma.gestante.findUnique({ where: { userId: user.userId } });
        return !!gestante && gestante.id === conversation.gestanteId;
      }
      if (user.role === 'obstetra') {
        const obstetra = await prisma.obstetra.findUnique({ where: { userId: user.userId } });
        return !!obstetra && obstetra.id === conversation.obstetraId;
      }
      return false;
    };

    // Unirse a la sala de una conversación + anunciar presencia.
    socket.on('join_conversation', async (conversationId: string) => {
      const room = `conversation:${conversationId}`;
      socket.join(room);

      // Avisa a los demás de la sala que este usuario está en línea.
      socket.to(room).emit('presence', { userId: user.userId, online: true });

      // Informa a este usuario quiénes ya están presentes en la sala.
      try {
        const sockets = await io.in(room).fetchSockets();
        const others = sockets.filter((s) => s.data?.user?.userId && s.data.user.userId !== user.userId);
        for (const s of others) {
          socket.emit('presence', { userId: s.data.user.userId, online: true });
        }
      } catch {
        /* noop */
      }
    });

    socket.on('leave_conversation', (conversationId: string) => {
      const room = `conversation:${conversationId}`;
      socket.to(room).emit('presence', { userId: user.userId, online: false });
      socket.leave(room);
    });

    // Indicador "escribiendo...".
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (!data?.conversationId) return;
      socket
        .to(`conversation:${data.conversationId}`)
        .emit('typing', { userId: user.userId, isTyping: !!data.isTyping });
    });

    // Marcar como leídos los mensajes recibidos en la conversación.
    socket.on('mark_read', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) return;
        if (!(await isParticipant(conversationId))) return;

        await prisma.message.updateMany({
          where: { conversationId, senderId: { not: user.userId }, leido: false },
          data: { leido: true, leidoAt: new Date() },
        });

        io.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          readerId: user.userId,
        });
      } catch (error) {
        console.error('Socket mark_read error:', error);
      }
    });

    socket.on(
      'send_message',
      async (data: {
        conversationId: string;
        content: string;
        type?: 'texto' | 'imagen' | 'alerta_emergencia';
        mediaUrl?: string;
        clientId?: string;
      }) => {
        try {
          const { conversationId, content, type = 'texto', mediaUrl, clientId } = data;

          if (!(await isParticipant(conversationId))) {
            socket.emit('error', { message: 'Not a participant of this conversation' });
            return;
          }

          const message = await prisma.message.create({
            data: {
              conversationId,
              senderId: user.userId,
              contenido: content,
              tipo: type,
              mediaUrl: mediaUrl ?? null,
            },
            include: {
              sender: { select: { id: true, firstName: true, lastName: true, role: true } },
            },
          });

          await prisma.conversation.update({
            where: { id: conversationId },
            data: { ultimoMensaje: new Date() },
          });

          // clientId permite al emisor reconciliar su mensaje optimista sin duplicar.
          io.to(`conversation:${conversationId}`).emit('receive_message', { ...message, clientId });
        } catch (error) {
          console.error('Socket send_message error:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      }
    );

    socket.on('disconnect', () => {
      // Anuncia que el usuario salió de todas sus salas de conversación.
      for (const room of socket.rooms) {
        if (typeof room === 'string' && room.startsWith('conversation:')) {
          socket.to(room).emit('presence', { userId: user.userId, online: false });
        }
      }
    });
  });
};
