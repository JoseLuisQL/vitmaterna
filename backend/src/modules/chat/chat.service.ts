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
      // Contenido educativo referenciado (mensajes tipo `educacion`): permite
      // que el chat muestre una tarjeta clickeable que lleva al recurso.
      content: {
        select: { id: true, titulo: true, categoria: true, tipo: true, trimestre: true, thumbnailUrl: true, duracionMin: true },
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
      include: { user: { select: { id: true, firstName: true, lastName: true, phone: true, lastSeenAt: true } } },
    });

    return {
      ...conversation,
      obstetra: obstetraInfo
        ? {
            id: obstetraInfo.id,
            userId: obstetraInfo.user.id, // para presencia en tiempo real
            firstName: obstetraInfo.user.firstName,
            lastName: obstetraInfo.user.lastName,
            phone: obstetraInfo.user.phone,
            lastSeenAt: obstetraInfo.user.lastSeenAt,
          }
        : null,
    };
  } else if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (!obstetra) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Obstetra profile not found');
    }

    const gestanteId = targetId;
    if (!gestanteId) {
      // Sin gestante objetivo: devolver la conversación más reciente del obstetra
      // (si existe) en vez de fallar. La bandeja (listConversations) es la fuente
      // principal; este atajo solo sirve para "abrir el último chat".
      const firstConv = await prisma.conversation.findFirst({
        where: { obstetraId: obstetra.id },
        orderBy: { ultimoMensaje: 'desc' },
      });
      return firstConv ?? null;
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

/**
 * Resumen profesional y corto del último mensaje para la bandeja de chats
 * (estilo WhatsApp). Nunca expone URLs crudas ni el texto completo de una alerta.
 */
const buildPreview = (msg?: { contenido: string; tipo: string } | null): string => {
  if (!msg) return '';
  switch (msg.tipo) {
    case 'imagen':
      return 'Foto';
    case 'educacion':
      return 'Contenido educativo recomendado';
    case 'alerta_emergencia':
      return 'Alerta de emergencia';
    default: {
      const t = (msg.contenido || '').replace(/\s+/g, ' ').trim();
      return t.length > 80 ? `${t.slice(0, 80)}…` : t;
    }
  }
};

/** Fila ligera de la bandeja de chats: solo lo que la lista necesita pintar. */
export interface ConversationListItem {
  id: string | null;
  gestanteId: string;
  obstetraId: string;
  nombre: string;
  dni: string | null;
  nivelRiesgo: string | null;
  lastSeenAt: Date | null;
  /** userId del otro participante (para presencia en tiempo real). */
  otherUserId: string | null;
  lastMessage: string;
  lastMessageType: string | null;
  lastMessageAt: Date | null;
  /** true si el último mensaje lo envió el usuario actual (prefijo "Tú:"). */
  lastMessageMine: boolean;
  unreadCount: number;
}

export const listConversations = async (
  userId: string,
  userRole: string,
): Promise<ConversationListItem[]> => {
  if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (!obstetra) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Obstetra profile not found');
    }

    // CHAT-01: la bandeja muestra TODAS las gestantes asignadas a esta obstetra
    // (por cita o control prenatal) además de las que ya tienen conversación,
    // como una agenda de contactos. Las que no han escrito aparecen como
    // conversación vacía (sin último mensaje) y caen al final del orden.
    const gestantes = await prisma.gestante.findMany({
      where: {
        OR: [
          { appointments: { some: { obstetraId: obstetra.id } } },
          { prenatalControls: { some: { obstetraId: obstetra.id } } },
          { conversations: { some: { obstetraId: obstetra.id } } },
        ],
      },
      select: {
        id: true,
        nivelRiesgo: true,
        user: { select: { id: true, firstName: true, lastName: true, dni: true, lastSeenAt: true } },
      },
    });

    const rows = await Promise.all(
      gestantes.map(async (g): Promise<ConversationListItem> => {
        const conversation = await prisma.conversation.findFirst({
          where: { gestanteId: g.id, obstetraId: obstetra.id },
          include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
            _count: { select: { messages: { where: { leido: false, senderId: { not: userId } } } } },
          },
        });
        const last = conversation?.messages?.[0] ?? null;
        return {
          id: conversation?.id ?? null,
          gestanteId: g.id,
          obstetraId: obstetra.id,
          nombre: `${g.user.firstName ?? ''} ${g.user.lastName ?? ''}`.trim() || 'Gestante',
          dni: g.user.dni ?? null,
          nivelRiesgo: g.nivelRiesgo ?? null,
          lastSeenAt: g.user.lastSeenAt ?? null,
          otherUserId: g.user.id,
          lastMessage: buildPreview(last),
          lastMessageType: last?.tipo ?? null,
          lastMessageAt: last?.createdAt ?? conversation?.ultimoMensaje ?? null,
          lastMessageMine: last ? last.senderId === userId : false,
          unreadCount: conversation?._count?.messages ?? 0,
        };
      }),
    );

    return sortInbox(rows);
  } else if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (!gestante) {
      throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante profile not found');
    }

    const conversations = await prisma.conversation.findMany({
      where: { gestanteId: gestante.id },
      include: {
        obstetra: { include: { user: { select: { id: true, firstName: true, lastName: true, lastSeenAt: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: { where: { leido: false, senderId: { not: userId } } } } },
      },
    });

    const rows = conversations.map((c): ConversationListItem => {
      const last = c.messages?.[0] ?? null;
      return {
        id: c.id,
        gestanteId: c.gestanteId,
        obstetraId: c.obstetraId,
        nombre: `Obst. ${c.obstetra.user.firstName ?? ''} ${c.obstetra.user.lastName ?? ''}`.trim(),
        dni: null,
        nivelRiesgo: null,
        lastSeenAt: c.obstetra.user.lastSeenAt ?? null,
        otherUserId: c.obstetra.user.id,
        lastMessage: buildPreview(last),
        lastMessageType: last?.tipo ?? null,
        lastMessageAt: last?.createdAt ?? c.ultimoMensaje ?? null,
        lastMessageMine: last ? last.senderId === userId : false,
        unreadCount: c._count?.messages ?? 0,
      };
    });

    return sortInbox(rows);
  } else {
    return [];
  }
};

/**
 * Orden de la bandeja (estilo WhatsApp): primero las que tienen mensajes, por
 * fecha del último mensaje descendente; las conversaciones vacías al final,
 * alfabéticas. Resuelve el bug de orden indefinido con `ultimoMensaje = null`.
 */
const sortInbox = (rows: ConversationListItem[]): ConversationListItem[] =>
  rows.sort((a, b) => {
    const ta = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const tb = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    if (tb !== ta) return tb - ta;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

/**
 * Total de mensajes de chat sin leer para un usuario (suma de todas sus
 * conversaciones), excluyendo los que él mismo envió. Alimenta el badge del
 * tab de Chat (estilo WhatsApp).
 */
export const getUnreadChatCount = async (userId: string, userRole: string): Promise<number> => {
  let conversationWhere: any;
  if (userRole === 'obstetra') {
    const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
    if (!obstetra) return 0;
    conversationWhere = { obstetraId: obstetra.id };
  } else if (userRole === 'gestante') {
    const gestante = await prisma.gestante.findUnique({ where: { userId } });
    if (!gestante) return 0;
    conversationWhere = { gestanteId: gestante.id };
  } else {
    return 0;
  }

  return prisma.message.count({
    where: {
      leido: false,
      senderId: { not: userId },
      conversation: conversationWhere,
    },
  });
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
  // Para una gestante, getOrCreateConversation siempre crea/retorna conversación.
  if (!conversation) {
    throw new AppError(500, ErrorCodes.INTERNAL_ERROR, 'No se pudo crear la conversación de emergencia');
  }
  const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;

  // Edad gestacional aproximada (si hay FUM) para dar contexto clínico.
  let egTexto = '';
  if (gestante.fum) {
    const dias = Math.floor((Date.now() - new Date(gestante.fum).getTime()) / 86400000);
    const sem = Math.floor(dias / 7);
    if (sem > 0 && sem <= 42) egTexto = ` | ${sem} sem`;
  }

  const nombre = `${gestante.user.firstName} ${gestante.user.lastName}`.trim();
  const telefono = gestante.user.phone || 'sin registro';

  // Contenido estructurado (sin emojis): el frontend lo renderiza como tarjeta
  // de emergencia profesional. Cada dato en su línea, claro y accionable.
  const alertText = [
    'EMERGENCIA - Botón de auxilio activado',
    `Paciente: ${nombre}${egTexto}`,
    `Riesgo: ${gestante.nivelRiesgo || 'no definido'}`,
    `Teléfono: ${telefono}`,
    `Ubicación: ${mapsUrl}`,
  ].join('\n');

  const message = await prisma.$transaction(async (tx) => {
    const msg = await tx.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        contenido: alertText,
        tipo: 'alerta_emergencia',
        mediaUrl: mapsUrl,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
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
          'Emergencia: botón de auxilio',
          `${nombre} solicita ayuda inmediata. Toca para ver su ubicación.`,
          { gestanteId: gestante.id, conversationId: conversation.id, tipo: 'emergencia' }
        );
      }
    }

    return msg;
  });

  // Emitir en tiempo real a la sala de la conversación para que el obstetra
  // (o la gestante) vea la alerta sin recargar.
  try {
    const { getIO } = await import('../../config/socketRegistry.js');
    const io = getIO();
    io?.to(`conversation:${conversation.id}`).emit('receive_message', message);
  } catch {
    /* el mensaje ya quedó persistido; la emisión es best-effort */
  }

  return message;
};

/**
 * Recomienda un contenido educativo a una gestante concreta. Crea (o reutiliza)
 * la conversación obstetra-gestante y envía un mensaje con el título del recurso
 * y una nota opcional, más notificación push si la gestante tiene token.
 */
export const recommendContent = async (
  userId: string,
  gestanteId: string,
  contentId: string,
  nota?: string,
) => {
  const obstetra = await prisma.obstetra.findUnique({ where: { userId } });
  if (!obstetra) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Perfil de obstetra no encontrado');
  }

  const gestante = await prisma.gestante.findUnique({
    where: { id: gestanteId },
    include: { user: true },
  });
  if (!gestante) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Gestante no encontrada');
  }

  const content = await prisma.educationalContent.findUnique({ where: { id: contentId } });
  if (!content) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Contenido educativo no encontrado');
  }

  let conversation = await prisma.conversation.findFirst({
    where: { gestanteId: gestante.id, obstetraId: obstetra.id },
  });
  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: { gestanteId: gestante.id, obstetraId: obstetra.id },
    });
  }

  // El cuerpo lleva la nota del obstetra (si la hay). El título/categoría van en
  // la tarjeta clickeable del chat. Texto limpio, sin emojis (regla del sistema).
  const texto = nota?.trim()
    ? `Tu obstetra te recomienda este contenido: "${content.titulo}".\n\n${nota.trim()}`
    : `Tu obstetra te recomienda leer este contenido: "${content.titulo}".`;

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: userId,
      contenido: texto,
      tipo: 'educacion',
      contentId: content.id,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, role: true } },
      content: {
        select: { id: true, titulo: true, categoria: true, tipo: true, trimestre: true, thumbnailUrl: true, duracionMin: true },
      },
    },
  });
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { ultimoMensaje: new Date() },
  });

  // ── ASIGNAR el contenido al módulo de educación de la gestante ──
  // Persiste la recomendación para que aparezca SIEMPRE en su sección
  // "Recomendados para ti" y pueda estudiarlo en cualquier momento (no solo
  // como un mensaje fugaz en el chat). Idempotente: si ya estaba recomendado,
  // actualiza la nota y lo vuelve a marcar como no leído (re-recomendación).
  await prisma.recommendedContent.upsert({
    where: { gestanteId_contentId: { gestanteId: gestante.id, contentId: content.id } },
    create: {
      gestanteId: gestante.id,
      contentId: content.id,
      obstetraId: obstetra.id,
      nota: nota?.trim() || null,
      leido: false,
    },
    update: {
      obstetraId: obstetra.id,
      nota: nota?.trim() || null,
      leido: false,
      createdAt: new Date(),
    },
  });

  // Emite en tiempo real si la conversación está abierta.
  try {
    const { getIO } = await import('../../config/socketRegistry.js');
    const io = getIO();
    if (io) {
      io.to(`conversation:${conversation.id}`).emit('receive_message', message);
      // Avisa a la gestante para que su módulo de educación se refresque al instante.
      if (gestante.userId) {
        io.to(`user:${gestante.userId}`).emit('education:new_recommendation', { contentId: content.id });
        // CHAT-07: reordenar/actualizar la bandeja de la gestante en vivo.
        io.to(`user:${gestante.userId}`).emit('chat:new_message', {
          conversationId: conversation.id,
          senderId: userId,
          senderName: 'Tu obstetra',
          preview: 'Contenido educativo recomendado',
        });
      }
    }
  } catch {
    /* socket opcional */
  }

  // Notificación in-app persistente (campana) + tiempo real + push, además del
  // mensaje de chat. Así la gestante se entera aunque no abra el chat.
  if (gestante.userId) {
    const { notifyUser } = await import('../notifications/notification.service.js');
    await notifyUser(
      gestante.userId,
      'educacion',
      'Tu obstetra te recomienda un contenido',
      content.titulo,
      { conversationId: conversation.id, contentId: content.id, tipo: 'educacion' },
    );
  }

  return { conversationId: conversation.id, messageId: message.id };
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

    const msg = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        contenido,
        tipo: 'texto',
      },
      include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { ultimoMensaje: new Date() },
    });

    // CHAT-07: tiempo real — entregar el mensaje a la sala y reordenar la
    // bandeja de la gestante aunque no tenga el chat abierto.
    try {
      const { getIO } = await import('../../config/socketRegistry.js');
      const io = getIO();
      if (io) {
        io.to(`conversation:${conversation.id}`).emit('receive_message', msg);
        if (gestante.userId) {
          io.to(`user:${gestante.userId}`).emit('chat:new_message', {
            conversationId: conversation.id,
            senderId: userId,
            senderName: 'Tu obstetra',
            preview: contenido.slice(0, 80),
          });
        }
      }
    } catch {
      /* best-effort */
    }

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
