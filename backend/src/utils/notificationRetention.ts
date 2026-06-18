/**
 * VITMATERNA — Retención de notificaciones.
 *
 * Mantiene la bandeja sana borrando automáticamente las notificaciones LEÍDAS
 * más antiguas que un umbral (por defecto 30 días). Nunca borra no leídas (el
 * usuario aún no las atendió) ni urgentes recientes. Utilidad PURA para testear
 * el cálculo de la fecha de corte; el borrado en sí lo hace el cron con Prisma.
 */

/** Días tras los cuales una notificación LEÍDA se considera expirada. */
export const RETENTION_DAYS = 30;

/**
 * Fecha de corte: las notificaciones leídas con `leidaAt` anterior a esta fecha
 * pueden eliminarse.
 */
export function fechaCorteRetencion(
  referencia: Date = new Date(),
  dias: number = RETENTION_DAYS,
): Date {
  return new Date(referencia.getTime() - dias * 24 * 60 * 60 * 1000);
}

/**
 * ¿Debe eliminarse esta notificación por retención?
 * Solo si está leída y su `leidaAt` es anterior a la fecha de corte.
 */
export function debeEliminarsePorRetencion(
  notif: { leidaAt: Date | string | null },
  referencia: Date = new Date(),
  dias: number = RETENTION_DAYS,
): boolean {
  if (!notif.leidaAt) return false;
  const leida = notif.leidaAt instanceof Date ? notif.leidaAt : new Date(notif.leidaAt);
  if (isNaN(leida.getTime())) return false;
  return leida.getTime() < fechaCorteRetencion(referencia, dias).getTime();
}
