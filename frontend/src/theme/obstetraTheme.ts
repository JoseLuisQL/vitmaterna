/**
 * VITMATERNA - Obstetra Theme
 * Complete theme object for the obstetrician role.
 * Uses pink as the primary color.
 */
import { obstetraColors, commonColors, semanticColors, riskColors } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, layout } from './spacing';
import { shadows } from './shadows';

export const obstetraTheme = {
  colors: {
    ...commonColors,
    ...semanticColors,
    ...riskColors,
    primary: obstetraColors.primary,
    primaryLight: obstetraColors.primaryLight,
    primaryDark: obstetraColors.primaryDark,
  },
  typography,
  spacing,
  borderRadius,
  layout,
  shadows,
} as const;

export type ObstetraTheme = typeof obstetraTheme;
