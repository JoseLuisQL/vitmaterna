/**
 * VITMATERNA - ChartBar
 * Gráfica de barras clara y precisa con react-native-svg: grilla horizontal de
 * referencia, etiquetas del eje Y, barras redondeadas con animación de llenado,
 * valor opcional encima de cada barra y etiquetas del eje X. Reemplaza
 * react-native-chart-kit para casos simples.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { chartTokens } from '../../theme/charts';
import { useReducedMotion } from '../../theme/motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface ChartBarDatum {
  label: string;
  value: number;
  /** Color de la barra (sobrescribe el color global). */
  color?: string;
}

interface ChartBarProps {
  data: ChartBarDatum[];
  /** Altura del área de barras (sin etiquetas). */
  height?: number;
  color?: string;
  /** Máximo del eje. Si no se pasa, usa el mayor valor (mín 1). */
  maxValue?: number;
  /** Muestra el valor encima de cada barra. */
  showValues?: boolean;
  /** Muestra grilla horizontal + etiquetas del eje Y (default true). */
  showGrid?: boolean;
  /** Sufijo de las etiquetas del eje Y (p. ej. '%'). */
  yUnit?: string;
  style?: ViewStyle;
}

const PADDING_LEFT = 30;
const PADDING_RIGHT = 6;
const VALUE_SPACE = 16; // espacio reservado arriba para el valor
const Y_TICKS = 4;

interface AnimatedBarProps {
  x: number;
  barWidth: number;
  top: number;
  fullHeight: number;
  ratio: number;
  color: string;
}

function AnimatedBar({ x, barWidth, top, fullHeight, ratio, color }: AnimatedBarProps) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    // Con reduce-motion activado: salto instantáneo al valor final (sin animación).
    progress.value = reduceMotion
      ? ratio
      : withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress, reduceMotion]);

  const animatedProps = useAnimatedProps(() => {
    const h = Math.max(0, fullHeight * progress.value);
    return { y: top + fullHeight - h, height: h };
  });

  return (
    <>
      <Rect x={x} y={top} width={barWidth} height={fullHeight} rx={chartTokens.barRadius} fill={commonColors.surfaceAlt} />
      <AnimatedRect x={x} width={barWidth} rx={chartTokens.barRadius} fill={color} animatedProps={animatedProps} />
    </>
  );
}

export function ChartBar({
  data,
  height = 160,
  color = gestanteColors.primary,
  maxValue,
  showValues = false,
  showGrid = true,
  yUnit = '',
  style,
}: ChartBarProps): React.ReactElement {
  const [width, setWidth] = React.useState(0);
  const max = Math.max(1, maxValue ?? Math.max(...data.map((d) => d.value), 1));
  const n = Math.max(1, data.length);

  const left = showGrid ? PADDING_LEFT : 0;
  const top = showValues ? VALUE_SPACE : 4;
  const plotW = Math.max(0, width - left - PADDING_RIGHT);
  const plotH = Math.max(0, height - top);
  const slot = plotW / n;
  const barWidth = Math.min(28, slot * 0.5);

  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, i) => (max * i) / Y_TICKS);
  const yPos = (v: number) => top + plotH - (v / max) * plotH;

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            {/* Grilla horizontal + etiquetas eje Y */}
            {showGrid &&
              yTicks.map((t, i) => (
                <React.Fragment key={`y${i}`}>
                  <Line
                    x1={left}
                    y1={yPos(t)}
                    x2={width - PADDING_RIGHT}
                    y2={yPos(t)}
                    stroke={chartTokens.gridStroke}
                    strokeWidth={chartTokens.axisStrokeWidth}
                  />
                  <SvgText x={left - 6} y={yPos(t) + 3} fontSize={chartTokens.axisFontSize} fill={chartTokens.axisColor} textAnchor="end">
                    {`${Math.round(t)}${yUnit}`}
                  </SvgText>
                </React.Fragment>
              ))}

            {/* Barras */}
            {data.map((d, i) => {
              const x = left + i * slot + (slot - barWidth) / 2;
              return (
                <AnimatedBar
                  key={i}
                  x={x}
                  barWidth={barWidth}
                  top={top}
                  fullHeight={plotH}
                  ratio={d.value / max}
                  color={d.color ?? color}
                />
              );
            })}

            {/* Valor encima de cada barra */}
            {showValues &&
              data.map((d, i) => {
                const cx = left + i * slot + slot / 2;
                const vy = Math.max(10, yPos(d.value) - 5);
                return (
                  <SvgText key={`v${i}`} x={cx} y={vy} fontSize={10} fontWeight="700" fill={commonColors.text} textAnchor="middle">
                    {`${d.value}${yUnit}`}
                  </SvgText>
                );
              })}
          </Svg>

          {/* Etiquetas eje X */}
          <View style={[styles.labels, { paddingLeft: left, paddingRight: PADDING_RIGHT }]}>
            {data.map((d, i) => (
              <View key={i} style={[styles.labelCol, { width: slot }]}>
                <Text style={styles.label} numberOfLines={1}>
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  labelCol: { alignItems: 'center' },
  label: { ...typography.caption, color: commonColors.textSecondary },
});
