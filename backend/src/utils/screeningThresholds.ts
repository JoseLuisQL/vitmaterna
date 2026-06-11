/**
 * VITMATERNA — Umbrales de tamizaje (MINSA).
 *
 * Centraliza los criterios de positividad/derivación de los tamizajes para que
 * el servidor sea la fuente de verdad (RF-5.11), independientemente de lo que
 * envíe el cliente.
 */

/** Umbral del tamizaje de violencia (Ficha de Tamizaje de Violencia, MINSA). */
export const VIOLENCE_POSITIVE_THRESHOLD = 15;

/**
 * Calcula el puntaje total de violencia a partir de las respuestas si no se
 * provee explícitamente. Suma 1 por respuesta afirmativa y suma los valores
 * numéricos directamente.
 */
export function computeViolenceScore(
  respuestas: Record<string, unknown> | null | undefined,
  puntajeExplicito?: number,
): number {
  if (typeof puntajeExplicito === 'number' && !Number.isNaN(puntajeExplicito)) {
    return puntajeExplicito;
  }
  let total = 0;
  if (respuestas && typeof respuestas === 'object') {
    for (const val of Object.values(respuestas)) {
      if (val === true || val === 'si' || val === 'yes') total += 1;
      else if (typeof val === 'number') total += val;
    }
  }
  return total;
}

/** Un tamizaje de violencia es positivo cuando el puntaje alcanza el umbral. */
export function isViolencePositive(puntajeTotal: number): boolean {
  return puntajeTotal >= VIOLENCE_POSITIVE_THRESHOLD;
}

/**
 * Criterio de derivación del SRQ-18 (salud mental):
 * positivo si trastorno mental (≥9 en 1-18), o cualquier síntoma psicótico
 * (≥1 en 19-22), o epilepsia (pregunta 23), o consumo de alcohol (≥1 en 24-28).
 */
export function isSrq18Positive(scores: {
  p1_18?: number;
  p19_22?: number;
  pregunta23?: boolean;
  p24_28?: number;
}): boolean {
  const { p1_18 = 0, p19_22 = 0, pregunta23 = false, p24_28 = 0 } = scores;
  return p1_18 >= 9 || p19_22 >= 1 || pregunta23 === true || p24_28 >= 1;
}
