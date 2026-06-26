/**
 * VITMATERNA — Tipos del sistema de tour guiado.
 *
 * Un "tour" es una secuencia de pasos. Cada paso resalta (opcionalmente) un
 * elemento real de la UI mediante su `targetId` y muestra una tarjeta con el
 * texto explicativo. Los pasos pueden filtrarse por plataforma (web/móvil) y
 * pueden navegar a otra ruta antes de resaltar.
 */
import type { Href } from 'expo-router';

/** Rectángulo medido de un elemento en coordenadas de ventana. */
export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** En qué plataforma aplica un paso. Por defecto, ambas. */
export type TourPlatform = 'web' | 'mobile' | 'both';

/** Forma del recorte del spotlight alrededor del target. */
export type SpotlightShape = 'rect' | 'circle';

export interface TourStep {
  /**
   * Id del elemento a resaltar (registrado con `useTourTarget`). Si se omite,
   * el paso se muestra centrado (sin spotlight) — útil para intro/cierre.
   */
  targetId?: string;
  /** Etiqueta corta (overline) encima del título. */
  label?: string;
  /** Título del paso. */
  title: string;
  /** Descripción/cuerpo del paso. */
  description: string;
  /** Plataforma donde aplica el paso. Por defecto 'both'. */
  platform?: TourPlatform;
  /** Forma del recorte. Por defecto 'rect'. */
  shape?: SpotlightShape;
  /**
   * Ruta a la que navegar ANTES de resaltar (expo-router). Útil cuando el
   * target vive en otra pantalla.
   */
  navigateTo?: Href;
}

/** Definición de un tour completo. */
export interface TourDefinition {
  id: string;
  steps: TourStep[];
}

/** API imperativa del controlador del tour (singleton). */
export interface TourControllerApi {
  start: (steps: TourStep[]) => void;
  stop: () => void;
  next: () => void;
  prev: () => void;
}
