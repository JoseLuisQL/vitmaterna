/**
 * VITMATERNA - StatusChip Component
 * Chip for appointment/treatment status with automatic color mapping.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface StatusChipProps {
  status: string;
  style?: ViewStyle;
}

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Appointment statuses (English and Spanish)
  scheduled: { bg: semanticColors.infoLight, text: semanticColors.info, label: 'Programada' },
  programada: { bg: semanticColors.infoLight, text: semanticColors.info, label: 'Programada' },
  confirmed: { bg: '#F5F3FF', text: '#7C3AED', label: 'Confirmada' },
  confirmada: { bg: '#F5F3FF', text: '#7C3AED', label: 'Confirmada' },
  completed: { bg: '#D1FAE5', text: '#047857', label: 'Completada' },
  asistida: { bg: '#D1FAE5', text: '#047857', label: 'Asistida' },
  no_asistida: { bg: '#FEE2E2', text: '#DC2626', label: 'No Asistida' },
  reprogramada: { bg: '#FEF3C7', text: '#D97706', label: 'Reprogramada' },
  cancelled: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'Cancelada' },
  cancelada: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'Cancelada' },
  pending: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Pendiente' },
  in_progress: { bg: '#DBEAFE', text: '#1D4ED8', label: 'En Progreso' },

  // Treatment statuses
  active: { bg: semanticColors.successLight, text: semanticColors.success, label: 'Activo' },
  paused: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Pausado' },
  finished: { bg: commonColors.borderLight, text: commonColors.textSecondary, label: 'Finalizado' },

  // Risk levels
  bajo: { bg: '#D1FAE5', text: '#047857', label: 'Bajo' },
  medio: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Medio' },
  alto: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'Alto' },
};

const DEFAULT_STATUS: StatusConfig = {
  bg: commonColors.borderLight,
  text: commonColors.textSecondary,
  label: '',
};

export const StatusChip: React.FC<StatusChipProps> = ({ status, style }) => {
  const config = STATUS_MAP[status.toLowerCase()] || {
    ...DEFAULT_STATUS,
    label: status,
  };

  return (
    <View
      style={[styles.chip, { backgroundColor: config.bg }, style]}
      accessibilityRole="text"
      accessibilityLabel={`Estado: ${config.label}`}
    >
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs + 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
});
