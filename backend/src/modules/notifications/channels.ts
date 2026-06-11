/**
 * Abstracción de canales de notificación (SMS y WhatsApp).
 *
 * Cada canal se selecciona por variables de entorno. Si no hay credenciales
 * configuradas, el canal opera en modo "mock" (solo registra en consola), de
 * modo que el sistema funciona en desarrollo sin servicios externos y queda
 * listo para activar Twilio / WhatsApp Business en producción sin cambiar el
 * código que envía los mensajes.
 */
import { env } from '../../config/env.js';

export interface NotificationChannel {
  readonly name: string;
  send(to: string, message: string): Promise<void>;
}

// ─── SMS ──────────────────────────────────────────────────────────────────────

class MockSmsChannel implements NotificationChannel {
  readonly name = 'sms:mock';
  async send(to: string, message: string): Promise<void> {
    console.log(`[SMS MOCK] Para ${to}: ${message}`);
  }
}

class TwilioSmsChannel implements NotificationChannel {
  readonly name = 'sms:twilio';
  async send(to: string, message: string): Promise<void> {
    const sid = env.TWILIO_ACCOUNT_SID;
    const token = env.TWILIO_AUTH_TOKEN;
    const from = env.TWILIO_PHONE_NUMBER;
    try {
      const auth = Buffer.from(`${sid}:${token}`).toString('base64');
      const body = new URLSearchParams({ To: to, From: from, Body: message });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });
      if (!res.ok) {
        console.error(`[SMS TWILIO] Error ${res.status} al enviar a ${to}`);
      }
    } catch (error) {
      console.error('[SMS TWILIO] Excepción al enviar SMS', error);
    }
  }
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

class MockWhatsAppChannel implements NotificationChannel {
  readonly name = 'whatsapp:mock';
  async send(to: string, message: string): Promise<void> {
    console.log(`[WHATSAPP MOCK] Para ${to}: ${message}`);
  }
}

class WhatsAppCloudChannel implements NotificationChannel {
  readonly name = 'whatsapp:cloud';
  async send(to: string, message: string): Promise<void> {
    const token = env.WHATSAPP_API_TOKEN;
    const phoneId = env.WHATSAPP_PHONE_NUMBER_ID;
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message },
        }),
      });
      if (!res.ok) {
        console.error(`[WHATSAPP CLOUD] Error ${res.status} al enviar a ${to}`);
      }
    } catch (error) {
      console.error('[WHATSAPP CLOUD] Excepción al enviar WhatsApp', error);
    }
  }
}

// ─── Selección por entorno ────────────────────────────────────────────────────

function buildSmsChannel(): NotificationChannel {
  const credenciales = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER;
  if (env.SMS_PROVIDER === 'twilio' && credenciales) {
    return new TwilioSmsChannel();
  }
  return new MockSmsChannel();
}

function buildWhatsAppChannel(): NotificationChannel {
  const credenciales = env.WHATSAPP_API_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID;
  if (env.WHATSAPP_PROVIDER === 'whatsapp_cloud' && credenciales) {
    return new WhatsAppCloudChannel();
  }
  return new MockWhatsAppChannel();
}

export const smsChannel: NotificationChannel = buildSmsChannel();
export const whatsappChannel: NotificationChannel = buildWhatsAppChannel();

/** Envía un mensaje por SMS y WhatsApp al número indicado. */
export async function sendSmsAndWhatsApp(phone: string, message: string): Promise<void> {
  await Promise.all([
    smsChannel.send(phone, message),
    whatsappChannel.send(phone, message),
  ]);
}
