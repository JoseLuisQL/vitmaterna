/**
 * VITMATERNA — Controlador del tour (singleton imperativo).
 *
 * Igual que `confirm.ts`/`ConfirmHost`: el `TourHost` se registra al montarse y
 * cualquier parte de la app puede lanzar el tour con `startTour(steps)` sin
 * acoplarse al árbol de componentes. Si el host no está montado, las llamadas
 * se ignoran con seguridad.
 */
import type { TourControllerApi, TourStep } from './types';

let host: TourControllerApi | null = null;

/** Registra el host global (lo llama TourHost al montarse). */
export function _registerTourHost(api: TourControllerApi | null): void {
  host = api;
}

/** Lanza el tour con la lista de pasos dada. No-op si no hay host. */
export function startTour(steps: TourStep[]): void {
  host?.start(steps);
}

/** Detiene el tour si está activo. */
export function stopTour(): void {
  host?.stop();
}

/** Avanza al siguiente paso. */
export function nextTourStep(): void {
  host?.next();
}

/** Retrocede al paso anterior. */
export function prevTourStep(): void {
  host?.prev();
}
