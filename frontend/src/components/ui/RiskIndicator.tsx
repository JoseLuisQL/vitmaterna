/**
 * VITMATERNA - RiskIndicator
 * Barra horizontal tricolor (verde/ámbar/rojo) con marcador en la posición del
 * nivel de riesgo. Visual-only; siempre acompañar con etiqueta de texto.
 */
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { commonColors, riskColors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';

export type RiskLevel = 'verde' | 'amarillo' | 'rojo' | 'bajo' | 'medio' | 'moderado' | 'alto';

interface RiskIndicatorProps {
  level: RiskLevel;
  height?: number;
  style?: ViewStyle;
}

function normalize(level: RiskLevel): 0 | 1 | 2 {
  if (level === 'verde' || level === 'bajo') return 0;
  if (level === 'amarillo' || level === 'medio' || level === 'moderado') return 1;
  return 2;
}

export function RiskIndicator({
  level,
  height = 6,
  style,
}: RiskIndicatorProps): React.ReactElement {
  const idx = normalize(level);
  // Posición del marcador centrada en cada tercio: 16.6% / 50% / 83.3%
  const positions = ['16.66%', '50%', '83.33%'] as const;

  return (
    <View style={[styles.container, { height }, style]}>
      <View style={styles.track}>
        <View style={[styles.seg, { backgroundColor: riskColors.riskGreen }]} />
        <View style={[styles.seg, { backgroundColor: riskColors.riskYellow }]} />
        <View style={[styles.seg, { backgroundColor: riskColors.riskRed }]} />
      </View>
      <View
        style={[
          styles.marker,
          {
            left: positions[idx],
            width: height + 4,
            height: height + 4,
            borderRadius: borderRadius.full,
            marginLeft: -(height + 4) / 2,
            top: -2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
  track: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  seg: { flex: 1, height: '100%' },
  marker: {
    position: 'absolute',
    backgroundColor: commonColors.surface,
    borderWidth: 2,
    borderColor: commonColors.text,
  },
});
