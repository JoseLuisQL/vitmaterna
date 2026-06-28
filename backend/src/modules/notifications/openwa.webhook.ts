/**
 * Webhooks ENTRANTES de OpenWA (open-wa.org v0.7.7).
 *
 * Permiten recibir lo que la gestante responde por WhatsApp y volcarlo al chat
 * nativo (gestante↔obstetra), unificando ambos canales en una sola conversación.
 *
 * Seguridad y robustez (según la doc de OpenWA):
 *  - Verificación HMAC-SHA256 sobre los BYTES CRUDOS del cuerpo, en tiempo
 *    constante (header `X-OpenWA-Signature: sha256=<hex>`). Sin secreto válido,
 *    se rechaza con 401.
 *  - Entrega "at-least-once": se DEDUPLICA por `X-OpenWA-Idempotency-Key`
 *    (tabla WebhookEvent) antes de procesar.
 *  - El receptor responde 2xx solo cuando el evento queda aceptado.
 */
import crypto from 'crypto';
import { prisma } from '../../config/database.js';
import { env } from '../../config/env.js';
import { getConfigValue } from '../../utils/systemSettings.js';
import { handleInboundWhatsAppMessage } from './openwa.inbound.js';

/** Eventos que nos interesan procesar (el resto se acepta y se ignora). */
const HANDLED_EVENTS = new Set(['message.received', 'message.ack']);

export interface OpenWAWebhookPayload {
  event: string;
  timestamp?: string;
  sessionId?: string;
  idempotencyKey?: string;
  deliveryId?: string;
  data?: {
    id?: string;
    from?: string;
    to?: string;
    chatId?: string;
    body?: string;
    type?: string;
    timestamp?: number;
    fromMe?: boolean;
    isGroup?: boolean;
    author?: string;
    // message.ack: estado de entrega (numérico de WhatsApp o texto del gateway).
    ack?: number;
    status?: string;
  };
}

/**
 * Resuelve el secreto del webhook: SystemConfig (`whatsappConfig.webhookSecret`)
 * con respaldo en env `OPENWA_WEBHOOK_SECRET`. Vacío = sin secreto configurado.
 */
export async function resolveWebhookSecret(): Promise<string> {
  const cfg = (await getConfigValue('whatsappConfig').catch(() => undefined)) as
    | Record<string, unknown>
    | undefined;
  const fromCfg = typeof cfg?.webhookSecret === 'string' ? cfg.webhookSecret.trim() : '';
  return fromCfg || env.OPENWA_WEBHOOK_SECRET || '';
}

/**
 * Verifica la firma HMAC-SHA256 sobre los bytes crudos del cuerpo, en tiempo
 * constante. `signature` es el header `X-OpenWA-Signature` (`sha256=<hex>`).
 */
export function verifyOpenWASignature(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Marca un `idempotencyKey` como procesado. Devuelve `true` si es la PRIMERA vez
 * (hay que procesar el evento) o `false` si ya estaba registrado (duplicado).
 * Si no llega idempotencyKey, se procesa igual (no se puede deduplicar).
 */
export async function claimIdempotencyKey(idempotencyKey: string | undefined, event: string): Promise<boolean> {
  if (!idempotencyKey) return true;
  try {
    await prisma.webhookEvent.create({
      data: { idempotencyKey, source: 'openwa', event },
    });
    return true;
  } catch {
    // Violación de unicidad → ya procesado.
    return false;
  }
}

/**
 * Procesa un payload de webhook ya VERIFICADO y DEDUPLICADO. Best-effort: no
 * lanza (el receptor ya respondió 2xx). Enruta según el tipo de evento.
 */
export async function processOpenWAWebhook(payload: OpenWAWebhookPayload): Promise<void> {
  if (!HANDLED_EVENTS.has(payload.event)) return;
  const data = payload.data;
  if (!data) return;

  // OPORTUNIDADES #1.3: acuses de entrega/lectura (message.ack) de un mensaje
  // que ENVIAMOS. Actualiza el estado del log de entrega para auditoría real.
  if (payload.event === 'message.ack') {
    try {
      await handleAckEvent(data);
    } catch (e) {
      console.error('[OPENWA WEBHOOK] Error procesando acuse (ack):', (e as Error).message);
    }
    return;
  }

  // Ignorar mensajes salientes (los que envía el propio sistema) y los de grupo.
  if (data.fromMe === true || data.isGroup === true) return;
  // Solo texto entrante en esta fase.
  if (data.type && data.type !== 'text') return;

  const from = data.from || data.author || data.chatId;
  const body = (data.body || '').trim();
  if (!from || !body) return;

  try {
    await handleInboundWhatsAppMessage(from, body);
  } catch (e) {
    console.error('[OPENWA WEBHOOK] Error procesando mensaje entrante:', (e as Error).message);
  }
}

/** Mapea el ack de WhatsApp (numérico) o el status textual a una etiqueta legible. */
function ackLabel(data: NonNullable<OpenWAWebhookPayload['data']>): string | null {
  if (typeof data.status === 'string' && data.status) return data.status.toLowerCase();
  // Convención de WhatsApp: 1=enviado, 2=entregado, 3=leído, 4=reproducido.
  switch (data.ack) {
    case 1:
      return 'sent';
    case 2:
      return 'delivered';
    case 3:
      return 'read';
    case 4:
      return 'played';
    default:
      return null;
  }
}

/**
 * Registra el acuse (entregado/leído) en el log de entrega WhatsApp más reciente
 * del número destino. Guarda el estado en `datos.ack` del registro `entrega_whatsapp`
 * (auditoría clínica: saber si el recordatorio llegó/se leyó). Best-effort.
 */
async function handleAckEvent(data: NonNullable<OpenWAWebhookPayload['data']>): Promise<void> {
  const label = ackLabel(data);
  const toRaw = (data.to || data.chatId || '').split('@')[0].replace(/\D+/g, '');
  if (!label || !toRaw) return;

  // Últimos 9 dígitos (nacional) para casar con el `datos.to` guardado en logDelivery.
  const nat = toRaw.slice(-9);
  const recientes = await prisma.notification.findMany({
    where: { tipo: 'entrega_whatsapp', createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, datos: true },
  });
  const match = recientes.find((n) => {
    const to = (n.datos as Record<string, unknown> | null)?.to;
    return typeof to === 'string' && to.replace(/\D+/g, '').endsWith(nat);
  });
  if (!match) return;

  const datos = { ...((match.datos as Record<string, unknown> | null) ?? {}), ack: label, ackAt: new Date().toISOString() };
  await prisma.notification.update({ where: { id: match.id }, data: { datos: datos as object } });
}
