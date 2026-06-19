/**
 * Cola de envío de notificaciones SMS/WhatsApp (BullMQ + Redis).
 *
 * Objetivo: que un fallo transitorio del proveedor (red, rate limit) no pierda
 * el mensaje. Los envíos se encolan y el worker reintenta con backoff
 * exponencial. Si Redis/BullMQ no están disponibles, se degrada con elegancia a
 * envío directo (fallback) para no romper el flujo en desarrollo.
 */
import { Queue, Worker, type ConnectionOptions } from 'bullmq';
import { env } from '../../config/env.js';
import { sendSmsAndWhatsApp, type DeliveryResult } from './channels.js';

export interface DeliveryJob {
  phone: string;
  message: string;
  prefs?: { sms?: boolean; whatsapp?: boolean } | null;
  userId?: string | null;
}

const QUEUE_NAME = 'notifications';

// BullMQ requiere una conexión dedicada con maxRetriesPerRequest: null.
const connection: ConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
};

let queue: Queue<DeliveryJob> | null = null;
let worker: Worker<DeliveryJob> | null = null;
let queueReady = false;

/**
 * Inicializa la cola y el worker. Best-effort: si falla la conexión, deja
 * `queueReady = false` y el sistema usará envío directo.
 */
export function initNotificationQueue(): void {
  try {
    queue = new Queue<DeliveryJob>(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });

    worker = new Worker<DeliveryJob>(
      QUEUE_NAME,
      async (job) => {
        const { phone, message, prefs, userId } = job.data;
        const results = await sendSmsAndWhatsApp(phone, message, prefs, userId);
        // Si TODOS los canales reales fallaron, lanzar para que BullMQ reintente.
        const realAttempts = results.filter((r) => r.status === 'sent' || r.status === 'failed');
        if (realAttempts.length > 0 && realAttempts.every((r) => r.status === 'failed')) {
          throw new Error(realAttempts.map((r) => `${r.channel}: ${r.error}`).join('; '));
        }
        return results;
      },
      { connection, concurrency: 5 },
    );

    worker.on('failed', (job, err) => {
      console.error(`[NOTIF QUEUE] Job ${job?.id} falló (intento ${job?.attemptsMade}):`, err.message);
    });
    worker.on('error', (err) => {
      // Error de conexión del worker → desactivar cola y usar fallback.
      console.error('[NOTIF QUEUE] Error del worker:', err.message);
      queueReady = false;
    });

    queueReady = true;
    console.log('✅ Cola de notificaciones (BullMQ) inicializada');
  } catch (e) {
    queueReady = false;
    console.warn('[NOTIF QUEUE] No se pudo inicializar la cola; se usará envío directo:', (e as Error).message);
  }
}

/**
 * Encola un envío SMS/WhatsApp. Si la cola no está disponible, envía directo.
 * Nunca lanza (best-effort).
 */
export async function enqueueDelivery(job: DeliveryJob): Promise<DeliveryResult[] | void> {
  if (queueReady && queue) {
    try {
      await queue.add('send', job);
      return;
    } catch (e) {
      console.warn('[NOTIF QUEUE] add() falló; fallback a envío directo:', (e as Error).message);
    }
  }
  // Fallback: envío directo.
  return sendSmsAndWhatsApp(job.phone, job.message, job.prefs, job.userId);
}

/** Cierre ordenado de la cola y el worker. */
export async function closeNotificationQueue(): Promise<void> {
  await Promise.allSettled([worker?.close(), queue?.close()]);
}
