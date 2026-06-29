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
  /** Easings para la Animated API nativa.
   *  `smooth` usa cubic-bezier(0.16, 1, 0.3, 1) — easeOutExpo, suave y
   *  responsivo (el estándar para entradas de UI modernas). */
  easing: {
    enter: Easing.bezier(0.16, 1, 0.3, 1),
    exit: Easing.bezier(0.7, 0, 0.84, 0),
    inOut: Easing.inOut(Easing.cubic),
    smooth: Easing.bezier(0.16, 1, 0.3, 1),
  },
} as const;

export type Animations = typeof animations;
