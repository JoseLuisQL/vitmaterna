/**
 * VITMATERNA — Tamizaje básico obligatorio (MINSA) para el control prenatal.
 *
 * Lista ÚNICA de exámenes obligatorios y la lógica para detectar cuáles faltan
 * según la edad gestacional. Centralizada aquí para que el cron de alertas
 * (notification.service) y el resumen clínico (clinicalSummary) usen exactamente
 * el mismo criterio (DRY: antes la lista vivía duplicada).
 */

export interface ExamenObligatorio {
  nombre: string;
  alias: string[];
  desdeSemana: number;
}

export const EXAMENES_OBLIGATORIOS: ExamenObligatorio[] = [
  { nombre: 'Hemoglobina', alias: ['hemoglobina', 'hb'], desdeSemana: 12 },
  { nombre: 'VIH', alias: ['vih'], desdeSemana: 12 },
  { nombre: 'Sífilis (VDRL/RPR)', alias: ['vdrl', 'rpr', 'sifilis', 'sífilis'], desdeSemana: 12 },
  { nombre: 'Glucosa', alias: ['glucosa', 'glucemia'], desdeSemana: 12 },
  { nombre: 'Examen de orina', alias: ['orina', 'urocultivo', 'examen de orina'], desdeSemana: 12 },
];

/**
 * Devuelve los exámenes obligatorios que faltan para una gestante, dada su edad
 * gestacional y los tipos de examen ya registrados.
 *
 * @param egWeeks Edad gestacional en semanas (null/menor a 12 → sin pendientes).
 * @param tiposRegistrados Lista de `tipoExamen` ya registrados (cualquier caso).
 */
export function examenesPendientes(
  egWeeks: number | null | undefined,
  tiposRegistrados: string[],
): string[] {
  if (egWeeks == null || egWeeks < 12) return [];
  const registrados = tiposRegistrados.map((t) => (t || '').toLowerCase());
  return EXAMENES_OBLIGATORIOS.filter(
    (ex) =>
      egWeeks >= ex.desdeSemana &&
      !registrados.some((r) => ex.alias.some((a) => r.includes(a))),
  ).map((ex) => ex.nombre);
}
