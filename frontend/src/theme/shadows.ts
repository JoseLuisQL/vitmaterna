/**
 * VITMATERNA Shadow System
 * Cross-platform shadow presets for elevation hierarchy.
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
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'ios' ? opacity : 0,
  shadowRadius: Platform.OS === 'ios' ? radius : 0,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  /** No shadow */
  none: createShadow(0, 0, 0, 0),

  /** Subtle lift for interactive elements */
  xs: createShadow(1, 2, 0.05, 1),

  /** Default card shadow */
  sm: createShadow(1, 3, 0.1, 2),

  /** Elevated card shadow */
  md: createShadow(4, 6, 0.1, 4),

  /** Modal/overlay shadow */
  lg: createShadow(10, 15, 0.12, 8),

  /** Floating action button shadow */
  xl: createShadow(20, 25, 0.15, 12),

  /** Button press shadow (reduced) */
  buttonPressed: createShadow(1, 2, 0.06, 1),

  /** Button default shadow */
  button: createShadow(2, 4, 0.1, 3),
} as const;

/** Helper to apply shadow as ViewStyle */
export const applyShadow = (preset: ShadowPreset): ViewStyle => ({
  ...preset,
});
