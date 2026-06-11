import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';
import { AccessTokenPayload } from '../types/index.js';

export const setupChatSockets = (io: Server) => {
  // Middleware for authentication
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

    // Join a personal room for direct notifications if needed
    socket.join(`user:${user.userId}`);

    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conversation:${conversationId}`);
    });

    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on('send_message', async (data: { conversationId: string; content: string; type?: 'texto' | 'imagen' | 'alerta_emergencia'; mediaUrl?: string }) => {
      try {
        const { conversationId, content, type = 'texto', mediaUrl } = data;

        // Verificar que la conversación existe y que el usuario participa.
        // Nota: conversation.gestanteId / obstetraId son IDs de los perfiles
        // (Gestante/Obstetra), no del usuario; hay que resolver el perfil del
        // usuario autenticado para compararlos correctamente.
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        let userIsParticipant = false;
        if (user.role === 'gestante') {
          const gestante = await prisma.gestante.findUnique({ where: { userId: user.userId } });
          if (gestante && gestante.id === conversation.gestanteId) userIsParticipant = true;
        } else if (user.role === 'obstetra') {
          const obstetra = await prisma.obstetra.findUnique({ where: { userId: user.userId } });
          if (obstetra && obstetra.id === conversation.obstetraId) userIsParticipant = true;
        }

        // Los administradores pueden participar (p. ej. mensajes masivos).
        if (!userIsParticipant && user.role !== 'admin') {
          socket.emit('error', { message: 'Not a participant of this conversation' });
          return;
        }

        // Save message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: user.userId,
            contenido: content,
            tipo: type,
            mediaUrl: mediaUrl ?? null,
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              }
            }
          }
        });

        // Update conversation lastMessage time
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { ultimoMensaje: new Date() }
        });

        // Broadcast to the conversation room
        io.to(`conversation:${conversationId}`).emit('receive_message', message);
      } catch (error) {
        console.error('Socket send_message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    socket.on('disconnect', () => {
      // Clean up if needed
    });
  });
};
