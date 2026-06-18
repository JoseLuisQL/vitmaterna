/**
 * VITMATERNA — Priorización y orden de citas.
 *
 * Define el orden "clínicamente útil" para la agenda del obstetra: primero lo que
 * requiere acción o está confirmado, luego por fecha más cercana. El servidor es
 * la fuente de verdad del orden (la UI solo muestra).
 */

/** Peso de prioridad por estado (menor = más arriba en la lista). */
export const ESTADO_PRIORIDAD: Record<string, number> = {
  solicitud_reprogramacion: 0, // requiere decisión del obstetra YA
  confirmada: 1, // la paciente viene seguro → preparar
  programada: 2, // pendiente de confirmación
  reprogramada: 3, // reagendada, pendiente
  asistida: 4, // histórico
  no_asistida: 5, // histórico (seguimiento aparte)
  cancelada: 6, // histórico
};

/** Devuelve el peso de un estado (los desconocidos van al final). */
export function prioridadEstado(estado: string | null | undefined): number {
  if (!estado) return 99;
  return ESTADO_PRIORIDAD[estado] ?? 99;
}

export interface SortableAppointment {
  estado?: string | null;
  fecha: Date | string;
  hora?: Date | string | null;
}

/** Combina fecha (día) + hora (UTC) en milisegundos para comparar instantes. */
function instante(a: SortableAppointment): number {
  const f = a.fecha instanceof Date ? a.fecha : new Date(a.fecha);
  let ms = Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate());
  if (a.hora) {
    const h = a.hora instanceof Date ? a.hora : new Date(a.hora);
    if (!isNaN(h.getTime())) {
      ms += (h.getUTCHours() * 60 + h.getUTCMinutes()) * 60 * 1000;
    }
  }
  return ms;
}

/**
 * Comparador por PRIORIDAD: primero por peso de estado, luego por fecha+hora más
 * cercana (ascendente). Pensado para la vista "agenda" del obstetra.
 */
export function compararPorPrioridad(a: SortableAppointment, b: SortableAppointment): number {
  const pa = prioridadEstado(a.estado);
  const pb = prioridadEstado(b.estado);
  if (pa !== pb) return pa - pb;
  return instante(a) - instante(b);
}

/**
 * Ordena una lista de citas por prioridad (no muta el original).
 */
export function ordenarPorPrioridad<T extends SortableAppointment>(citas: T[]): T[] {
  return [...citas].sort(compararPorPrioridad);
}
