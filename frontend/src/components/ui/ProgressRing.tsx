/**
 * VITMATERNA - ProgressRing
 * Anillo de progreso SVG animado con valor central. Track gris suave.
 * Tamaños: sm(48) | md(72) | lg(96) o tamaño custom.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RingSize = 'sm' | 'md' | 'lg';

const SIZE_MAP: Record<RingSize, { size: number; stroke: number }> = {
  sm: { size: 48, stroke: 5 },
  md: { size: 72, stroke: 7 },
  lg: { size: 96, stroke: 9 },
};

interface ProgressRingProps {
  /** Progreso 0–100 */
  value: number;
  size?: RingSize | number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Texto central. Si no se pasa, muestra el porcentaje. */
  label?: string;
  sublabel?: string;
  /** Animar el llenado al montar (default true). */
  animated?: boolean;
}

export function ProgressRing({
  value,
  size = 'md',
  strokeWidth,
  color = gestanteColors.primary,
  trackColor = commonColors.surfaceAlt,
  label,
  sublabel,
  animated = true,
}: ProgressRingProps): React.ReactElement {
  const preset = typeof size === 'number' ? null : SIZE_MAP[size];
  const dimension = typeof size === 'number' ? size : preset!.size;
  const stroke = strokeWidth ?? (preset ? preset.stroke : Math.max(4, dimension * 0.1));

  const clamped = Math.max(0, Math.min(100, value));
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = dimension / 2;

  const progress = useSharedValue(animated ? 0 : clamped);

  useEffect(() => {
    progress.value = animated
      ? withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) })
      : clamped;
  }, [clamped, animated, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value / 100),
  }));

  const fontSize = dimension <= 48 ? typography.numericSm : typography.numericMd;

  return (
    <View style={{ width: dimension, height: dimension }}>
      <Svg width={dimension} height={dimension}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[fontSize, { color: commonColors.text }]} numberOfLines={1}>
          {label ?? `${Math.round(clamped)}%`}
        </Text>
        {sublabel ? <Text style={styles.sublabel}>{sublabel}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sublabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
});
