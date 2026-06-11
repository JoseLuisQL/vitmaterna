import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface CircularProgressProps {
  /** Progreso 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Texto central. Si no se pasa, muestra el porcentaje. */
  label?: string;
  sublabel?: string;
}

/**
 * Barra circular de progreso (anillo SVG) con valor central.
 */
export function CircularProgress({
  value,
  size = 120,
  strokeWidth = 12,
  color = gestanteColors.primary,
  trackColor = commonColors.surfaceAlt,
  label,
  sublabel,
}: CircularProgressProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={[styles.value, { color: commonColors.text }]}>{label ?? `${Math.round(clamped)}%`}</Text>
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
  value: { ...typography.h2 },
  sublabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
});
