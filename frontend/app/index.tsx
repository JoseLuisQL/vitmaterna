/**
 * VITMATERNA — Pantalla inicial (splash + redirección por rol).
 *
 * Muestra la pantalla de carga profesional con el logo oficial y, una vez
 * resuelta la sesión, redirige al área que corresponde según el rol.
 */
import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { SplashScreen } from '../src/components/ui/SplashScreen';

export default function IndexScreen(): React.ReactElement {
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    // Breve permanencia del splash para que la animación se perciba (pulido
    // visual), luego redirige según el estado de sesión y el rol.
    const timeout = setTimeout(() => {
      if (isAuthenticated && user) {
        if (user.role === 'gestante') {
          router.replace('/(gestante)/(tabs)');
        } else if (user.role === 'admin') {
          router.replace('/(admin)/(tabs)' as any);
        } else {
          router.replace('/(obstetra)/(tabs)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }, 1100);

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, isInitialized, router]);

  return <SplashScreen />;
}
