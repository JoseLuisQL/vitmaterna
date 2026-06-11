/**
 * Utilidades de horarios de citas (agenda inteligente).
 *
 * Genera la grilla de horarios de atención del establecimiento y permite
 * calcular los slots disponibles de un día descontando las citas ya ocupadas.
 * Pensado para evitar doble booking (RF-3.x) y alimentar el selector de
 * horario del frontend.
 */

/** Configuración por defecto de la agenda (horario MINSA típico de C.S.). */
export const SLOT_CONFIG = {
  /** Hora de inicio de atención (24h). */
  startHour: 8,
  /** Hora de fin de atención (24h, exclusiva). */
  endHour: 17,
  /** Duración de cada slot en minutos. */
  slotMinutes: 30,
  /** Inicio del refrigerio (24h) — se excluye de la agenda. */
  lunchStartHour: 13,
  /** Fin del refrigerio (24h). */
  lunchEndHour: 14,
} as const;

/** Convierte una hora `HH:mm` a minutos desde medianoche. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Convierte minutos desde medianoche a `HH:mm`. */
export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Extrae `HH:mm` (UTC) de un valor de hora almacenado por Prisma como
 * `@db.Time` (Date con la hora en UTC sobre 1970-01-01).
 */
export function timeFromDate(value: Date): string {
  const d = new Date(value);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** Genera todos los slots `HH:mm` del día según la configuración. */
export function generateDaySlots(config = SLOT_CONFIG): string[] {
  const slots: string[] = [];
  const start = config.startHour * 60;
  const end = config.endHour * 60;
  const lunchStart = config.lunchStartHour * 60;
  const lunchEnd = config.lunchEndHour * 60;

  for (let t = start; t < end; t += config.slotMinutes) {
    // Excluir el bloque de refrigerio.
    if (t >= lunchStart && t < lunchEnd) continue;
    slots.push(minutesToTime(t));
  }
  return slots;
}

/**
 * Calcula los slots disponibles de un día descontando las horas ocupadas.
 *
 * @param ocupados Lista de horas ocupadas en formato `HH:mm`.
 * @param config   Configuración de la agenda.
 * @returns Lista de slots con marca de disponibilidad.
 */
export function computeAvailableSlots(
  ocupados: string[],
  config = SLOT_CONFIG,
): { hora: string; disponible: boolean }[] {
  const ocupadosSet = new Set(ocupados);
  return generateDaySlots(config).map((hora) => ({
    hora,
    disponible: !ocupadosSet.has(hora),
  }));
}

/** Indica si una hora `HH:mm` cae dentro del horario de atención (sin refrigerio). */
export function isWithinWorkingHours(hhmm: string, config = SLOT_CONFIG): boolean {
  const t = timeToMinutes(hhmm);
  const start = config.startHour * 60;
  const end = config.endHour * 60;
  const lunchStart = config.lunchStartHour * 60;
  const lunchEnd = config.lunchEndHour * 60;
  if (t < start || t >= end) return false;
  if (t >= lunchStart && t < lunchEnd) return false;
  return true;
}
