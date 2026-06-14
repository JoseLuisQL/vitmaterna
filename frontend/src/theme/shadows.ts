/**
 * VITMATERNA — Elevación (estilo tarjeta blanca flotante)
 *
 * Sombras suaves y azuladas para el look ice-blue. La jerarquía principal
 * son tarjetas blancas flotantes con sombra `card`. En Android se usa
 * `elevation`; en iOS/web una sombra tenue.
 *
 * Presets nuevos: card · float · modal · coloredGlow(color)
 * Alias legacy: none · xs · sm · md · lg · xl · button · buttonPressed
 */
import { Platform, ViewStyle } from 'react-native';

interface ShadowPreset {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const SHADOW_BASE = '#1E2A3A';

const make = (
  color: string,
  offsetY: number,
  radius: number,
  opacity: number,
  elevation: number,
): ShadowPreset => ({
  shadowColor: color,
  shadowOffset: { width: 0, height: offsetY },
  shadowOpacity: Platform.OS === 'android' ? 0 : opacity,
  shadowRadius: Platform.OS === 'android' ? 0 : radius,
  elevation: Platform.OS === 'android' ? elevation : 0,
});

export const shadows = {
  none: make(SHADOW_BASE, 0, 0, 0, 0),

  /** Tarjeta flotante estilo referencia (default) */
  card: make(SHADOW_BASE, 2, 12, 0.06, 3),
  /** Botón FAB y elementos elevados (glow azul) */
  float: make('#3A86FF', 4, 16, 0.2, 8),
  /** Modal / bottom sheet */
  modal: make(SHADOW_BASE, 8, 24, 0.12, 12),

  // ---- Alias legacy (compatibilidad) ----
  xs: make(SHADOW_BASE, 1, 2, 0.04, 1),
  sm: make(SHADOW_BASE, 2, 4, 0.05, 2),
  md: make(SHADOW_BASE, 2, 12, 0.06, 3),
  lg: make(SHADOW_BASE, 8, 20, 0.1, 6),
  xl: make(SHADOW_BASE, 8, 24, 0.12, 12),
  button: make(SHADOW_BASE, 0, 0, 0, 0),
  buttonPressed: make(SHADOW_BASE, 0, 0, 0, 0),
} as const;

export const applyShadow = (preset: ShadowPreset): ViewStyle => ({ ...preset });

/** Sombra coloreada (glow) usando el color del rol o acento. */
export const coloredGlow = (color: string): ViewStyle =>
  make(color, 4, 16, 0.22, 8);
