import { getDb } from './index';

/**
 * Inicializa el almacén local SQLite (sólo nativo).
 *
 * Antes este archivo creaba tablas que nunca se usaban. Ahora crea únicamente
 * la tabla `outbox`: la cola de escrituras offline (consumo de suplemento y
 * signos de alarma) que se reenvían al reconectar. La lectura offline la
 * gestiona la caché persistente de React Query, no SQLite.
 *
 * En web se omite (expo-sqlite requiere COOP/COEP); la outbox cae a un
 * fallback en memoria/localStorage definido en services/outbox.ts.
 */
export function initializeDatabase() {
  const db = getDb();
  if (!db) return;
  try {
    db.execSync('PRAGMA journal_mode = WAL;');

    db.execSync(`
      CREATE TABLE IF NOT EXISTS outbox (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        payload TEXT NOT NULL,
        dedupe_key TEXT,
        created_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        status TEXT NOT NULL DEFAULT 'pending'
      );
    `);

    // Índice para procesar FIFO y deduplicar rápido.
    db.execSync('CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox (status, created_at);');
    db.execSync('CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_dedupe ON outbox (dedupe_key);');

    if (__DEV__) console.log('[SQLite] Outbox inicializado correctamente.');
  } catch (error) {
    console.error('[SQLite] Error inicializando outbox:', error);
  }
}
