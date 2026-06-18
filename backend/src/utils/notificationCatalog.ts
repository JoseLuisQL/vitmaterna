/**
 * VITMATERNA — Catálogo único de tipos de notificación.
 *
 * Asocia cada `tipo` con su **categoría** (clínica / cita / sistema) y su
 * **prioridad** (alta / normal). Se deriva del tipo (no requiere columnas nuevas
 * en la BD): el backend lo adjunta a cada notificación al listarlas y el frontend
 * lo usa para filtrar ("Solo urgentes") y ordenar. Fuente de verdad compartida.
 */

export type NotifCategoria = 'clinica' | 'cita' | 'sistema';
export type NotifPrioridad = 'alta' | 'normal';

interface NotifMeta {
  categoria: NotifCategoria;
  prioridad: NotifPrioridad;
}

const CATALOG: Record<string, NotifMeta> = {
  // Clínicas
  emergencia: { categoria: 'clinica', prioridad: 'alta' },
  signo_alarma: { categoria: 'clinica', prioridad: 'alta' },
  baja_adherencia: { categoria: 'clinica', prioridad: 'normal' },
  examenes_pendientes: { categoria: 'clinica', prioridad: 'normal' },
  resultado_laboratorio: { categoria: 'clinica', prioridad: 'normal' },
  recordatorio_suplemento: { categoria: 'clinica', prioridad: 'normal' },
  fpp_proxima: { categoria: 'clinica', prioridad: 'normal' },

  // Citas
  cita_confirmada: { categoria: 'cita', prioridad: 'normal' },
  solicitud_reprogramacion: { categoria: 'cita', prioridad: 'alta' },
  reprogramacion_aprobada: { categoria: 'cita', prioridad: 'normal' },
  reprogramacion_rechazada: { categoria: 'cita', prioridad: 'normal' },
  cita_domiciliaria: { categoria: 'cita', prioridad: 'normal' },
  visita_domiciliaria: { categoria: 'cita', prioridad: 'normal' },
  inasistencia: { categoria: 'cita', prioridad: 'alta' },

  // Sistema (dirigidas al admin)
  obstetra_pendiente: { categoria: 'sistema', prioridad: 'alta' },
  alarma_sin_atender: { categoria: 'sistema', prioridad: 'alta' },
  canal_caido: { categoria: 'sistema', prioridad: 'alta' },
  sistema: { categoria: 'sistema', prioridad: 'normal' },
};

const DEFAULT_META: NotifMeta = { categoria: 'sistema', prioridad: 'normal' };

/** Devuelve categoría + prioridad de un tipo de notificación. */
export function notifMeta(tipo: string): NotifMeta {
  return CATALOG[tipo] ?? DEFAULT_META;
}

/** ¿Es un tipo de prioridad alta (urgente)? */
export function esUrgente(tipo: string): boolean {
  return notifMeta(tipo).prioridad === 'alta';
}
