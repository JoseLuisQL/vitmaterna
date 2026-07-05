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
  provider: 'whatsapp_cloud' | 'openwa' | 'mock';
  // WhatsApp Business Cloud API (Meta)
  apiToken?: string;
  phoneNumberId?: string;
  // OpenWA (gateway self-hosted, open-wa.org)
  baseUrl?: string;
  apiKey?: string;
  sessionId?: string;
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

/** Normaliza el provider de WhatsApp a uno de los valores soportados. */
function normalizeWhatsAppProvider(raw: string | undefined): WhatsAppCredentials['provider'] {
  if (raw === 'whatsapp_cloud') return 'whatsapp_cloud';
  if (raw === 'openwa') return 'openwa';
  return 'mock';
}

/** Quita una posible barra final de la URL base (para no duplicar '/'). */
function trimTrailingSlash(url: string | undefined): string | undefined {
  return url ? url.replace(/\/+$/, '') : url;
}

/** Resuelve credenciales WhatsApp: SystemConfig (clave 'whatsappConfig') con respaldo en env. */
export async function resolveWhatsAppCredentials(): Promise<WhatsAppCredentials> {
  const cfg = (await getConfigValue('whatsappConfig').catch(() => undefined)) as Record<string, unknown> | undefined;
  const provider = normalizeWhatsAppProvider(str(cfg?.provider) || env.WHATSAPP_PROVIDER || 'mock');
  return {
    provider,
    // Meta Cloud API
    apiToken: str(cfg?.apiToken) || env.WHATSAPP_API_TOKEN,
    phoneNumberId: str(cfg?.phoneNumberId) || env.WHATSAPP_PHONE_NUMBER_ID,
    // OpenWA (self-hosted)
    baseUrl: trimTrailingSlash(str(cfg?.baseUrl) || env.OPENWA_BASE_URL),
    apiKey: str(cfg?.apiKey) || env.OPENWA_API_KEY,
    sessionId: str(cfg?.sessionId) || env.OPENWA_SESSION_ID,
  };
}

const smsConfigured = (c: SmsCredentials) =>
  c.provider === 'twilio' && !!c.accountSid && !!c.authToken && !!c.fromNumber;
const whatsappConfigured = (c: WhatsAppCredentials) =>
  (c.provider === 'whatsapp_cloud' && !!c.apiToken && !!c.phoneNumberId) ||
  (c.provider === 'openwa' && !!c.baseUrl && !!c.apiKey && !!c.sessionId);

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
  const isProactive = message.includes('🏥') || message.includes('🚨') || message.includes('⚠️');
  let bodyPayload;

  if (isProactive) {
    bodyPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: 'vitmaterna_notification',
        language: { code: 'es' },
        components: [
          { type: 'body', parameters: [{ type: 'text', text: message.slice(0, 1024) }] }
        ]
      }
    };
  } else {
    bodyPayload = {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    };
  }

  const res = await fetch(`https://graph.facebook.com/${env.WHATSAPP_API_VERSION}/${c.phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${c.apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`WhatsApp ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * Tope de caracteres del endpoint send-text de OpenWA (v0.7.7). Se trunca de
 * forma defensiva; nuestros mensajes son cortos, pero evita un 400 por longitud.
 */
const OPENWA_TEXT_MAX = 4096;

/**
 * Envía un WhatsApp a través de un gateway OpenWA self-hosted (open-wa.org v0.7.7).
 * La sesión se direcciona por su ID (uuid), NO por su nombre. El `chatId` es el
 * número en dígitos (con código de país, sin '+') seguido de '@c.us'.
 * Lanza un Error legible si la respuesta no es 2xx (para la prueba de conexión).
 *
 * @param to número en dígitos, sin '+' (ej. "51950328511").
 */
export async function sendOpenWA(c: WhatsAppCredentials, to: string, message: string): Promise<void> {
  const url = `${c.baseUrl}/api/sessions/${encodeURIComponent(c.sessionId!)}/messages/send-text`;
  const text = message.length > OPENWA_TEXT_MAX ? message.slice(0, OPENWA_TEXT_MAX) : message;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': c.apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: `${to}@c.us`, text }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // 400 = sesión no iniciada/inexistente; 409 = engine no listo (escanea el QR);
    // 401 = API key inválida; 429 = rate limit. El detalle viene en el cuerpo NestJS.
    throw new Error(`OpenWA ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * Envía una UBICACIÓN (pin de mapa) por OpenWA. Útil para emergencias: el
 * obstetra recibe la ubicación de la gestante directamente en WhatsApp,
 * accionable desde el teléfono. Solo disponible con el proveedor `openwa`.
 *
 * @param to número en dígitos, sin '+'.
 */
export async function sendOpenWALocation(
  c: WhatsAppCredentials,
  to: string,
  latitude: number,
  longitude: number,
  description?: string,
): Promise<void> {
  const url = `${c.baseUrl}/api/sessions/${encodeURIComponent(c.sessionId!)}/messages/send-location`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': c.apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${to}@c.us`,
      latitude,
      longitude,
      ...(description ? { description: description.slice(0, 200) } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenWA location ${res.status}: ${detail.slice(0, 200)}`);
  }
}

/**
 * Envía una IMAGEN por OpenWA usando su URL pública (send-image). Útil para que
 * una foto del chat llegue a la gestante por WhatsApp cuando está offline.
 * `imageUrl` debe ser http(s) accesible por el gateway. Lanza si no es 2xx.
 *
 * @param to número en dígitos, sin '+'.
 */
export async function sendOpenWAImage(
  c: WhatsAppCredentials,
  to: string,
  imageUrl: string,
  caption?: string,
): Promise<void> {
  const url = `${c.baseUrl}/api/sessions/${encodeURIComponent(c.sessionId!)}/messages/send-image`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'X-API-Key': c.apiKey!, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chatId: `${to}@c.us`,
      url: imageUrl,
      ...(caption ? { caption: caption.slice(0, 1024) } : {}),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenWA image ${res.status}: ${detail.slice(0, 200)}`);
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
    // Ambos proveedores esperan el número SIN el "+" inicial.
    const digits = e164.replace(/^\+/, '');
    try {
      if (c.provider === 'openwa') {
        await sendOpenWA(c, digits, message);
      } else {
        await sendWhatsAppCloud(c, digits, message);
      }
      return { channel: 'whatsapp', to: e164, status: 'sent' };
    } catch (error) {
      const msg = (error as Error).message;
      const label = c.provider === 'openwa' ? 'WHATSAPP OPENWA' : 'WHATSAPP CLOUD';
      console.error(`[${label}] Error al enviar WhatsApp:`, msg);
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
 * Envía un mensaje de pago al número indicado.
 *
 * CONTROL DE GASTO: ya NO envía por ambos canales a la vez. Delega en
 * `sendPaidNotification`, que usa un solo canal (WhatsApp primero, SMS de
 * respaldo) y respeta el kill-switch global `paidChannelsEnabled`. Se mantiene
 * el nombre por compatibilidad con la cola (`queue.ts`) y llamadas existentes.
 *
 * @param userId  si se indica, cada envío real/fallido se registra en el log de
 *                entregas (auditoría). Para destinatarios sin cuenta (acompañante)
 *                puede omitirse.
 * @returns los resultados de los intentos realizados.
 */
export async function sendSmsAndWhatsApp(
  phone: string,
  message: string,
  prefs?: { sms?: boolean; whatsapp?: boolean } | null,
  userId?: string | null,
): Promise<DeliveryResult[]> {
  return sendPaidNotification(phone, message, prefs, userId);
}

/**
 * Registra (o reutiliza) en OpenWA un webhook que apunta a nuestro endpoint
 * público para recibir los mensajes entrantes de la gestante. Idempotente: si ya
 * existe un webhook con la misma URL, no crea otro. Requiere proveedor `openwa`
 * configurado y un `webhookUrl` público accesible por OpenWA.
 *
 * @returns el id del webhook en OpenWA.
 */
export async function registerOpenWAWebhook(webhookUrl: string, secret: string): Promise<string> {
  const c = await resolveWhatsAppCredentials();
  if (c.provider !== 'openwa' || !c.baseUrl || !c.apiKey || !c.sessionId) {
    throw new Error('OpenWA no está configurado como proveedor de WhatsApp.');
  }
  const base = `${c.baseUrl}/api/sessions/${encodeURIComponent(c.sessionId)}/webhooks`;
  const headers = { 'X-API-Key': c.apiKey, 'Content-Type': 'application/json' };

  // ¿Ya existe uno con esa URL? (idempotencia)
  const listRes = await fetch(base, { headers });
  if (listRes.ok) {
    const existing = (await listRes.json().catch(() => [])) as Array<{ id: string; url: string }>;
    const found = Array.isArray(existing) ? existing.find((w) => w.url === webhookUrl) : undefined;
    if (found) return found.id;
  }

  const res = await fetch(base, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      // message.received → chat unificado / comandos; message.ack → acuses (#1.3).
      url: webhookUrl,
      events: ['message.received', 'message.ack'],
      secret,
      retryCount: 3,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`OpenWA webhook ${res.status}: ${detail.slice(0, 200)}`);
  }
  const created = (await res.json()) as { id: string };
  return created.id;
}

/** Estado de configuración de cada canal (para mostrar en el panel admin). */
export async function getChannelsStatus() {
  const { resolveWebhookSecret } = await import('./openwa.webhook.js');
  const [sms, wa, paidEnabled, webhookSecret] = await Promise.all([
    resolveSmsCredentials(),
    resolveWhatsAppCredentials(),
    arePaidChannelsEnabled(),
    resolveWebhookSecret(),
  ]);
  return {
    sms: { provider: sms.provider, configured: smsConfigured(sms), fromNumber: sms.fromNumber || null },
    whatsapp: {
      provider: wa.provider,
      configured: whatsappConfigured(wa),
      // Datos públicos (NO secretos): la apiKey/apiToken nunca se exponen.
      phoneNumberId: wa.phoneNumberId || null,
      baseUrl: wa.baseUrl || null,
      sessionId: wa.sessionId || null,
      // Indica solo SI hay secreto de webhook configurado (no lo expone).
      webhookConfigured: !!webhookSecret,
    },
    paidEnabled,
  };
}

// ─── Control de gasto (kill-switch + envío de canal único) ───────────────────────

/**
 * Kill-switch global de los canales de PAGO (SMS y WhatsApp). Controlado por el
 * admin desde SystemConfig (clave `paidChannelsEnabled`). Por defecto ACTIVADO
 * (true) para no romper instalaciones existentes; ponerlo en `false` apaga al
 * instante TODO envío que cueste créditos, sin tocar push ni in-app.
 */
export async function arePaidChannelsEnabled(): Promise<boolean> {
  const v = await getConfigValue('paidChannelsEnabled').catch(() => undefined);
  // Solo se considera apagado si está explícitamente en false.
  return v !== false;
}

/**
 * Envía UNA sola notificación de pago por el canal más barato disponible:
 * WhatsApp primero y, si no está configurado o falla, SMS como respaldo.
 * Nunca envía por ambos canales a la vez (control de gasto).
 *
 * Respeta:
 *  - el kill-switch global `paidChannelsEnabled`;
 *  - las preferencias de canal del usuario (`prefs.sms` / `prefs.whatsapp`):
 *    un canal desactivado en preferencias no se usa.
 *
 * Devuelve los resultados de los intentos realizados (puede ser vacío si todo
 * está apagado). Cada intento real/fallido queda en el log de entregas.
 */
export async function sendPaidNotification(
  phone: string,
  message: string,
  prefs?: { sms?: boolean; whatsapp?: boolean } | null,
  userId?: string | null,
): Promise<DeliveryResult[]> {
  if (!(await arePaidChannelsEnabled())) {
    console.log('[PAID OFF] Envío SMS/WhatsApp omitido (canales de pago desactivados por el admin).');
    return [];
  }

  const whatsappAllowed = prefs?.whatsapp !== false;
  const smsAllowed = prefs?.sms !== false;
  const results: DeliveryResult[] = [];

  // 1) WhatsApp primero (más barato), si está permitido y configurado.
  if (whatsappAllowed && whatsappConfigured(await resolveWhatsAppCredentials())) {
    const wa = await whatsappChannel.send(phone, message);
    results.push(wa);
    await logDelivery(userId ?? null, wa, message);
    if (wa.status === 'sent') return results; // entregado: no usar SMS.
  }

  // 2) SMS como respaldo, si está permitido y configurado.
  if (smsAllowed && smsConfigured(await resolveSmsCredentials())) {
    const sms = await smsChannel.send(phone, message);
    results.push(sms);
    await logDelivery(userId ?? null, sms, message);
    return results;
  }

  // 3) Nada configurado: registrar en consola (mock) para trazabilidad en dev.
  if (results.length === 0) {
    console.log(`[PAID MOCK] (sin canal de pago configurado) Para ${phone}: ${message}`);
  }
  return results;
}

// ─── Avisos clínicos por WhatsApp (respaldo del push, por userId) ─────────────────

/**
 * Envía un aviso clínico por WhatsApp/SMS a un USUARIO (resuelto por su id):
 * lee su teléfono y sus preferencias de canal, respeta el kill-switch global y
 * delega en `sendPaidNotification` (canal único WhatsApp→SMS, con cola y log).
 *
 * Pensado como RESPALDO del push para eventos críticos (emergencia, signo de
 * alarma grave): si el push falla (token caducado), el mensaje igual llega por
 * WhatsApp. Best-effort: nunca lanza, no bloquea el flujo que lo invoca.
 */
export async function notifyUserViaWhatsApp(userId: string, message: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { phone: true, notificationPreferences: true },
    });
    if (!user?.phone) return;
    const prefs = (user.notificationPreferences ?? null) as { sms?: boolean; whatsapp?: boolean } | null;
    await sendPaidNotification(user.phone, message, prefs, userId);
  } catch (e) {
    console.error('[NOTIFY WHATSAPP] No se pudo enviar el aviso por WhatsApp:', (e as Error).message);
  }
}

/**
 * Como `notifyUserViaWhatsApp`, pero además envía un PIN DE UBICACIÓN cuando el
 * proveedor activo es OpenWA (la Cloud API de Meta no expone ubicación por este
 * camino; en ese caso el enlace de mapa ya viaja dentro del texto). Best-effort.
 *
 * Se usa en el botón de auxilio: el obstetra recibe en WhatsApp el aviso y la
 * ubicación de la gestante, accionable desde su teléfono.
 */
export async function notifyUserViaWhatsAppWithLocation(
  userId: string,
  message: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  await notifyUserViaWhatsApp(userId, message);
  // El pin de ubicación es un extra solo en OpenWA y solo si el canal de pago
  // está activo y el destinatario tiene teléfono. No bloquea ni revierte el texto.
  try {
    if (!(await arePaidChannelsEnabled())) return;
    const c = await resolveWhatsAppCredentials();
    if (c.provider !== 'openwa' || !whatsappConfigured(c)) return;
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } });
    const e164 = toE164PE(user?.phone);
    if (!e164) return;
    await sendOpenWALocation(c, e164.replace(/^\+/, ''), latitude, longitude, 'Ubicación de la gestante');
  } catch (e) {
    console.error('[NOTIFY WHATSAPP LOC] No se pudo enviar la ubicación por WhatsApp:', (e as Error).message);
  }
}

/** Construye una URL absoluta y pública para un archivo de /uploads (o null). */
export function publicMediaUrl(relativeOrAbsolute: string | null | undefined): string | null {
  if (!relativeOrAbsolute) return null;
  if (/^https?:\/\//i.test(relativeOrAbsolute)) return relativeOrAbsolute;
  const base = trimTrailingSlash(env.PUBLIC_BASE_URL);
  if (!base) return null; // sin URL pública no se puede enviar el medio por WhatsApp
  return `${base}${relativeOrAbsolute.startsWith('/') ? '' : '/'}${relativeOrAbsolute}`;
}

/**
 * PUENTE DE CHAT → WHATSAPP (OPORTUNIDADES #1.2): reenvía a un usuario, por
 * WhatsApp, un mensaje de chat que NO pudo ver en tiempo real (está offline).
 * Pensado para que un mensaje del obstetra llegue a la gestante aunque no abra
 * la app. Best-effort: nunca lanza ni bloquea el flujo de chat.
 *
 * - Respeta el kill-switch de pago y las preferencias del usuario (vía
 *   `notifyUserViaWhatsApp` / `sendPaidNotification`).
 * - Si es una imagen y hay `PUBLIC_BASE_URL` + proveedor OpenWA, la envía como
 *   imagen (send-image) con caption; si no, manda un texto avisando de la foto.
 */
export async function deliverChatViaWhatsApp(
  userId: string,
  opts: { senderName?: string; text?: string; tipo?: string; mediaUrl?: string | null },
): Promise<void> {
  try {
    const { waChatForward, waChatImageForward } = await import('../../utils/whatsappMessages.js');
    const prefix = waChatForward(opts.senderName ?? 'VitMaterna');

    if (opts.tipo === 'imagen' && opts.mediaUrl) {
      const c = await resolveWhatsAppCredentials();
      const imageUrl = publicMediaUrl(opts.mediaUrl);
      if (c.provider === 'openwa' && whatsappConfigured(c) && imageUrl && (await arePaidChannelsEnabled())) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { phone: true, notificationPreferences: true } });
        const prefs = (user?.notificationPreferences ?? null) as { whatsapp?: boolean } | null;
        const e164 = toE164PE(user?.phone);
        if (e164 && prefs?.whatsapp !== false) {
          const caption = waChatImageForward(opts.senderName ?? 'VitMaterna', opts.text);
          await sendOpenWAImage(c, e164.replace(/^\+/, ''), imageUrl, caption);
          return;
        }
      }
      // Respaldo: aviso de texto (sin URL cruda) por el canal de pago habitual.
      const fallback = waChatImageForward(opts.senderName ?? 'VitMaterna', opts.text);
      await notifyUserViaWhatsApp(userId, fallback);
      return;
    }

    const text = (opts.text || '').trim();
    if (!text) return;
    await notifyUserViaWhatsApp(userId, `${prefix}\n${text}`);
  } catch (e) {
    console.error('[CHAT→WHATSAPP] No se pudo reenviar el mensaje por WhatsApp:', (e as Error).message);
  }
}
