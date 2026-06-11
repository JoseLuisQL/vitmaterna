/**
 * VITMATERNA — Elevación (minimalista)
 *
 * Sombras muy sutiles: la jerarquía se logra con espacio, borde y superficie,
 * no con sombras pesadas. En Android se usa una elevación mínima; en iOS y web
 * una sombra tenue. Para tarjetas se prefiere borde 1px + superficie.
 */
import { Platform, ViewStyle } from 'react-native';

interface ShadowPreset {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const createShadow = (
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ShadowPreset => ({
  shadowColor: '#1C1B19',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'android' ? 0 : opacity,
  shadowRadius: Platform.OS === 'android' ? 0 : radius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  none: createShadow(0, 0, 0, 0),
  /** Tarjetas: elevación apenas perceptible */
  xs: createShadow(1, 2, 0.04, 1),
  sm: createShadow(2, 4, 0.05, 2),
  /** Elementos flotantes (FAB, modales) */
  md: createShadow(4, 10, 0.08, 4),
  lg: createShadow(8, 20, 0.10, 6),
  // Alias de compatibilidad
  xl: createShadow(8, 20, 0.10, 6),
  button: createShadow(0, 0, 0, 0),
  buttonPressed: createShadow(0, 0, 0, 0),
} as const;

export const applyShadow = (preset: ShadowPreset): ViewStyle => ({ ...preset });
