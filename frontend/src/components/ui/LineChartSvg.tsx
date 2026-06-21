/**
 * VITMATERNA - LineChartSvg
 *
 * Gráfica de líneas con react-native-svg (sin react-native-chart-kit, que en
 * web emite warnings de "responder handlers"). Soporta múltiples series, puntos
 * opcionales, etiquetas del eje X y eje Y con grilla. Pensada para curvas
 * clínicas (altura uterina, peso) con bandas de referencia.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Line, Polyline, Polygon, Text as SvgText } from 'react-native-svg';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export interface LineSeries {
  data: number[];
  color: string;
  strokeWidth?: number;
  /** Mostrar puntos en la serie (default true). */
  withDots?: boolean;
  /** Línea discontinua (para bandas de referencia). */
  dashed?: boolean;
  /** Resalta el último punto con un círculo mayor (para el dato más reciente). */
  highlightLast?: boolean;
}

/** Banda sombreada entre dos curvas (p. ej. "zona normal" entre P10 y P90). */
export interface ShadedBand {
  lower: number[];
  upper: number[];
  color: string;
}

interface LineChartSvgProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
  /** Decimales en el eje Y. */
  decimals?: number;
  /** Leyenda opcional: [{label, color}]. */
  legend?: { label: string; color: string }[];
  /** Banda sombreada de fondo (zona normal). */
  band?: ShadedBand;
  /** Título del eje Y (p. ej. "Altura uterina (cm)"). */
  yAxisLabel?: string;
  /** Título del eje X (p. ej. "Semanas de embarazo"). */
  xAxisLabel?: string;
  style?: ViewStyle;
}

const PADDING_LEFT = 32;
const PADDING_RIGHT = 12;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 26;
const Y_TICKS = 4;

export function LineChartSvg({
  labels,
  series,
  height = 200,
  decimals = 0,
  legend,
  band,
  yAxisLabel,
  xAxisLabel,
  style,
}: LineChartSvgProps): React.ReactElement {
  const [width, setWidth] = React.useState(0);

  // El rótulo del eje Y ocupa un carril extra a la izquierda; el del eje X, abajo.
  const padLeft = PADDING_LEFT + (yAxisLabel ? 14 : 0);
  const padBottom = PADDING_BOTTOM + (xAxisLabel ? 16 : 0);

  // Rango Y a partir de todas las series Y de la banda (para que quepa completa).
  const bandValues = band ? [...band.lower, ...band.upper].filter((v) => Number.isFinite(v)) : [];
  const allValues = [...series.flatMap((s) => s.data), ...bandValues].filter((v) => Number.isFinite(v));
  let min = allValues.length ? Math.min(...allValues) : 0;
  let max = allValues.length ? Math.max(...allValues) : 1;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  // Margen del 8% arriba y abajo.
  const span = max - min;
  min -= span * 0.08;
  max += span * 0.08;

  const chartW = Math.max(0, width - padLeft - PADDING_RIGHT);
  const chartH = height - PADDING_TOP - padBottom;
  const n = Math.max(1, labels.length);

  const x = (i: number) => padLeft + (n === 1 ? chartW / 2 : (chartW * i) / (n - 1));
  const y = (v: number) => PADDING_TOP + chartH - ((v - min) / (max - min)) * chartH;

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => min + ((max - min) * i) / Y_TICKS);

  // Reducir número de labels X si hay muchos (evita solape).
  const labelStep = Math.ceil(n / 6);

  // Polígono de la banda sombreada (zona normal): borde superior de izq→der y
  // borde inferior de der→izq, cerrando el área entre ambas curvas.
  const bandPoints = band
    ? [
        ...band.upper.map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : null)).filter(Boolean),
        ...band.lower
          .map((v, i) => ({ v, i }))
          .reverse()
          .map(({ v, i }) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : null))
          .filter(Boolean),
      ].join(' ')
    : '';

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* Banda sombreada (zona normal) detrás de todo */}
          {band && bandPoints ? (
            <Polygon points={bandPoints} fill={band.color} stroke="none" />
          ) : null}

          {/* Grilla horizontal + etiquetas Y */}
          {yTicks.map((t, i) => (
            <React.Fragment key={`y${i}`}>
              <Line
                x1={padLeft}
                y1={y(t)}
                x2={width - PADDING_RIGHT}
                y2={y(t)}
                stroke={commonColors.borderLight}
                strokeWidth={1}
              />
              <SvgText
                x={padLeft - 6}
                y={y(t) + 3}
                fontSize={9}
                fill={commonColors.textTertiary}
                textAnchor="end"
              >
                {t.toFixed(decimals)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Series */}
          {series.map((s, si) => {
            const pts = s.data
              .map((v, i) => (Number.isFinite(v) ? `${x(i)},${y(v)}` : null))
              .filter(Boolean)
              .join(' ');
            const lastIdx = s.data.map((v) => Number.isFinite(v)).lastIndexOf(true);
            return (
              <React.Fragment key={`s${si}`}>
                <Polyline
                  points={pts}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={s.strokeWidth ?? 2}
                  strokeDasharray={s.dashed ? '5,4' : undefined}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {(s.withDots ?? true) &&
                  s.data.map((v, i) =>
                    Number.isFinite(v) ? (
                      <Circle
                        key={`d${si}-${i}`}
                        cx={x(i)}
                        cy={y(v)}
                        r={s.highlightLast && i === lastIdx ? 6 : 3}
                        fill={s.color}
                        stroke={s.highlightLast && i === lastIdx ? commonColors.surface : undefined}
                        strokeWidth={s.highlightLast && i === lastIdx ? 2 : undefined}
                      />
                    ) : null,
                  )}
              </React.Fragment>
            );
          })}

          {/* Etiquetas X */}
          {labels.map((lbl, i) =>
            i % labelStep === 0 ? (
              <SvgText
                key={`x${i}`}
                x={x(i)}
                y={PADDING_TOP + chartH + 16}
                fontSize={9}
                fill={commonColors.textTertiary}
                textAnchor="middle"
              >
                {lbl}
              </SvgText>
            ) : null,
          )}

          {/* Título del eje Y (vertical) */}
          {yAxisLabel ? (
            <SvgText
              x={12}
              y={PADDING_TOP + chartH / 2}
              fontSize={10}
              fill={commonColors.textSecondary}
              textAnchor="middle"
              transform={`rotate(-90 12 ${PADDING_TOP + chartH / 2})`}
            >
              {yAxisLabel}
            </SvgText>
          ) : null}

          {/* Título del eje X */}
          {xAxisLabel ? (
            <SvgText
              x={padLeft + chartW / 2}
              y={height - 4}
              fontSize={10}
              fill={commonColors.textSecondary}
              textAnchor="middle"
            >
              {xAxisLabel}
            </SvgText>
          ) : null}
        </Svg>
      )}

      {legend && legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((l) => (
            <View key={l.label} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <Text style={styles.legendText}>{l.label}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...typography.caption, color: commonColors.textSecondary },
});
