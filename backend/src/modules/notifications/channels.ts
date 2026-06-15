/**
 * Abstracción de canales de notificación (SMS y WhatsApp).
 *
 * Las credenciales se resuelven EN TIEMPO DE ENVÍO: primero desde la
 * configuración del sistema (SystemConfig, editable por el administrador) y, si
 * no está configurada, desde variables de entorno. Si no hay credenciales
 * válidas, el canal opera en modo "mock" (solo registra en consola). Así el
 * administrador puede activar Twilio / WhatsApp Business desde la app sin
 * reiniciar el servidor ni tocar el código.
 */
import { env } from '../../config/env.js';
import { getConfigValue } from '../../utils/systemSettings.js';

export interface NotificationChannel {
  readonly name: string;
  send(to: string, message: string): Promise<void>;
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
  const res = await fetch(`https://graph.facebook.com/v21.0/${c.phoneNumberId}/messages`, {
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
  get name() {
    return 'sms';
  },
  async send(to: string, message: string): Promise<void> {
    const c = await resolveSmsCredentials();
    if (!smsConfigured(c)) {
      console.log(`[SMS MOCK] Para ${to}: ${message}`);
      return;
    }
    try {
      await sendTwilioSms(c, to, message);
    } catch (error) {
      console.error('[SMS TWILIO] Error al enviar SMS:', (error as Error).message);
    }
  },
};

export const whatsappChannel: NotificationChannel = {
  get name() {
    return 'whatsapp';
  },
  async send(to: string, message: string): Promise<void> {
    const c = await resolveWhatsAppCredentials();
    if (!whatsappConfigured(c)) {
      console.log(`[WHATSAPP MOCK] Para ${to}: ${message}`);
      return;
    }
    try {
      await sendWhatsAppCloud(c, to, message);
    } catch (error) {
      console.error('[WHATSAPP CLOUD] Error al enviar WhatsApp:', (error as Error).message);
    }
  },
};

/** Envía un mensaje por SMS y WhatsApp al número indicado. */
export async function sendSmsAndWhatsApp(phone: string, message: string): Promise<void> {
  await Promise.all([smsChannel.send(phone, message), whatsappChannel.send(phone, message)]);
}

/** Estado de configuración de cada canal (para mostrar en el panel admin). */
export async function getChannelsStatus() {
  const [sms, wa] = await Promise.all([resolveSmsCredentials(), resolveWhatsAppCredentials()]);
  return {
    sms: { provider: sms.provider, configured: smsConfigured(sms), fromNumber: sms.fromNumber || null },
    whatsapp: { provider: wa.provider, configured: whatsappConfigured(wa), phoneNumberId: wa.phoneNumberId || null },
  };
}
