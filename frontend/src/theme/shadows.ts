/**
 * VITMATERNA — Elevación · "Clinical Calm"
 *
 * Sombras suaves y de tinte teal-grafito para el look sereno de salud. La
 * jerarquía principal son tarjetas blancas flotantes con sombra `card`. En
 * Android se usa `elevation`; en iOS/web una sombra tenue y difusa (radio
 * amplio, opacidad baja) que da profundidad sin "ensuciar" la interfaz.
 *
 * Niveles de elevación consistentes en toda la app:
 *   none · subtle (inputs/filas) · card (default) · float (FAB) · modal · coloredGlow(color)
 */
import { Platform, ViewStyle } from 'react-native';

interface ShadowPreset {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

const SHADOW_BASE = '#16242B';

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

  /** Elevación mínima para inputs, filas de lista y chips. */
  subtle: make(SHADOW_BASE, 1, 6, 0.04, 1),
  /** Tarjeta flotante (default) — difusa y limpia. */
  card: make(SHADOW_BASE, 4, 18, 0.06, 3),
  /** Botón FAB y elementos elevados (glow teal). */
  float: make('#0C8174', 6, 20, 0.18, 8),
  /** Modal / bottom sheet / toast. */
  modal: make(SHADOW_BASE, 12, 32, 0.14, 14),
} as const;

export const applyShadow = (preset: ShadowPreset): ViewStyle => ({ ...preset });

/** Sombra coloreada (glow) usando el color del rol o acento. */
export const coloredGlow = (color: string): ViewStyle =>
  make(color, 6, 18, 0.22, 8);
