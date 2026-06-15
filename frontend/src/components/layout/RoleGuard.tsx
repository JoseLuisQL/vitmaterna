/**
 * VITMATERNA — RoleGuard (protección de rutas por rol)
 *
 * Defensa en profundidad en el frontend: aunque el backend valida cada
 * petición, las áreas por rol no deben ser navegables por un usuario de otro
 * rol (p. ej. vía deep-link). Este guard:
 *   - Espera a que la sesión esté inicializada (loadStoredAuth).
 *   - Si no hay sesión → redirige a login.
 *   - Si el rol no coincide con el área → redirige al área correcta del usuario.
 *
 * Se coloca dentro de cada `_layout.tsx` de rol envolviendo el Stack.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import type { Href } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { LoadingScreen } from '../ui/LoadingScreen';
import type { UserRole } from '../../types/user';

/** Ruta de inicio para cada rol. */
const HOME_BY_ROLE: Record<UserRole, Href> = {
  gestante: '/(gestante)/(tabs)',
  obstetra: '/(obstetra)/(tabs)',
  admin: '/(admin)/(tabs)' as Href,
};

interface RoleGuardProps {
  /** Rol requerido para acceder a esta área. */
  allow: UserRole;
  children: React.ReactNode;
}

export function RoleGuard({ allow, children }: RoleGuardProps): React.ReactElement {
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  // Mientras se restaura la sesión, mostrar carga (evita parpadeos/redirección
  // prematura).
  if (!isInitialized) {
    return <LoadingScreen message="Cargando..." />;
  }

  // Sin sesión → login.
  if (!isAuthenticated || !role) {
    return <Redirect href="/(auth)/login" />;
  }

  // Rol distinto al del área → enviar a su propia área.
  if (role !== allow) {
    return <Redirect href={HOME_BY_ROLE[role]} />;
  }

  return <>{children}</>;
}

export default RoleGuard;
