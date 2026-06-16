/**
 * VITMATERNA — Cálculo ÚNICO de adherencia a la suplementación.
 *
 * ⚠️ Definición operacional para la investigación (Objetivo 2). Esta es la ÚNICA
 * fórmula válida en todo el sistema. Antes existían 3 cálculos distintos
 * (clinical, reports, notifications) que daban números diferentes para la misma
 * gestante — eso invalidaba el análisis. Aquí se centraliza.
 *
 * Definición:
 *   Adherencia (%) = (días con toma registrada ÷ días esperados de toma) × 100
 *   días esperados = días transcurridos desde fechaInicio hasta hoy (o hasta
 *                    fechaFin si ya terminó), acotado a la duración del
 *                    tratamiento (duracionDias). Mínimo 1 para evitar /0.
 *
 * Umbral de buena adherencia: ≥ 80% (estándar en literatura de suplementación
 * con hierro/ácido fólico).
 */

export const ADHERENCE_GOOD_THRESHOLD = 80;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface AdherenceInput {
  fechaInicio: Date | string;
  fechaFin?: Date | string | null;
  duracionDias?: number | null;
  /** Registros de toma; se cuentan los que tienen `tomado === true`. */
  logs: Array<{ tomado: boolean }>;
  /** Fecha de referencia (por defecto hoy). Útil para reportes por periodo. */
  referencia?: Date;
}

export interface AdherenceResult {
  /** Porcentaje 0–100, redondeado a entero. */
  porcentaje: number;
  /** Días con toma registrada (numerador). */
  diasTomados: number;
  /** Días esperados de toma (denominador). */
  diasEsperados: number;
  /** ¿Alcanza el umbral de buena adherencia (≥80%)? */
  buenaAdherencia: boolean;
}

/** Calcula los días esperados de toma de un tratamiento a una fecha dada. */
export function diasEsperadosDeToma(
  fechaInicio: Date | string,
  fechaFin: Date | string | null | undefined,
  duracionDias: number | null | undefined,
  referencia: Date = new Date(),
): number {
  const inicio = new Date(fechaInicio);
  const fin = fechaFin ? new Date(fechaFin) : null;

  // El corte es la fecha de referencia, pero no más allá del fin del tratamiento.
  const corte = fin && fin.getTime() < referencia.getTime() ? fin : referencia;
  const transcurridos = Math.floor((corte.getTime() - inicio.getTime()) / MS_PER_DAY) + 1;

  // Acotar a la duración prescrita si existe.
  const tope = duracionDias && duracionDias > 0 ? duracionDias : transcurridos;
  return Math.max(1, Math.min(transcurridos, tope));
}

/** Cálculo único de adherencia de un tratamiento. */
export function calcularAdherencia(input: AdherenceInput): AdherenceResult {
  const diasEsperados = diasEsperadosDeToma(
    input.fechaInicio,
    input.fechaFin,
    input.duracionDias,
    input.referencia ?? new Date(),
  );
  const diasTomados = input.logs.filter((l) => l.tomado).length;
  const porcentaje = Math.min(100, Math.round((diasTomados / diasEsperados) * 100));
  return {
    porcentaje,
    diasTomados,
    diasEsperados,
    buenaAdherencia: porcentaje >= ADHERENCE_GOOD_THRESHOLD,
  };
}
