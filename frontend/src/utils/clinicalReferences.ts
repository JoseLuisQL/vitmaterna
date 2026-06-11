/**
 * VITMATERNA — Referencias clínicas para gráficas de seguimiento prenatal.
 *
 * Altura uterina (AU) por edad gestacional: percentiles P10 y P90 según las
 * curvas de referencia del CLAP/OPS usadas por el MINSA (Carnet Perinatal).
 * Valores en centímetros para semanas 13–40 (RF-5.03).
 */

export interface AUReferencePoint {
  semana: number;
  p10: number;
  p90: number;
}

/** Tabla de referencia de altura uterina (cm) por semana de gestación. */
export const ALTURA_UTERINA_REF: AUReferencePoint[] = [
  { semana: 13, p10: 8.0, p90: 12.0 },
  { semana: 14, p10: 8.5, p90: 12.5 },
  { semana: 15, p10: 9.5, p90: 13.5 },
  { semana: 16, p10: 11.5, p90: 15.0 },
  { semana: 17, p10: 12.5, p90: 16.5 },
  { semana: 18, p10: 13.5, p90: 17.5 },
  { semana: 19, p10: 14.0, p90: 18.5 },
  { semana: 20, p10: 15.0, p90: 19.5 },
  { semana: 21, p10: 15.5, p90: 20.5 },
  { semana: 22, p10: 16.5, p90: 21.5 },
  { semana: 23, p10: 17.5, p90: 22.5 },
  { semana: 24, p10: 18.5, p90: 23.5 },
  { semana: 25, p10: 19.0, p90: 24.5 },
  { semana: 26, p10: 20.0, p90: 25.5 },
  { semana: 27, p10: 20.5, p90: 26.5 },
  { semana: 28, p10: 21.5, p90: 27.0 },
  { semana: 29, p10: 22.5, p90: 28.0 },
  { semana: 30, p10: 23.5, p90: 29.0 },
  { semana: 31, p10: 24.0, p90: 29.5 },
  { semana: 32, p10: 25.0, p90: 30.5 },
  { semana: 33, p10: 25.5, p90: 31.5 },
  { semana: 34, p10: 26.0, p90: 32.0 },
  { semana: 35, p10: 26.5, p90: 33.0 },
  { semana: 36, p10: 28.0, p90: 33.5 },
  { semana: 37, p10: 28.5, p90: 34.0 },
  { semana: 38, p10: 29.5, p90: 34.5 },
  { semana: 39, p10: 30.0, p90: 35.0 },
  { semana: 40, p10: 31.0, p90: 36.0 },
];

/** Devuelve el punto de referencia exacto de una semana, o null si no existe. */
export function getAUReference(semana: number): AUReferencePoint | null {
  return ALTURA_UTERINA_REF.find((r) => r.semana === Math.round(semana)) ?? null;
}

/** Clasificación de un valor de AU respecto a su referencia por semana. */
export type AUClassification = 'baja' | 'normal' | 'alta' | 'sin_referencia';

export function classifyAlturaUterina(semana: number, valor: number): AUClassification {
  const ref = getAUReference(semana);
  if (!ref) return 'sin_referencia';
  if (valor < ref.p10) return 'baja';
  if (valor > ref.p90) return 'alta';
  return 'normal';
}

/**
 * Interpola P10/P90 para un rango de semanas dado (para dibujar las bandas de
 * referencia alineadas con los puntos medidos). Usa el valor exacto si existe;
 * si no, interpola linealmente entre los puntos vecinos y hace clamp a los
 * extremos de la tabla.
 */
export function interpolateAU(semana: number): { p10: number; p90: number } | null {
  if (ALTURA_UTERINA_REF.length === 0) return null;
  const first = ALTURA_UTERINA_REF[0];
  const last = ALTURA_UTERINA_REF[ALTURA_UTERINA_REF.length - 1];
  if (semana <= first.semana) return { p10: first.p10, p90: first.p90 };
  if (semana >= last.semana) return { p10: last.p10, p90: last.p90 };

  for (let i = 0; i < ALTURA_UTERINA_REF.length - 1; i++) {
    const a = ALTURA_UTERINA_REF[i];
    const b = ALTURA_UTERINA_REF[i + 1];
    if (semana >= a.semana && semana <= b.semana) {
      const t = (semana - a.semana) / (b.semana - a.semana);
      return {
        p10: +(a.p10 + (b.p10 - a.p10) * t).toFixed(1),
        p90: +(a.p90 + (b.p90 - a.p90) * t).toFixed(1),
      };
    }
  }
  return null;
}
