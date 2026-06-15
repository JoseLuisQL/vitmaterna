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
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
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
}

interface LineChartSvgProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
  /** Decimales en el eje Y. */
  decimals?: number;
  /** Leyenda opcional: [{label, color}]. */
  legend?: { label: string; color: string }[];
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
  style,
}: LineChartSvgProps): React.ReactElement {
  const [width, setWidth] = React.useState(0);

  // Rango Y a partir de todas las series.
  const allValues = series.flatMap((s) => s.data).filter((v) => Number.isFinite(v));
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

  const chartW = Math.max(0, width - PADDING_LEFT - PADDING_RIGHT);
  const chartH = height - PADDING_TOP - PADDING_BOTTOM;
  const n = Math.max(1, labels.length);

  const x = (i: number) => PADDING_LEFT + (n === 1 ? chartW / 2 : (chartW * i) / (n - 1));
  const y = (v: number) => PADDING_TOP + chartH - ((v - min) / (max - min)) * chartH;

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => min + ((max - min) * i) / Y_TICKS);

  // Reducir número de labels X si hay muchos (evita solape).
  const labelStep = Math.ceil(n / 6);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {/* Grilla horizontal + etiquetas Y */}
          {yTicks.map((t, i) => (
            <React.Fragment key={`y${i}`}>
              <Line
                x1={PADDING_LEFT}
                y1={y(t)}
                x2={width - PADDING_RIGHT}
                y2={y(t)}
                stroke={commonColors.borderLight}
                strokeWidth={1}
              />
              <SvgText
                x={PADDING_LEFT - 6}
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
                      <Circle key={`d${si}-${i}`} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
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
                y={height - 8}
                fontSize={9}
                fill={commonColors.textTertiary}
                textAnchor="middle"
              >
                {lbl}
              </SvgText>
            ) : null,
          )}
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
