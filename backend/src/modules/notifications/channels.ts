/**
 * Abstracción de canales de notificación (SMS y WhatsApp).
 *
 * Las credenciales se resuelven EN TIEMPO DE ENVÍO: primero desde la
 * configuración del sistema (SystemConfig, editable por el administrador) y, si
 * no está configurada, desde variables de entorno. Si no hay credenciales
 * válidas, el canal opera en modo "mock" (solo registra en consola). Así el
 * administrador puede activar Twilio / WhatsApp Business desde la app sin
 * reiniciar el servidor ni tocar el código.
 *
 * Todos los envíos:
 *  - normalizan el número a E.164 (Perú) antes de llamar al proveedor;
 *  - devuelven un resultado tipado (`DeliveryResult`) en vez de "tragar" errores;
 *  - quedan registrados como log de entrega en la tabla Notification (auditoría).
 */
import { env } from '../../config/env.js';
import { getConfigValue } from '../../utils/systemSettings.js';
import { toE164PE } from '../../utils/phone.js';
import { prisma } from '../../config/database.js';

export type DeliveryStatus = 'sent' | 'failed' | 'mock' | 'invalid';

export interface DeliveryResult {
  channel: 'sms' | 'whatsapp';
  to: string;
  status: DeliveryStatus;
  error?: string;
}

export interface NotificationChannel {
  readonly name: 'sms' | 'whatsapp';
  send(to: string, message: string): Promise<DeliveryResult>;
}

export interface SmsCredentials {
  provider: 'twilio' | 'mock';
  accountSid?: string;
  authToken?: string;
  fromNumber?: string;
}

export interface WhatsAppCredentials {
  provider: 'whatsapp_cloud' | 'mock';
  apiToken?: string;
  phoneNumberId?: string;
}

const str = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length > 0 ? t : undefined;
};

/** Resuelve credenciales SMS: SystemConfig (clave 'smsConfig') con respaldo en env. */
export async function resolveSmsCredentials(): Promise<SmsCredentials> {
  const cfg = (await getConfigValue('smsConfig').catch(() => undefined)) as Record<string, unknown> | undefined;
  const provider = (str(cfg?.provider) || env.SMS_PROVIDER || 'mock') as SmsCredentials['provider'];
  return {
    provider: provider === 'twilio' ? 'twilio' : 'mock',
    accountSid: str(cfg?.accountSid) || env.TWILIO_ACCOUNT_SID,
    authToken: str(cfg?.authToken) || env.TWILIO_AUTH_TOKEN,
    fromNumber: str(cfg?.fromNumber) || env.TWILIO_PHONE_NUMBER,
  };
}

/** Resuelve credenciales WhatsApp: SystemConfig (clave 'whatsappConfig') con respaldo en env. */
export async function resolveWhatsAppCredentials(): Promise<WhatsAppCredentials> {
  const cfg = (await getConfigValue('whatsappConfig').catch(() => undefined)) as Record<string, unknown> | undefined;
  const provider = (str(cfg?.provider) || env.WHATSAPP_PROVIDER || 'mock') as WhatsAppCredentials['provider'];
  return {
    provider: provider === 'whatsapp_cloud' ? 'whatsapp_cloud' : 'mock',
    apiToken: str(cfg?.apiToken) || env.WHATSAPP_API_TOKEN,
    phoneNumberId: str(cfg?.phoneNumberId) || env.WHATSAPP_PHONE_NUMBER_ID,
  };
}

const smsConfigured = (c: SmsCredentials) =>
  c.provider === 'twilio' && !!c.accountSid && !!c.authToken && !!c.fromNumber;
const whatsappConfigured = (c: WhatsAppCredentials) =>
  c.provider === 'whatsapp_cloud' && !!c.apiToken && !!c.phoneNumberId;

// ─── Envío real ────────────────────────────────────────────────────────────────

/** Envía un SMS con Twilio. Lanza si la respuesta no es ok (para pruebas de conexión). */
export async function sendTwilioSms(c: SmsCredentials, to: string, message: string): Promise<void> {
  const auth = Buffer.from(`${c.accountSid}:${c.authToken}`).toString('base64');
  const body = new URLSearchParams({ To: to, From: c.fromNumber!, Body: message });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Messages.json`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Twilio ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/** Envía un WhatsApp con la Cloud API. Lanza si la respuesta no es ok. */
export async function sendWhatsAppCloud(c: WhatsAppCredentials, to: string, message: string): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${c.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: message } }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp ${res.status}: ${detail.slice(0, 200)}`);
  }
}

// ─── Canales (resuelven credenciales en cada envío) ──────────────────────────────

export const smsChannel: NotificationChannel = {
  name: 'sms',
  async send(to: string, message: string): Promise<DeliveryResult> {
    const e164 = toE164PE(to);
    if (!e164) {
      console.warn(`[SMS] Número inválido (no E.164): "${to}". Envío omitido.`);
      return { channel: 'sms', to, status: 'invalid', error: 'Número de teléfono inválido' };
    }
    const c = await resolveSmsCredentials();
    if (!smsConfigured(c)) {
      console.log(`[SMS MOCK] Para ${e164}: ${message}`);
      return { channel: 'sms', to: e164, status: 'mock' };
    }
    try {
      await sendTwilioSms(c, e164, message);
      return { channel: 'sms', to: e164, status: 'sent' };
    } catch (error) {
      const msg = (error as Error).message;
      console.error('[SMS TWILIO] Error al enviar SMS:', msg);
      return { channel: 'sms', to: e164, status: 'failed', error: msg };
    }
  },
};

export const whatsappChannel: NotificationChannel = {
  name: 'whatsapp',
  async send(to: string, message: string): Promise<DeliveryResult> {
    const e164 = toE164PE(to);
    if (!e164) {
      console.warn(`[WHATSAPP] Número inválido (no E.164): "${to}". Envío omitido.`);
      return { channel: 'whatsapp', to, status: 'invalid', error: 'Número de teléfono inválido' };
    }
    const c = await resolveWhatsAppCredentials();
    if (!whatsappConfigured(c)) {
      console.log(`[WHATSAPP MOCK] Para ${e164}: ${message}`);
      return { channel: 'whatsapp', to: e164, status: 'mock' };
    }
    try {
      // La Cloud API espera el número SIN el "+" inicial.
      await sendWhatsAppCloud(c, e164.replace(/^\+/, ''), message);
      return { channel: 'whatsapp', to: e164, status: 'sent' };
    } catch (error) {
      const msg = (error as Error).message;
      console.error('[WHATSAPP CLOUD] Error al enviar WhatsApp:', msg);
      return { channel: 'whatsapp', to: e164, status: 'failed', error: msg };
    }
  },
};

// ─── Log de entregas (auditoría) ────────────────────────────────────────────────

/**
 * Persiste el resultado de un envío SMS/WhatsApp como registro técnico en la
 * tabla Notification (tipo `entrega_sms` / `entrega_whatsapp`). Estos registros
 * NO se muestran en la bandeja in-app del usuario (ver listNotifications), sirven
 * como log de entregas consultable para auditoría. Best-effort: nunca lanza.
 */
export async function logDelivery(userId: string | null, result: DeliveryResult, mensaje: string): Promise<void> {
  if (!userId) return; // sin usuario asociado (p. ej. acompañante) no se persiste
  // Solo registramos intentos reales o fallidos; el modo mock no ensucia la BD.
  if (result.status === 'mock') return;
  try {
    const estado = result.status === 'sent' ? 'enviada' : 'fallida';
    await prisma.notification.create({
      data: {
        userId,
        tipo: result.channel === 'sms' ? 'entrega_sms' : 'entrega_whatsapp',
        canal: result.channel,
        titulo: result.channel === 'sms' ? 'SMS' : 'WhatsApp',
        mensaje,
        datos: { to: result.to } as object,
        estado,
        enviadaAt: result.status === 'sent' ? new Date() : null,
        errorDetalle: result.error ?? null,
        // Se marca como leída para que no infle el badge de no leídas del usuario.
        leidaAt: new Date(),
      },
    });
  } catch (e) {
    console.error('[DELIVERY LOG] No se pudo registrar la entrega:', (e as Error).message);
  }
}

/**
 * Envía un mensaje por SMS y WhatsApp al número indicado, respetando las
 * preferencias de canal del usuario (si se proporcionan). Por defecto (sin
 * `prefs`) envía por ambos canales para mantener compatibilidad.
 *
 * @param userId  si se indica, cada envío real/fallido se registra en el log de
 *                entregas (auditoría). Para destinatarios sin cuenta (acompañante)
 *                puede omitirse.
 * @returns los resultados de cada canal intentado.
 */
export async function sendSmsAndWhatsApp(
  phone: string,
  message: string,
  prefs?: { sms?: boolean; whatsapp?: boolean } | null,
  userId?: string | null,
): Promise<DeliveryResult[]> {
  const smsEnabled = prefs?.sms !== false;
  const whatsappEnabled = prefs?.whatsapp !== false;
  const tasks: Promise<DeliveryResult>[] = [];
  if (smsEnabled) tasks.push(smsChannel.send(phone, message));
  if (whatsappEnabled) tasks.push(whatsappChannel.send(phone, message));
  const results = await Promise.all(tasks);
  // Registrar entregas (no bloquea el flujo principal).
  await Promise.all(results.map((r) => logDelivery(userId ?? null, r, message)));
  return results;
}

/** Estado de configuración de cada canal (para mostrar en el panel admin). */
export async function getChannelsStatus() {
  const [sms, wa] = await Promise.all([resolveSmsCredentials(), resolveWhatsAppCredentials()]);
  return {
    sms: { provider: sms.provider, configured: smsConfigured(sms), fromNumber: sms.fromNumber || null },
    whatsapp: { provider: wa.provider, configured: whatsappConfigured(wa), phoneNumberId: wa.phoneNumberId || null },
  };
}
