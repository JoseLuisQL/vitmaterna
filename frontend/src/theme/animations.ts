/**
 * VITMATERNA — Tokens de animación
 *
 * Configuraciones de spring y duraciones para usar con Reanimated
 * (withSpring/withTiming) y con la Animated API nativa. Centralizar estos
 * valores garantiza transiciones consistentes en toda la app.
 */
import { Easing } from 'react-native';

export const animations = {
  /** Spring estándar — entradas de contenido, modales */
  spring: {
    damping: 18,
    stiffness: 280,
    mass: 0.8,
  },
  /** Spring rápido — press de botones, toggles */
  springFast: {
    damping: 20,
    stiffness: 400,
    mass: 0.6,
  },
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
  /** Easings para la Animated API nativa */
  easing: {
    enter: Easing.out(Easing.cubic),
    exit: Easing.in(Easing.cubic),
    inOut: Easing.inOut(Easing.cubic),
  },
} as const;

export type Animations = typeof animations;
