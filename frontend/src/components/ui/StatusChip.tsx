/**
 * VITMATERNA - StatusChip Component
 * Chip for appointment/treatment status with automatic color mapping.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { commonColors, gestanteColors, semanticColors } from '../../theme/colors';
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
  confirmed: { bg: gestanteColors.primaryLight, text: gestanteColors.primary, label: 'Confirmada' },
  confirmada: { bg: gestanteColors.primaryLight, text: gestanteColors.primary, label: 'Confirmada' },
  completed: { bg: semanticColors.successLight, text: semanticColors.success, label: 'Completada' },
  asistida: { bg: semanticColors.successLight, text: semanticColors.success, label: 'Asistida' },
  no_asistida: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'No Asistida' },
  solicitud_reprogramacion: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Solicitud enviada' },
  reprogramada: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Reprogramada' },
  cancelled: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'Cancelada' },
  cancelada: { bg: semanticColors.dangerLight, text: semanticColors.danger, label: 'Cancelada' },
  pending: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Pendiente' },
  in_progress: { bg: semanticColors.infoLight, text: semanticColors.info, label: 'En Progreso' },

  // Treatment statuses
  active: { bg: semanticColors.successLight, text: semanticColors.success, label: 'Activo' },
  paused: { bg: semanticColors.warningLight, text: semanticColors.warning, label: 'Pausado' },
  finished: { bg: commonColors.borderLight, text: commonColors.textSecondary, label: 'Finalizado' },

  // Risk levels
  bajo: { bg: semanticColors.successLight, text: semanticColors.success, label: 'Bajo' },
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
