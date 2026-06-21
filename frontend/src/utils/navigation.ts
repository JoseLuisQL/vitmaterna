/**
 * VITMATERNA — Navegación segura "volver".
 *
 * En web (deep-link, recarga o entrada directa por URL) la pila de navegación
 * puede estar vacía: llamar a `router.back()` ahí dispara el warning
 * "The action 'GO_BACK' was not handled by any navigator". Este helper vuelve
 * solo si hay historial; si no, navega a una ruta de respaldo (por rol).
 */
import type { useRouter, Href } from 'expo-router';
import type { UserRole } from '../types/user';

type Router = ReturnType<typeof useRouter>;

/** Ruta de inicio por rol (respaldo cuando no hay a dónde volver). */
export const HOME_BY_ROLE: Record<UserRole, Href> = {
  gestante: '/(gestante)/(tabs)' as Href,
  obstetra: '/(obstetra)/(tabs)' as Href,
  admin: '/(admin)/(tabs)' as Href,
};

/**
 * Vuelve a la pantalla anterior de forma segura.
 * @param router    instancia de useRouter()
 * @param fallback  ruta a la que ir si no hay historial (default: raíz "/").
 */
export function goBack(router: Router, fallback: Href = '/' as Href): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
