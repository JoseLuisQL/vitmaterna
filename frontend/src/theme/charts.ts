/**
 * VITMATERNA — Tokens de gráfico
 *
 * Un solo lugar para afinar TODOS los gráficos SVG (LineChartSvg, ChartBar,
 * ChartDonut). Reemplaza los literales sueltos (`fontSize={9}`, `strokeWidth={1}`,
 * `fill={commonColors.textTertiary}`) que no se adaptaban al cambiar la paleta
 * o el cuerpo mínimo.
 *
 * Referencia neutros existentes (no introduce colores nuevos) para coherencia
 * con el resto del sistema "Clinical Calm".
 */
import { commonColors } from './colors';
import { spacing } from './spacing';

export const chartTokens = {
  /** Color de la grilla/líneas de eje (casi invisible). */
  gridStroke: commonColors.borderLight,
  /** Color del texto de ejes/leyenda. */
  axisColor: commonColors.textTertiary,
  /** Tamaño de fuente de ejes/leyenda (legible, no decorativo). */
  axisFontSize: 10,
  /** Grosor de la línea de eje/grilla (hairline). */
  axisStrokeWidth: 1,
  /** Radio de las barras de ChartBar (px). */
  barRadius: 4,
  /** Padding interno del lienzo (aire alrededor de la serie). */
  padding: spacing.md,
  /** Aire entre el lienzo y la leyenda. */
  legendGap: spacing.sm,
  /** Grosor por defecto de la serie principal de un gráfico de líneas. */
  lineStrokeWidth: 2.5,
  /** Máximo de series + bandas antes de considerar el gráfico "ruidoso". */
  maxSeries: 2,
  maxBands: 1,
} as const;
