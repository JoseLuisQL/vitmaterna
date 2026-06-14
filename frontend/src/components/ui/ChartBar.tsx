/**
 * VITMATERNA - ChartBar
 * Gráfica de barras con react-native-svg: barras redondeadas con track gris
 * detrás, animación de llenado al montar y etiquetas debajo. Reemplaza
 * react-native-chart-kit para casos simples.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

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
  style?: ViewStyle;
}

interface AnimatedBarProps {
  x: number;
  barWidth: number;
  fullHeight: number;
  ratio: number;
  color: string;
}

function AnimatedBar({ x, barWidth, fullHeight, ratio, color }: AnimatedBarProps) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(ratio, { duration: 600, easing: Easing.out(Easing.cubic) });
  }, [ratio, progress]);

  const animatedProps = useAnimatedProps(() => {
    const h = Math.max(0, fullHeight * progress.value);
    return { y: fullHeight - h, height: h };
  });

  return (
    <>
      <Rect
        x={x}
        y={0}
        width={barWidth}
        height={fullHeight}
        rx={barWidth / 2}
        fill={commonColors.surfaceAlt}
      />
      <AnimatedRect
        x={x}
        width={barWidth}
        rx={barWidth / 2}
        fill={color}
        animatedProps={animatedProps}
      />
    </>
  );
}

export function ChartBar({
  data,
  height = 160,
  color = gestanteColors.primary,
  maxValue,
  showValues = false,
  style,
}: ChartBarProps): React.ReactElement {
  const [width, setWidth] = React.useState(0);
  const max = Math.max(1, maxValue ?? Math.max(...data.map((d) => d.value), 1));
  const n = Math.max(1, data.length);
  const slot = width / n;
  const barWidth = Math.min(28, slot * 0.5);

  return (
    <View style={style} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            {data.map((d, i) => {
              const x = i * slot + (slot - barWidth) / 2;
              return (
                <AnimatedBar
                  key={i}
                  x={x}
                  barWidth={barWidth}
                  fullHeight={height}
                  ratio={d.value / max}
                  color={d.color ?? color}
                />
              );
            })}
          </Svg>
          <View style={styles.labels}>
            {data.map((d, i) => (
              <View key={i} style={[styles.labelCol, { width: slot }]}>
                {showValues ? (
                  <Text style={styles.value} numberOfLines={1}>
                    {d.value}
                  </Text>
                ) : null}
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
  value: { ...typography.label, color: commonColors.text, marginBottom: 2 },
});
