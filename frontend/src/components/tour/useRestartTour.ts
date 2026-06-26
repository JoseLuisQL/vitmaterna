/**
 * VITMATERNA — useRestartTour
 *
 * Devuelve una función para re-lanzar el tour guiado del rol actual (p. ej.
 * desde "Ver el recorrido de nuevo" en Perfil). Navega primero al inicio del
 * rol (donde viven los targets) y, tras un breve margen para que monten, lanza
 * el tour.
 */
import { useCallback } from 'react';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import type { UserRole } from '../../types/user';
import { startTour } from './tourController';
import { tourStepsForRole } from './steps';

const HOME_BY_ROLE: Record<UserRole, Href> = {
  gestante: '/(gestante)/(tabs)',
  obstetra: '/(obstetra)/(tabs)',
  admin: '/(admin)/(tabs)' as Href,
};

export function useRestartTour(): () => void {
  const role = useAuthStore((s) => s.user?.role) as UserRole | undefined;

  return useCallback(() => {
    const home = role ? HOME_BY_ROLE[role] : null;
    if (home) {
      try {
        router.navigate(home as any);
      } catch {
        /* si la navegación falla, igual intentamos lanzar el tour */
      }
    }
    // Margen para que el inicio monte y registre sus targets.
    setTimeout(() => startTour(tourStepsForRole(role)), 350);
  }, [role]);
}
