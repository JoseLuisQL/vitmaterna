import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface DiagnosisPillProps {
  label: string;
  /** Color del punto indicador. Por defecto naranja (pendiente). */
  dotColor?: string;
  style?: ViewStyle;
}

/**
 * Tag de diagnóstico tipo pill: punto de color + texto abreviado.
 */
export function DiagnosisPill({ label, dotColor = semanticColors.warning, style }: DiagnosisPillProps): React.ReactElement {
  return (
    <View style={[styles.pill, style]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    alignSelf: 'flex-start',
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { ...typography.caption, color: commonColors.text },
});
