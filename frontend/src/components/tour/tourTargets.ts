/**
 * VITMATERNA — Registro de objetivos del tour (targets).
 *
 * Las pantallas registran elementos resaltables con `useTourTarget(id)` y le
 * pasan el `ref` resultante a la vista que quieren resaltar. El motor del tour
 * resuelve el id a un rectángulo medido (en coordenadas de ventana) de forma
 * cross-platform:
 *   - Nativo: `measureInWindow` del nodo.
 *   - Web: `getBoundingClientRect` del nodo del DOM.
 *
 * Mantiene un mapa global id → ref. No usa estado de React: es un registro
 * ligero consultado bajo demanda por el TourHost al cambiar de paso.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import type { TargetRect } from './types';

type AnyRef = { current: any };

const registry = new Map<string, AnyRef>();

/** Registra (o reemplaza) el ref asociado a un id de target. */
export function registerTarget(id: string, ref: AnyRef): void {
  registry.set(id, ref);
}

/** Elimina el registro de un id (al desmontar la pantalla). */
export function unregisterTarget(id: string, ref: AnyRef): void {
  // Solo borrar si sigue apuntando al mismo ref (evita carreras de montaje).
  if (registry.get(id) === ref) registry.delete(id);
}

/** ¿Hay un target registrado para este id? */
export function hasTarget(id: string): boolean {
  return registry.has(id);
}

/**
 * Mide el rectángulo (coordenadas de ventana) del target. Resuelve a null si
 * el target no está registrado o no se puede medir (p. ej. aún no montado).
 */
export function measureTarget(id: string): Promise<TargetRect | null> {
  const ref = registry.get(id);
  const node = ref?.current;
  if (!node) return Promise.resolve(null);

  if (Platform.OS === 'web') {
    try {
      // En react-native-web el ref expone el nodo del DOM (o lo encontramos).
      const dom: any =
        typeof node.getBoundingClientRect === 'function'
          ? node
          : (node as any)._nativeTag ?? null;
      if (dom && typeof dom.getBoundingClientRect === 'function') {
        const r = dom.getBoundingClientRect();
        if (!r || (r.width === 0 && r.height === 0)) return Promise.resolve(null);
        return Promise.resolve({ x: r.x, y: r.y, width: r.width, height: r.height });
      }
    } catch {
      /* cae a measureInWindow abajo */
    }
  }

  return new Promise<TargetRect | null>((resolve) => {
    if (typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    try {
      node.measureInWindow((x: number, y: number, width: number, height: number) => {
        if (width === 0 && height === 0) {
          resolve(null);
          return;
        }
        resolve({ x, y, width, height });
      });
    } catch {
      resolve(null);
    }
  });
}

/**
 * Hook para marcar un elemento como objetivo del tour. Devuelve un ref que se
 * pasa al componente a resaltar:
 *
 *   const ref = useTourTarget('gestante-home-ribbon');
 *   <View ref={ref}>…</View>
 *
 * El registro se limpia al desmontar.
 */
export function useTourTarget(id: string): AnyRef {
  const ref = useRef<any>(null);
  useEffect(() => {
    registerTarget(id, ref);
    return () => unregisterTarget(id, ref);
  }, [id]);
  return ref;
}
