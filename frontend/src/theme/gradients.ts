/**
 * VITMATERNA — Gradientes para expo-linear-gradient
 *
 * Configuraciones por rol y estados. Cada entrada provee `colors` (y
 * opcionalmente start/end) lista para esparcir en <LinearGradient {...} />.
 */
import { gestanteColors, obstetraColors, adminColors, semanticColors } from './colors';

interface GradientConfig {
  colors: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
}

const diagonal = { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } } as const;

export const gradients = {
  gestante: { colors: gestanteColors.gradient, ...diagonal } as GradientConfig,
  obstetra: { colors: obstetraColors.gradient, ...diagonal } as GradientConfig,
  admin: { colors: adminColors.gradient, ...diagonal } as GradientConfig,

  /** Header de alarmas / emergencia */
  danger: {
    colors: ['#FF6B6B', semanticColors.danger] as const,
    ...diagonal,
  } as GradientConfig,

  /** Fade sutil ice-blue → blanco para fondos de header flat */
  iceFade: {
    colors: ['#EEF2F8', '#FFFFFF'] as const,
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  } as GradientConfig,
} as const;

/** Helper: construye un gradiente diagonal a partir de dos colores. */
export const makeGradient = (
  from: string,
  to: string,
): GradientConfig => ({ colors: [from, to], ...diagonal });

export type Gradients = typeof gradients;
export type { GradientConfig };
