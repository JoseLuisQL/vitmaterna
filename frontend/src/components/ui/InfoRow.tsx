/**
 * VITMATERNA - InfoRow
 * Fila etiqueta/valor con divisor opcional. Para fichas de datos.
 *   <InfoRow label="Semana EG" value="28" />
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface InfoRowProps {
  label: string;
  value?: string | number | null;
  /** Elemento custom a la derecha (badge, etc.). */
  right?: React.ReactNode;
  divider?: boolean;
  valueColor?: string;
  style?: ViewStyle;
}

export function InfoRow({
  label,
  value,
  right,
  divider = true,
  valueColor,
  style,
}: InfoRowProps): React.ReactElement {
  return (
    <View style={[styles.row, divider && styles.divider, style]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {right ?? (
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : null]}
          numberOfLines={1}
        >
          {value === null || value === undefined || value === '' ? '—' : value}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  label: { ...typography.bodySm, color: commonColors.textSecondary, flexShrink: 1 },
  value: { ...typography.bodyMd, color: commonColors.text, textAlign: 'right', flexShrink: 1 },
});
