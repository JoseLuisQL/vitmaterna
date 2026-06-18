/**
 * VITMATERNA — Formato único de fecha y hora para citas.
 *
 * El backend guarda la fecha como `@db.Date` (medianoche UTC) y la hora como
 * `@db.Time` (instante UTC con la hora real). Para evitar desfases de huso (el
 * bug del antiguo combineDateTime, que mezclaba hora local con UTC), TODO se
 * interpreta en UTC y se formatea en español de forma consistente.
 */

const DOW = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const DOW_LARGO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MES_LARGO = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function toDate(value?: string | Date | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** 'HH:mm' desde un valor de hora ISO almacenado en UTC (sin desfase). */
export function formatHora24(horaIso?: string | Date | null): string {
  const d = toDate(horaIso);
  if (!d) return '--:--';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

/** '09:00 a. m.' (12h en español) desde una hora UTC. */
export function formatHora(horaIso?: string | Date | null): string {
  const d = toDate(horaIso);
  if (!d) return '--:--';
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ampm = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}

/** 'vie 20 jun' desde una fecha (UTC). */
export function formatFechaCorta(fecha?: string | Date | null): string {
  const d = toDate(fecha);
  if (!d) return '--';
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MES[d.getUTCMonth()]}`;
}

/** 'viernes 20 de junio' desde una fecha (UTC). */
export function formatFechaLarga(fecha?: string | Date | null): string {
  const d = toDate(fecha);
  if (!d) return '--';
  return `${DOW_LARGO[d.getUTCDay()]} ${d.getUTCDate()} de ${MES_LARGO[d.getUTCMonth()]}`;
}

/** 'Vie 20 jun · 09:00 a. m.' combinando fecha (día) y hora (UTC). */
export function formatFechaHora(fecha?: string | Date | null, hora?: string | Date | null): string {
  const f = formatFechaCorta(fecha);
  const cap = f.charAt(0).toUpperCase() + f.slice(1);
  return `${cap} · ${formatHora(hora)}`;
}

/** Diferencia en días enteros entre la fecha y hoy (en UTC). */
function diffDiasUTC(fecha: Date): number {
  const hoy = new Date();
  const a = Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate());
  const b = Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), hoy.getUTCDate());
  return Math.round((a - b) / 86400000);
}

/** Etiqueta relativa amigable: 'Hoy', 'Mañana', 'En 3 días', 'Ayer', o fecha. */
export function etiquetaRelativa(fecha?: string | Date | null): string {
  const d = toDate(fecha);
  if (!d) return '--';
  const diff = diffDiasUTC(d);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff <= 7) return `En ${diff} días`;
  if (diff < -1 && diff >= -7) return `Hace ${Math.abs(diff)} días`;
  const fc = formatFechaCorta(d);
  return fc.charAt(0).toUpperCase() + fc.slice(1);
}

/** Clave de agrupación por día: 'YYYY-MM-DD' (UTC). */
export function claveDia(fecha?: string | Date | null): string {
  const d = toDate(fecha);
  if (!d) return '';
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
