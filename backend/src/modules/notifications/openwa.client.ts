/**
 * Cliente fino sobre la API REST de un gateway OpenWA self-hosted (open-wa.org
 * v0.7.7). Encapsula en UN solo punto las llamadas que necesita el panel de
 * gestión del admin (estado de la sesión, QR/reconexión, historial saliente),
 * resolviendo las credenciales con `resolveWhatsAppCredentials()` (SystemConfig
 * con respaldo en env). Mantiene el enfoque de `channels.ts`: `fetch` nativo,
 * cero dependencias nuevas, errores legibles.
 *
 * La API key (bearer-equivalente) vive solo en el backend: el panel del admin
 * habla con NUESTRO backend (JWT admin) y nunca recibe la key.
 *
 * Endpoints verificados en vivo contra https://openwa.qware.me:
 *   GET  /api/sessions/{id}                 → estado de la sesión
 *   GET  /api/sessions/{id}/qr              → QR (400 si ya está autenticada)
 *   POST /api/sessions/{id}/start           → inicia/reconecta la sesión
 *   POST /api/sessions/{id}/stop            → detiene la sesión
 *   GET  /api/sessions/{id}/messages?limit  → historial de mensajes
 */
import { resolveWhatsAppCredentials, type WhatsAppCredentials } from './channels.js';

export class OpenWANotConfiguredError extends Error {
  constructor() {
    super('OpenWA no está configurado como proveedor de WhatsApp.');
    this.name = 'OpenWANotConfiguredError';
  }
}

/** Estado de la sesión OpenWA, mapeado a un JSON propio (sin secretos). */
export interface OpenWASessionStatus {
  id: string;
  name: string | null;
  status: string; // ready | disconnected | initializing | failed | …
  phone: string | null;
  pushName: string | null;
  connectedAt: string | null;
  lastActive: string | null;
  lastError: string | null;
}

export interface OpenWAMessageItem {
  id: string;
  body: string;
  from: string | null;
  to: string | null;
  type: string | null;
  direction: 'incoming' | 'outgoing' | string | null;
  status: string | null; // sent | delivered | read | failed | …
  timestamp: number | null;
  createdAt: string | null;
}

/** QR para re-vincular: data-URL PNG y/o código de vinculación de 8 dígitos. */
export interface OpenWAQrResult {
  needsQr: boolean;
  qr: string | null; // data-URL o string del QR (para <img> / render)
  pairingCode: string | null;
  message: string | null; // p. ej. "ya autenticada, no se necesita QR"
}

/** Credenciales OpenWA listas (lanza si el proveedor no es openwa o falta algo). */
async function requireOpenWA(): Promise<Required<Pick<WhatsAppCredentials, 'baseUrl' | 'apiKey' | 'sessionId'>>> {
  const c = await resolveWhatsAppCredentials();
  if (c.provider !== 'openwa' || !c.baseUrl || !c.apiKey || !c.sessionId) {
    throw new OpenWANotConfiguredError();
  }
  return { baseUrl: c.baseUrl, apiKey: c.apiKey, sessionId: c.sessionId };
}

/** Hace una petición a la API de OpenWA con timeout y la X-API-Key. */
async function owaFetch(
  baseUrl: string,
  apiKey: string,
  path: string,
  init?: { method?: string; body?: unknown },
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${baseUrl}/api${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        'X-API-Key': apiKey,
        ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });
    const text = await res.text().catch(() => '');
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { ok: res.ok, status: res.status, json, text };
  } finally {
    clearTimeout(timeout);
  }
}

const asObj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const asStr = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const asNum = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** Estado actual de la sesión OpenWA (sin exponer credenciales). */
export async function getSessionStatus(): Promise<OpenWASessionStatus> {
  const { baseUrl, apiKey, sessionId } = await requireOpenWA();
  const r = await owaFetch(baseUrl, apiKey, `/sessions/${encodeURIComponent(sessionId)}`);
  if (!r.ok) {
    throw new Error(`OpenWA estado ${r.status}: ${r.text.slice(0, 200)}`);
  }
  const o = asObj(r.json);
  return {
    id: asStr(o.id) ?? sessionId,
    name: asStr(o.name),
    status: asStr(o.status) ?? 'unknown',
    phone: asStr(o.phone),
    pushName: asStr(o.pushName),
    connectedAt: asStr(o.connectedAt),
    lastActive: asStr(o.lastActive),
    lastError: asStr(o.lastError),
  };
}

/**
 * Inicia/reconecta la sesión y devuelve el QR si hace falta vincular. Si la
 * sesión ya está autenticada, OpenWA responde 400 a /qr con un mensaje claro
 * (lo reflejamos como `needsQr:false`).
 */
export async function connectSession(): Promise<OpenWAQrResult> {
  const { baseUrl, apiKey, sessionId } = await requireOpenWA();
  // start es idempotente: si ya está corriendo, devuelve el estado actual.
  await owaFetch(baseUrl, apiKey, `/sessions/${encodeURIComponent(sessionId)}/start`, { method: 'POST' });
  const qr = await owaFetch(baseUrl, apiKey, `/sessions/${encodeURIComponent(sessionId)}/qr`);
  if (qr.ok) {
    const o = asObj(qr.json);
    const qrValue = asStr(o.qr) ?? asStr(o.qrCode) ?? asStr(o.dataUrl) ?? (typeof qr.json === 'string' ? (qr.json as string) : null);
    return {
      needsQr: !!qrValue,
      qr: qrValue,
      pairingCode: asStr(o.pairingCode) ?? asStr(o.code),
      message: asStr(o.message),
    };
  }
  // 400 típico: "Session is already authenticated, no QR code needed".
  const o = asObj(qr.json);
  return { needsQr: false, qr: null, pairingCode: null, message: asStr(o.message) ?? 'La sesión ya está autenticada.' };
}

/** Detiene (desvincula) la sesión OpenWA. */
export async function disconnectSession(): Promise<void> {
  const { baseUrl, apiKey, sessionId } = await requireOpenWA();
  const r = await owaFetch(baseUrl, apiKey, `/sessions/${encodeURIComponent(sessionId)}/stop`, { method: 'POST' });
  if (!r.ok) {
    throw new Error(`OpenWA stop ${r.status}: ${r.text.slice(0, 200)}`);
  }
}

/** Historial de mensajes de la sesión (más recientes primero), normalizado. */
export async function listMessages(limit = 20): Promise<OpenWAMessageItem[]> {
  const { baseUrl, apiKey, sessionId } = await requireOpenWA();
  const safe = Math.min(Math.max(1, limit), 100);
  const r = await owaFetch(baseUrl, apiKey, `/sessions/${encodeURIComponent(sessionId)}/messages?limit=${safe}`);
  if (!r.ok) {
    throw new Error(`OpenWA mensajes ${r.status}: ${r.text.slice(0, 200)}`);
  }
  const payload = asObj(r.json);
  const raw = Array.isArray(payload.messages)
    ? (payload.messages as unknown[])
    : Array.isArray(r.json)
      ? (r.json as unknown[])
      : [];
  return raw.map((m): OpenWAMessageItem => {
    const o = asObj(m);
    return {
      id: asStr(o.id) ?? asStr(o.waMessageId) ?? '',
      body: asStr(o.body) ?? '',
      from: asStr(o.from),
      to: asStr(o.to),
      type: asStr(o.type),
      direction: asStr(o.direction),
      status: asStr(o.status),
      timestamp: asNum(o.timestamp),
      createdAt: asStr(o.createdAt),
    };
  });
}
