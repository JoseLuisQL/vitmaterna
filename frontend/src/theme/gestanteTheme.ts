/**
 * VITMATERNA - Gestante Theme
 * Complete theme object for the pregnant patient role.
 * Uses violet as the primary color.
 */
import { gestanteColors, commonColors, semanticColors, riskColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, layout } from './spacing';
import { shadows } from './shadows';

export const gestanteTheme = {
  colors: {
    ...commonColors,
    ...semanticColors,
    ...riskColors,
    primary: gestanteColors.primary,
    primaryLight: gestanteColors.primaryLight,
    primaryDark: gestanteColors.primaryDark,
  },
  typography,
  spacing,
  borderRadius,
  layout,
  shadows,
} as const;

export type GestanteTheme = typeof gestanteTheme;
