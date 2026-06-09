import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';

export const getConversationHistory = async (
  userId: string,
  userRole: string,
  conversationId: string,
  page: number,
  limit: number
) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Conversation not found');
  }

  // Check access
  let hasAccess = false;
  if (userRole === 'admin') {
    hasAccess = true;
  } else if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (gestante && gestante.id === conversation.gestanteId) hasAccess = true;
  } else if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (obstetra && obstetra.id === conversation.obstetraId) hasAccess = true;
  }

  if (!hasAccess) {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Not authorized to view this conversation');
  }

  const skip = (page - 1) * limit;

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      },
    },
  });

  const total = await prisma.message.count({ where: { conversationId } });

  return {
    messages,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getOrCreateConversation = async (
  userId: string,
  userRole: string,
  targetId?: string
) => {
  if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante profile not found');
    }

    let obstetraId = targetId;
    if (!obstetraId) {
      const lastControl = await prisma.prenatalControl.findFirst({
        where: { gestanteId: gestante.id },
        orderBy: { fecha: 'desc' },
      });
      if (lastControl) {
        obstetraId = lastControl.obstetraId;
      } else {
        const firstObstetra = await prisma.obstetra.findFirst();
        if (!firstObstetra) {
          throw new AppError(404, ErrorCodes.NOT_FOUND, 'No obstetras registered in health center');
        }
        obstetraId = firstObstetra.id;
      }
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        gestanteId: gestante.id,
        obstetraId,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          gestanteId: gestante.id,
          obstetraId,
        },
      });
    }

    return conversation;
  } else if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (!obstetra) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Obstetra profile not found');
    }

    let gestanteId = targetId;
    if (!gestanteId) {
      const firstConv = await prisma.conversation.findFirst({
        where: { obstetraId: obstetra.id },
        orderBy: { ultimoMensaje: 'desc' },
      });
      if (!firstConv) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Gestante ID is required for obstetra to start/load a chat');
      }
      return firstConv;
    }

    let conversation = await prisma.conversation.findFirst({
      where: {
        gestanteId,
        obstetraId: obstetra.id,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          gestanteId,
          obstetraId: obstetra.id,
        },
      });
    }

    return conversation;
  } else {
    throw new AppError(403, ErrorCodes.FORBIDDEN, 'Administrators cannot participate in direct clinical chats');
  }
};

export const listConversations = async (userId: string, userRole: string) => {
  if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (!obstetra) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Obstetra profile not found');
    }

    return prisma.conversation.findMany({
      where: { obstetraId: obstetra.id },
      include: {
        gestante: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                dni: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
      orderBy: { ultimoMensaje: 'desc' },
    });
  } else if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante profile not found');
    }

    return prisma.conversation.findMany({
      where: { gestanteId: gestante.id },
      include: {
        obstetra: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        }
      },
      orderBy: { ultimoMensaje: 'desc' },
    });
  } else {
    return [];
  }
};

export const sendEmergencyAlert = async (userId: string, latitude: number, longitude: number) => {
  const gestante = await prisma.gestante.findUnique({
    where: { userId },
    include: { user: true }
  });

  if (!gestante) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante profile not found');
  }

  const conversation = await getOrCreateConversation(userId, 'gestante');
  const alertText = `🚨 ALERTA DE EMERGENCIA: La gestante ${gestante.user.firstName} ${gestante.user.lastName} ha presionado el botón de pánico. Ubicación: https://maps.google.com/?q=${latitude},${longitude}`;
  
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        contenido: alertText,
        tipo: 'alerta_emergencia',
        mediaUrl: `https://maps.google.com/?q=${latitude},${longitude}`,
      }
    });

    await tx.conversation.update({
      where: { id: conversation.id },
      data: { ultimoMensaje: new Date() }
    });

    const obstetra = await tx.obstetra.findUnique({
      where: { id: conversation.obstetraId },
      include: { user: true }
    });

    if (obstetra?.user?.notificationPreferences) {
      const prefs = obstetra.user.notificationPreferences as Record<string, any>;
      if (prefs.expoPushToken) {
        const { sendPushNotification } = await import('../notifications/notification.service.js');
        await sendPushNotification(
          [prefs.expoPushToken],
          '🚨 EMERGENCIA GESTANTE',
          `Paciente ${gestante.user.firstName} ha activado el botón de auxilio!`,
          { gestanteId: gestante.id, conversationId: conversation.id }
        );
      }
    }

    return message;
  });
};
