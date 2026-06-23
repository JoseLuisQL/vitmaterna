/**
 * VITMATERNA — Outbox: cola de escrituras offline.
 *
 * Registra operaciones de escritura (consumo de suplemento, signo de alarma)
 * cuando no hay red y las reenvía al reconectar, de forma:
 *  - Persistente: SQLite en nativo, localStorage en web.
 *  - Idempotente: cada op lleva `dedupeKey`; no se encola dos veces y el
 *    backend ignora duplicados.
 *  - Robusta: reintentos con backoff; los errores 4xx (op inválida) se
 *    descartan, los de red/5xx se reintentan.
 *
 * La UI usa `enqueue()` desde las mutaciones cuando `isOnline()` es false, y
 * `flush()` se dispara solo al reconectar / volver a foreground.
 */
import { AppState, Platform } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import api from './api';
import { getDb } from '../database/index';
import { onlineManager } from '@tanstack/react-query';
import { subscribeOnline } from './network';

export type OutboxType = 'supplement_log' | 'danger_sign';

export interface OutboxOp {
  id: string;
  type: OutboxType;
  endpoint: string;
  method: 'POST' | 'PATCH' | 'PUT';
  payload: Record<string, unknown>;
  dedupeKey: string;
  createdAt: number;
  attempts: number;
  /** Queries a invalidar tras enviar con éxito. */
  invalidate?: string[][];
}

const WEB_KEY = 'vitmaterna_outbox';
const MAX_ATTEMPTS = 8;

let _queryClient: QueryClient | null = null;
let flushing = false;
const changeListeners = new Set<() => void>();

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Persistencia (SQLite nativo / localStorage web) ──────────────────────────

function webRead(): OutboxOp[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(WEB_KEY) || '[]') as OutboxOp[];
  } catch {
    return [];
  }
}
function webWrite(ops: OutboxOp[]): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(WEB_KEY, JSON.stringify(ops));
}

/** Devuelve todas las operaciones pendientes (FIFO por createdAt). */
export function getPending(): OutboxOp[] {
  if (Platform.OS === 'web') {
    return webRead().sort((a, b) => a.createdAt - b.createdAt);
  }
  const db = getDb();
  if (!db) return webRead().sort((a, b) => a.createdAt - b.createdAt);
  try {
    const rows = db.getAllSync(
      "SELECT * FROM outbox WHERE status = 'pending' ORDER BY created_at ASC",
    ) as any[];
    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      endpoint: r.endpoint,
      method: r.method,
      payload: JSON.parse(r.payload),
      dedupeKey: r.dedupe_key,
      createdAt: r.created_at,
      attempts: r.attempts,
      // invalidate viaja dentro del payload (__invalidate); normalize() lo saca.
    }));
  } catch {
    return [];
  }
}

export function pendingCount(): number {
  return getPending().length;
}

function existsByDedupe(dedupeKey: string): boolean {
  return getPending().some((o) => o.dedupeKey === dedupeKey);
}

function insert(op: OutboxOp): void {
  if (Platform.OS === 'web') {
    const ops = webRead();
    if (ops.some((o) => o.dedupeKey === op.dedupeKey)) return;
    ops.push(op);
    webWrite(ops);
    return;
  }
  const db = getDb();
  if (!db) {
    const ops = webRead();
    if (!ops.some((o) => o.dedupeKey === op.dedupeKey)) {
      ops.push(op);
      webWrite(ops);
    }
    return;
  }
  try {
    // El esquema no tiene columna `invalidate`; se guarda dentro del payload
    // como meta `__invalidate` y se extrae en normalize().
    db.runSync(
      `INSERT OR IGNORE INTO outbox (id, type, endpoint, method, payload, dedupe_key, created_at, attempts, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
      op.id,
      op.type,
      op.endpoint,
      op.method,
      JSON.stringify({ ...op.payload, __invalidate: op.invalidate }),
      op.dedupeKey,
      op.createdAt,
    );
  } catch {
    // Probable violación de UNIQUE(dedupe_key): ya está encolada → ignorar.
  }
}

function remove(id: string): void {
  if (Platform.OS === 'web') {
    webWrite(webRead().filter((o) => o.id !== id));
    return;
  }
  const db = getDb();
  if (!db) {
    webWrite(webRead().filter((o) => o.id !== id));
    return;
  }
  try {
    db.runSync('DELETE FROM outbox WHERE id = ?', id);
  } catch {
    // ignore
  }
}

function bumpAttempt(id: string, attempts: number, error: string): void {
  const webFallback = () => {
    const ops = webRead().map((o) => (o.id === id ? { ...o, attempts } : o));
    webWrite(ops);
  };
  if (Platform.OS === 'web') {
    webFallback();
    return;
  }
  const db = getDb();
  // Sin SQLite (nativo degradado) usamos el mismo fallback que insert()/remove()
  // para no perder el contador de intentos; de lo contrario MAX_ATTEMPTS nunca
  // se alcanzaría y una op con 5xx permanente quedaría atascada en la cola.
  if (!db) {
    webFallback();
    return;
  }
  try {
    db.runSync('UPDATE outbox SET attempts = ?, last_error = ? WHERE id = ?', attempts, error, id);
  } catch {
    // ignore
  }
}

// SQLite getPending payload incluye __invalidate; lo normalizamos aquí.
function normalize(op: OutboxOp): OutboxOp {
  const payload = { ...op.payload } as Record<string, unknown>;
  const inv = (payload.__invalidate as string[][] | undefined) ?? op.invalidate;
  delete payload.__invalidate;
  return { ...op, payload, invalidate: inv };
}

// ─── API pública ──────────────────────────────────────────────────────────────

function notifyChange(): void {
  changeListeners.forEach((l) => l());
}

export function subscribeOutbox(listener: () => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

/**
 * Encola una operación. Si ya existe una con el mismo dedupeKey, no hace nada
 * (idempotente). Devuelve true si quedó encolada.
 */
export function enqueue(op: Omit<OutboxOp, 'id' | 'createdAt' | 'attempts'>): boolean {
  if (existsByDedupe(op.dedupeKey)) return false;
  insert({ ...op, id: uid(), createdAt: Date.now(), attempts: 0 });
  notifyChange();
  return true;
}

/**
 * Procesa la cola en orden. Idempotente y seguro de llamar en paralelo
 * (un solo flush a la vez). Sólo intenta si hay conexión.
 */
export async function flush(): Promise<void> {
  if (flushing) return;
  if (!onlineManager.isOnline()) return;
  flushing = true;
  try {
    const ops = getPending().map(normalize);
    for (const op of ops) {
      try {
        await api.request({ url: op.endpoint, method: op.method, data: op.payload });
        remove(op.id);
        if (op.invalidate && _queryClient) {
          op.invalidate.forEach((key) => _queryClient!.invalidateQueries({ queryKey: key }));
        }
        notifyChange();
      } catch (err: any) {
        const status = err?.response?.status;
        // 4xx (salvo 408/429): operación inválida o ya aplicada → descartar.
        if (status && status >= 400 && status < 500 && status !== 408 && status !== 429) {
          remove(op.id);
          notifyChange();
          continue;
        }
        const attempts = op.attempts + 1;
        bumpAttempt(op.id, attempts, String(err?.message || 'error'));
        if (attempts >= MAX_ATTEMPTS) {
          // Demasiados intentos: descartar para no bloquear la cola.
          remove(op.id);
          notifyChange();
        }
        // Error de red/5xx: detener el flush; se reintenta al reconectar.
        break;
      }
    }
  } finally {
    flushing = false;
  }
}

/** Inicializa la cola: guarda el QueryClient y dispara flush al reconectar. */
export function initOutbox(queryClient: QueryClient): void {
  _queryClient = queryClient;
  // Al recuperar conexión, vaciar la cola.
  subscribeOnline((online) => {
    if (online) {
      void flush();
    }
  });
  // Al volver la app a primer plano (nativo), intentar vaciar.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status) => {
      if (status === 'active') void flush();
    });
  }
  // Intento inicial (por si quedó algo de una sesión anterior).
  setTimeout(() => {
    void flush();
  }, 2000);
}
