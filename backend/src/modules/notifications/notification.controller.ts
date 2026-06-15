import type { Request, Response } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import { prisma } from '../../config/database.js';
import { z } from 'zod';
import { AppError, ErrorCodes } from '../../types/index.js';

const TokenSchema = z.object({
  expoPushToken: z.string().min(1, 'Expo push token is required')
});

/**
 * Lista las notificaciones in-app del usuario autenticado (más recientes primero).
 * Soporta ?soloNoLeidas=true y ?limit.
 */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const soloNoLeidas = req.query.soloNoLeidas === 'true';
  const limit = Math.min(Number(req.query.limit) || 50, 100);

  const where: { userId: string; leidaAt?: null } = { userId };
  if (soloNoLeidas) where.leidaAt = null;

  const items = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      tipo: true,
      titulo: true,
      mensaje: true,
      datos: true,
      leidaAt: true,
      createdAt: true,
    },
  });

  res.json(successResponse(items));
}

/** Devuelve el número de notificaciones no leídas (para el badge de la campana). */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const count = await prisma.notification.count({ where: { userId, leidaAt: null } });
  res.json(successResponse({ count }));
}

/** Marca una notificación como leída (solo si pertenece al usuario). */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const id = req.params.id as string;

  const notif = await prisma.notification.findUnique({ where: { id } });
  if (!notif || notif.userId !== userId) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'Notificación no encontrada');
  }

  const updated = await prisma.notification.update({
    where: { id },
    data: { leidaAt: new Date(), estado: 'leida' },
  });

  res.json(successResponse(updated));
}

/** Marca como leídas todas las notificaciones del usuario. */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  await prisma.notification.updateMany({
    where: { userId, leidaAt: null },
    data: { leidaAt: new Date(), estado: 'leida' },
  });
  res.json(successResponse({ message: 'Todas las notificaciones marcadas como leídas' }));
}

/** Elimina el Expo push token del usuario (al cerrar sesión en un dispositivo). */
export async function deleteToken(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }

  const preferences =
    typeof user.notificationPreferences === 'object' && user.notificationPreferences !== null
      ? { ...(user.notificationPreferences as object) } as Record<string, unknown>
      : {};
  delete preferences.expoPushToken;

  await prisma.user.update({
    where: { id: userId },
    data: { notificationPreferences: preferences as object },
  });

  res.json(successResponse({ message: 'Push token removed' }));
}

export async function saveToken(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  
  const parsed = TokenSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid push token data', parsed.error.errors);
  }

  const { expoPushToken } = parsed.data;

  // Retrieve current preferences
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
  }

  const preferences = typeof user.notificationPreferences === 'object' && user.notificationPreferences !== null
    ? user.notificationPreferences
    : {};

  await prisma.user.update({
    where: { id: userId },
    data: {
      notificationPreferences: {
        ...(preferences as object),
        expoPushToken
      }
    }
  });

  res.json(successResponse({ message: 'Push token saved successfully' }));
}

// ─── Configuración de canales (SMS / WhatsApp) — solo admin ────────────────────

import {
  getChannelsStatus, resolveSmsCredentials, resolveWhatsAppCredentials,
  sendTwilioSms, sendWhatsAppCloud,
} from './channels.js';
import { setConfigValue } from '../../utils/systemSettings.js';

/** Devuelve el estado de configuración de los canales (sin exponer secretos). */
export async function getChannelsConfig(_req: Request, res: Response): Promise<void> {
  const status = await getChannelsStatus();
  res.json(successResponse(status));
}

/** Guarda credenciales SMS (Twilio) en SystemConfig. */
export async function updateSmsConfig(req: Request, res: Response): Promise<void> {
  await setConfigValue('smsConfig', req.body, req.user?.userId, 'Credenciales SMS (Twilio)');
  const status = await getChannelsStatus();
  res.json(successResponse(status));
}

/** Guarda credenciales WhatsApp (Cloud API) en SystemConfig. */
export async function updateWhatsAppConfig(req: Request, res: Response): Promise<void> {
  await setConfigValue('whatsappConfig', req.body, req.user?.userId, 'Credenciales WhatsApp Cloud API');
  const status = await getChannelsStatus();
  res.json(successResponse(status));
}

/** Prueba la conexión enviando un mensaje real al destino indicado. */
export async function testChannel(req: Request, res: Response): Promise<void> {
  const { canal, destino } = req.body as { canal: 'sms' | 'whatsapp'; destino: string };
  const mensaje = 'VITMATERNA: mensaje de prueba de conexión. Si lo recibes, el canal está configurado correctamente.';
  try {
    if (canal === 'sms') {
      const c = await resolveSmsCredentials();
      if (c.provider !== 'twilio' || !c.accountSid || !c.authToken || !c.fromNumber) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Configura las credenciales de Twilio antes de probar.');
      }
      await sendTwilioSms(c, destino, mensaje);
    } else {
      const c = await resolveWhatsAppCredentials();
      if (c.provider !== 'whatsapp_cloud' || !c.apiToken || !c.phoneNumberId) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Configura las credenciales de WhatsApp antes de probar.');
      }
      await sendWhatsAppCloud(c, destino, mensaje);
    }
    res.json(successResponse({ ok: true, mensaje: 'Mensaje de prueba enviado correctamente.' }));
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(502, ErrorCodes.EXTERNAL_SERVICE_ERROR, `Falló la prueba de conexión: ${(error as Error).message}`);
  }
}
