/**
 * VITMATERNA Theme - Barrel Export
 */
export {
  colors,
  gestanteColors,
  obstetraColors,
  adminColors,
  accentColors,
  commonColors,
  semanticColors,
  riskColors,
  dentalColors,
} from './colors';
export { typography, fontFamilies } from './typography';
export type { TypographyStyle } from './typography';
export { spacing, borderRadius, layout } from './spacing';
export { shadows, applyShadow, coloredGlow } from './shadows';
export { animations } from './animations';
export type { Animations } from './animations';
export { gradients, makeGradient } from './gradients';
export type { Gradients, GradientConfig } from './gradients';
export { makeStyles } from './makeStyles';
export { gestanteTheme } from './gestanteTheme';
export type { GestanteTheme } from './gestanteTheme';
export { obstetraTheme } from './obstetraTheme';
export type { ObstetraTheme } from './obstetraTheme';
export {
  useResponsive,
  getBreakpoint,
  resolveResponsive,
  columnsForWidth,
  BREAKPOINTS,
} from './responsive';
export type { Breakpoint, Responsive, ResponsiveInfo } from './responsive';
