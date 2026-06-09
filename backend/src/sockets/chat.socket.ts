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

    socket.on('send_message', async (data: { conversationId: string; content: string; type?: 'texto' | 'imagen' | 'alerta_emergencia' }) => {
      try {
        const { conversationId, content, type = 'texto' } = data;

        // Verify conversation exists and user is part of it
        const conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        const isParticipant =
          conversation.gestanteId === user.userId || conversation.obstetraId === user.userId;
        
        // Wait, User has gestante or obstetra ID differently, userId is the User table ID.
        // Let's check User relation to Gestante/Obstetra
        let userIsParticipant = false;
        if (user.role === 'gestante') {
          const gestante = await prisma.gestante.findUnique({ where: { userId: user.userId } });
          if (gestante && gestante.id === conversation.gestanteId) userIsParticipant = true;
        } else if (user.role === 'obstetra') {
          const obstetra = await prisma.obstetra.findUnique({ where: { userId: user.userId } });
          if (obstetra && obstetra.id === conversation.obstetraId) userIsParticipant = true;
        }

        if (!userIsParticipant) {
           // Allow admin or maybe we just check if it's the sender
           if (user.role !== 'admin') {
              socket.emit('error', { message: 'Not a participant of this conversation' });
              return;
           }
        }

        // Save message
        const message = await prisma.message.create({
          data: {
            conversationId,
            senderId: user.userId,
            contenido: content,
            tipo: type,
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
