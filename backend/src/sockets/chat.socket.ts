import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AccessTokenPayload } from '../types/index.js';

/**
 * Sockets de chat en tiempo real con presencia GLOBAL (estilo WhatsApp).
 *
 * Presencia: un usuario está "en línea" si tiene al menos un socket conectado al
 * sistema (no solo si abrió una conversación). Al desconectar su último socket,
 * se guarda `lastSeenAt` y se difunde "última vez". Así el otro participante ve
 * "En línea" / "últ. vez hoy 10:30" aunque no tengan el chat abierto a la vez.
 *
 * Eventos cliente -> servidor:
 *  - join_conversation(conversationId)
 *  - leave_conversation(conversationId)
 *  - send_message({ conversationId, content, type?, mediaUrl?, clientId? })
 *  - typing({ conversationId, isTyping })
 *  - mark_read({ conversationId })
 *  - get_presence({ userId })   pide el estado actual de un usuario
 *
 * Eventos servidor -> cliente:
 *  - receive_message(message)    incluye clientId para reconciliar el optimista
 *  - presence({ userId, online, lastSeenAt })  estado del otro participante
 *  - typing({ userId, isTyping })
 *  - messages_read({ conversationId, readerId })
 *  - error({ message })
 */

// Registro global de presencia: userId -> nº de sockets conectados.
const onlineCounts = new Map<string, number>();

function isOnline(userId: string): boolean {
  return (onlineCounts.get(userId) ?? 0) > 0;
}

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
        env.JWT_ACCESS_SECRET,
      ) as AccessTokenPayload;
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    const userId: string = user.userId;

    // Sala personal para notificaciones directas / presencia dirigida.
    socket.join(`user:${userId}`);

    // ── Presencia global: marcar en línea ──
    const prev = onlineCounts.get(userId) ?? 0;
    onlineCounts.set(userId, prev + 1);
    const justCameOnline = prev === 0;

    if (justCameOnline) {
      // Avisar a todos (los chats abiertos filtran por el userId que les importa).
      io.emit('presence', { userId, online: true, lastSeenAt: null });
    }

    // Resuelve si el usuario participa en la conversación.
    const isParticipant = async (conversationId: string): Promise<boolean> => {
      const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
      if (!conversation) return false;
      if (user.role === 'admin') return true;
      if (user.role === 'gestante') {
        const gestante = await prisma.gestante.findUnique({ where: { userId } });
        return !!gestante && gestante.id === conversation.gestanteId;
      }
      if (user.role === 'obstetra') {
        const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
        return !!obstetra && obstetra.id === conversation.obstetraId;
      }
      return false;
    };

    // Consulta puntual de presencia de un usuario (al abrir el chat).
    socket.on('get_presence', async (data: { userId?: string }) => {
      const target = data?.userId;
      if (!target) return;
      if (isOnline(target)) {
        socket.emit('presence', { userId: target, online: true, lastSeenAt: null });
      } else {
        const u = await prisma.user.findUnique({ where: { id: target }, select: { lastSeenAt: true } });
        socket.emit('presence', { userId: target, online: false, lastSeenAt: u?.lastSeenAt ?? null });
      }
    });

    // Unirse a la sala de una conversación.
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    // Indicador "escribiendo..." (solo a la sala de la conversación).
    socket.on('typing', (data: { conversationId: string; isTyping: boolean }) => {
      if (!data?.conversationId) return;
      socket
        .to(`conversation:${data.conversationId}`)
        .emit('typing', { userId, isTyping: !!data.isTyping });
    });

    // Marcar como leídos los mensajes recibidos en la conversación.
    socket.on('mark_read', async (data: { conversationId: string }) => {
      try {
        const { conversationId } = data || {};
        if (!conversationId) return;
        if (!(await isParticipant(conversationId))) return;

        await prisma.message.updateMany({
          where: { conversationId, senderId: { not: userId }, leido: false },
          data: { leido: true, leidoAt: new Date() },
        });

        io.to(`conversation:${conversationId}`).emit('messages_read', {
          conversationId,
          readerId: userId,
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
              senderId: userId,
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
      },
    );

    socket.on('disconnect', async () => {
      // ── Presencia global: descontar socket ──
      const count = (onlineCounts.get(userId) ?? 1) - 1;
      if (count <= 0) {
        onlineCounts.delete(userId);
        const lastSeenAt = new Date();
        try {
          await prisma.user.update({ where: { id: userId }, data: { lastSeenAt } });
        } catch {
          /* noop */
        }
        // Avisar a todos que el usuario quedó offline con su última conexión.
        io.emit('presence', { userId, online: false, lastSeenAt });
      } else {
        onlineCounts.set(userId, count);
      }
    });
  });
};
