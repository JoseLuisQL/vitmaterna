/**
 * VITMATERNA — Tokens de movimiento (capa semántica sobre `animations`)
 *
 * `animations.ts` define los valores crudos (springs, duraciones, easings).
 * Este módulo les pone NOMBRES por intención de uso, para que cada interacción
 * de la app hable el mismo lenguaje de movimiento, y añade el respeto a
 * "reduce motion" (accesibilidad).
 *
 * Filosofía (de la guía de diseño): el movimiento sirve al contenido, no
 * decora. Un gesto memorable (el indicador activo de navegación) + micro-
 * interacciones discretas. Nada de animación gratuita.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { animations } from './animations';

export const motion = {
  /** Aparición de superficies (modal, bottom sheet): scale 0.96→1 + fade. */
  surface: { duration: 180, scaleFrom: 0.96 },
  /** Entrada/salida de toast (deslizamiento vertical + fade). */
  toast: { duration: 220, translate: 120 },
  /** Press de controles (botón, tarjeta): spring corto. */
  press: animations.springFast,
  /** Desplazamiento del indicador activo de navegación (la "firma"). */
  indicator: animations.spring,
  /** Transiciones de contenido genéricas. */
  content: { duration: animations.duration.normal },
  /** Micro-cargas y cambios de estado rápidos. */
  fast: { duration: animations.duration.fast },
} as const;

/**
 * Indica si el usuario pidió reducir el movimiento. Las animaciones deben
 * volverse instantáneas (duración 0 / sin spring) cuando esto es true.
 *
 * En web se resuelve de forma síncrona con matchMedia; en nativo se consulta
 * de forma asíncrona vía AccessibilityInfo (usar el hook para reactividad).
 */
export function prefersReducedMotionSync(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.matchMedia) {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
      return false;
    }
  }
  return false;
}

/** Versión asíncrona para nativo (iOS/Android). */
export async function prefersReducedMotion(): Promise<boolean> {
  if (Platform.OS === 'web') return prefersReducedMotionSync();
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/**
 * Hook reactivo: indica si el usuario pidió reducir el movimiento y se
 * actualiza si cambia la preferencia del sistema. Las animaciones deben
 * volverse instantáneas cuando devuelve true.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotionSync());

  useEffect(() => {
    let mounted = true;
    prefersReducedMotion().then((v) => {
      if (mounted) setReduced(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      if (mounted) setReduced(Boolean(v));
    });
    return () => {
      mounted = false;
      // RN >= 0.65 devuelve un objeto con remove(); guardas por compatibilidad.
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  return reduced;
}

export type Motion = typeof motion;
