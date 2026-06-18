/**
 * VITMATERNA — Emisión de eventos de cita en tiempo real (Socket.IO).
 *
 * Cuando una cita cambia (crear/actualizar/cambiar estado), se notifica EN VIVO a
 * la gestante y al obstetra involucrados, emitiendo a sus salas personales
 * `user:<userId>` (las mismas que ya usa el chat). El frontend invalida sus
 * queries al recibir el evento, de modo que ambos roles ven el cambio sin
 * recargar. Es best-effort: nunca debe romper la operación principal.
 */
import { prisma } from '../config/database.js';

export type AppointmentEvent =
  | 'appointment:created'
  | 'appointment:updated'
  | 'appointment:status_changed';

interface AppointmentRef {
  id: string;
  gestanteId?: string | null;
  obstetraId?: string | null;
  estado?: string | null;
}

/**
 * Emite un evento de cita a las salas de la gestante y del obstetra.
 * Resuelve los userId a partir de los perfiles. No lanza si algo falla.
 */
export async function emitAppointmentEvent(
  event: AppointmentEvent,
  appt: AppointmentRef,
): Promise<void> {
  try {
    const { getIO } = await import('../config/socketRegistry.js');
    const io = getIO();
    if (!io) return;

    const userIds: string[] = [];

    if (appt.gestanteId) {
      const g = await prisma.gestante.findUnique({
        where: { id: appt.gestanteId },
        select: { userId: true },
      });
      if (g?.userId) userIds.push(g.userId);
    }
    if (appt.obstetraId) {
      const o = await prisma.obstetra.findUnique({
        where: { id: appt.obstetraId },
        select: { userId: true },
      });
      if (o?.userId) userIds.push(o.userId);
    }

    const payload = { id: appt.id, estado: appt.estado ?? null, event };
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit(event, payload);
    }
  } catch {
    /* best-effort: la notificación en vivo nunca bloquea la mutación */
  }
}
