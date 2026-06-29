/**
 * Fila — par label/value para datos de la ficha de gestante.
 * Componente presentacional puro extraído del monolito (Fase 3).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonColors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

export function Fila({
  label,
  value,
  isLast = false,
}: {
  label: string;
  value?: string | number | null;
  isLast?: boolean;
}): React.ReactElement | null {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={[styles.row, !isLast && styles.border]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  label: { ...typography.bodySm, color: commonColors.textSecondary, flex: 1, lineHeight: 20 },
  value: {
    ...typography.bodySm,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.text,
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 20,
  },
});

export default Fila;
