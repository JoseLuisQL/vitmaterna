import { prisma } from '../../config/database.js';
import { AppError, ErrorCodes } from '../../types/index.js';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

/** Directorio físico donde se guardan las imágenes del chat. */
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads', 'chat');

const EXT_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * RF-9.01: guarda una imagen (base64) del chat en disco y devuelve su URL
 * pública relativa (/uploads/chat/<archivo>). El cliente la envía luego como
 * `mediaUrl` en un mensaje de tipo `imagen`.
 */
export const saveChatImage = async (base64: string, mimeType: string): Promise<string> => {
  // Permitir prefijo data:image/...;base64,
  const cleaned = base64.includes(',') ? base64.split(',')[1] : base64;
  const buffer = Buffer.from(cleaned, 'base64');

  // Validación de tamaño (máx 8MB ya decodificado).
  if (buffer.length === 0) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Imagen inválida');
  }
  if (buffer.length > 8 * 1024 * 1024) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'La imagen supera el tamaño máximo (8MB)');
  }

  const ext = EXT_BY_MIME[mimeType] || 'jpg';
  const filename = `${randomUUID()}.${ext}`;

  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOADS_DIR, filename), buffer);

  return `/uploads/chat/${filename}`;
};

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

    // Adjuntar datos de contacto del obstetra (para chat directo y WhatsApp RF-9.05).
    const obstetraInfo = await prisma.obstetra.findUnique({
      where: { id: obstetraId },
      include: { user: { select: { firstName: true, lastName: true, phone: true } } },
    });

    return {
      ...conversation,
      obstetra: obstetraInfo
        ? {
            id: obstetraInfo.id,
            firstName: obstetraInfo.user.firstName,
            lastName: obstetraInfo.user.lastName,
            phone: obstetraInfo.user.phone,
          }
        : null,
    };
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

/**
 * Envía un mensaje masivo del obstetra a las gestantes que cumplan el filtro
 * (RF-9.03). Filtros opcionales: trimestre (1-3) y nivel de riesgo. El mensaje
 * se crea en la conversación de cada gestante (creándola si no existe) y se
 * envía notificación push a quienes tengan token registrado.
 */
export const sendBroadcast = async (
  userId: string,
  contenido: string,
  filtros: { trimestre?: number; nivelRiesgo?: 'verde' | 'amarillo' | 'rojo' }
) => {
  const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
  if (!obstetra) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Perfil de obstetra no encontrado');
  }

  // Construir el filtro de gestantes
  const where: any = { estado: 'activa' };
  if (filtros.nivelRiesgo) {
    where.nivelRiesgo = filtros.nivelRiesgo;
  }

  // Filtro por trimestre usando la FPP (semana = 40 - semanas restantes)
  if (filtros.trimestre) {
    const hoy = new Date();
    // Trimestre 1: <=13 sem -> FPP entre hoy+189d (27 sem rest) y hoy+280d
    // Trimestre 2: 14-27 sem -> FPP entre hoy+91d y hoy+189d
    // Trimestre 3: >=28 sem -> FPP entre hoy y hoy+91d
    const dias = (n: number) => new Date(hoy.getTime() + n * 24 * 60 * 60 * 1000);
    let rango: { gte?: Date; lte?: Date } = {};
    if (filtros.trimestre === 1) rango = { gte: dias(189), lte: dias(280) };
    else if (filtros.trimestre === 2) rango = { gte: dias(91), lte: dias(189) };
    else if (filtros.trimestre === 3) rango = { gte: hoy, lte: dias(91) };
    where.OR = [{ fppFum: rango }, { fppEco: rango }];
  }

  const gestantes = await prisma.gestante.findMany({
    where,
    include: { user: true },
  });

  let enviados = 0;
  const pushTokens: string[] = [];

  for (const gestante of gestantes) {
    // Buscar o crear conversación obstetra-gestante
    let conversation = await prisma.conversation.findFirst({
      where: { gestanteId: gestante.id, obstetraId: obstetra.id },
    });
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { gestanteId: gestante.id, obstetraId: obstetra.id },
      });
    }

    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        contenido,
        tipo: 'texto',
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { ultimoMensaje: new Date() },
    });

    const prefs = gestante.user?.notificationPreferences as Record<string, any> | null;
    if (prefs?.expoPushToken) pushTokens.push(prefs.expoPushToken);

    enviados++;
  }

  if (pushTokens.length > 0) {
    const { sendPushNotification } = await import('../notifications/notification.service.js');
    await sendPushNotification(pushTokens, 'Mensaje de tu obstetra', contenido);
  }

  return { enviados, total: gestantes.length };
};
