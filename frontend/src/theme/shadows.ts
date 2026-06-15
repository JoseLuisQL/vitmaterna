/**
 * VITMATERNA — Elevación (estilo tarjeta blanca flotante)
 *
 * Sombras suaves y azuladas para el look ice-blue. La jerarquía principal
 * son tarjetas blancas flotantes con sombra `card`. En Android se usa
 * `elevation`; en iOS/web una sombra tenue.
 *
 * Tres niveles de elevación consistentes en toda la app:
 *   none · card (default) · float (FAB) · modal (overlays) · coloredGlow(color)
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
  /** Modal / bottom sheet / toast */
  modal: make(SHADOW_BASE, 8, 24, 0.12, 12),
} as const;

export const applyShadow = (preset: ShadowPreset): ViewStyle => ({ ...preset });

/** Sombra coloreada (glow) usando el color del rol o acento. */
export const coloredGlow = (color: string): ViewStyle =>
  make(color, 4, 16, 0.22, 8);
