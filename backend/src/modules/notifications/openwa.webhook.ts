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
const HANDLED_EVENTS = new Set(['message.received']);

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
