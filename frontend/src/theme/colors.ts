/**
 * VITMATERNA Color System
 * Gestante theme (violet) and Obstetra theme (pink)
 * with shared semantic and risk colors.
 */

export const gestanteColors = {
  primary: '#7C3AED',
  primaryLight: '#EDE9FE',
  primaryDark: '#5B21B6',
} as const;

export const obstetraColors = {
  primary: '#DB2777',
  primaryLight: '#FCE7F3',
  primaryDark: '#9D174D',
} as const;

export const commonColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  disabled: '#D1D5DB',
  overlay: 'rgba(0, 0, 0, 0.5)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const semanticColors = {
  success: '#059669',
  successLight: '#D1FAE5',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#2563EB',
  infoLight: '#DBEAFE',
} as const;

export const riskColors = {
  riskGreen: '#10B981',
  riskGreenLight: '#D1FAE5',
  riskYellow: '#F59E0B',
  riskYellowLight: '#FEF3C7',
  riskRed: '#EF4444',
  riskRedLight: '#FEE2E2',
} as const;

export const colors = {
  gestante: gestanteColors,
  obstetra: obstetraColors,
  common: commonColors,
  semantic: semanticColors,
  risk: riskColors,
} as const;
