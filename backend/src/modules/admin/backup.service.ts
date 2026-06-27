import { spawn } from 'node:child_process';
import type { Readable } from 'node:stream';
import { env } from '../../config/env.js';

/**
 * Servicio de backup de la base de datos.
 *
 * Genera un volcado SQL restaurable con `pg_dump` y lo expone como un stream
 * para descargarlo directamente sin bufferizar todo en memoria.
 *
 * Seguridad:
 *  - `spawn` con `shell:false`: ningún valor de la cadena de conexión puede
 *    interpretarse como comando de shell (sin inyección).
 *  - La contraseña se pasa por la variable de entorno `PGPASSWORD` del proceso
 *    hijo, NUNCA en argv (que sería visible en `ps` / /proc/<pid>/cmdline).
 *  - stderr se recoge aparte para no contaminar el cuerpo SQL ni filtrar
 *    detalles al cliente.
 */

interface PgConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/** Descompone DATABASE_URL en sus partes usando el parser WHATWG (seguro). */
function parseDatabaseUrl(databaseUrl: string): PgConnection {
  const u = new URL(databaseUrl);
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') {
    throw new Error(`Protocolo de base de datos no soportado: ${u.protocol}`);
  }
  return {
    host: u.hostname,
    port: u.port || '5432',
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

export interface BackupHandle {
  /** Stream de salida del volcado SQL (stdout de pg_dump). */
  stdout: Readable;
  /** Nombre de archivo sugerido para la descarga. */
  filename: string;
  /** Resuelve con exit 0; rechaza con mensaje de error (incluye stderr). */
  done: Promise<void>;
  /** Mata el proceso pg_dump (p. ej. si el cliente cancela la descarga). */
  abort: () => void;
}

export class BackupService {
  /**
   * Lanza `pg_dump` y devuelve su stdout como stream.
   *
   * @param timeoutMs Tiempo máximo antes de matar el proceso (def. 30 min).
   */
  startSqlDump(timeoutMs = 30 * 60_000): BackupHandle {
    const conn = parseDatabaseUrl(env.DATABASE_URL);

    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `vitmaterna-${conn.database}-${stamp}.sql`;

    const args = [
      '--host', conn.host,
      '--port', conn.port,
      '--username', conn.user,
      '--dbname', conn.database,
      '--format=plain', // SQL en texto plano, restaurable con psql
      '--no-owner', // portabilidad: no fija OWNER (lo asume quien restaura)
      '--no-privileges', // portabilidad: omite GRANT/REVOKE
      '--clean', // emite DROP ... antes de cada CREATE
      '--if-exists', // hace seguros los DROP en una BD limpia
      '--encoding=UTF8',
      '--no-password', // nunca pedir contraseña interactiva
      '--verbose', // el progreso va a stderr, no al SQL
    ];

    const child = spawn('pg_dump', args, {
      shell: false,
      env: {
        ...process.env,
        PGPASSWORD: conn.password,
        PGCONNECT_TIMEOUT: '10',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Recoge stderr con tope para que un proceso anómalo no agote memoria.
    let stderrBuf = '';
    child.stderr.on('data', (c: Buffer) => {
      if (stderrBuf.length < 64 * 1024) stderrBuf += c.toString('utf8');
    });

    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);

    const done = new Promise<void>((resolve, reject) => {
      child.on('error', (err) => {
        clearTimeout(timer);
        // p. ej. binario pg_dump no encontrado (ENOENT)
        reject(new Error(`No se pudo iniciar pg_dump: ${err.message}`));
      });
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        if (code === 0) return resolve();
        reject(
          new Error(
            `pg_dump terminó con code=${code} signal=${signal ?? 'none'}: ${stderrBuf.trim()}`,
          ),
        );
      });
    });

    return {
      stdout: child.stdout,
      filename,
      done,
      abort: () => child.kill('SIGKILL'),
    };
  }
}

export const backupService = new BackupService();
