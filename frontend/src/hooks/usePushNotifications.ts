/**
 * VITMATERNA — Recepción de notificaciones push (Expo).
 *
 * Configura cómo se muestran las notificaciones en primer plano y registra
 * listeners para:
 *  - actualizar el badge de no leídas al recibir una notificación, y
 *  - navegar a la pantalla relevante (deep-link) cuando el usuario toca una.
 *
 * No hace nada en web ni en Expo Go (push requiere build nativo).
 */
import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { pushSupported } from '../utils/pushEnv';

/** Decide a qué ruta llevar según el tipo/datos de la notificación. */
function routeForNotification(role: string | undefined, data: Record<string, any>): string | null {
  const tipo = data?.tipo as string | undefined;

  // Notificaciones relativas a citas.
  if (
    tipo &&
    ['cita_confirmada', 'solicitud_reprogramacion', 'reprogramacion_aprobada', 'reprogramacion_rechazada', 'inasistencia'].includes(
      tipo,
    )
  ) {
    if (role === 'obstetra') return '/(obstetra)/(tabs)/cronograma';
    if (role === 'gestante') return '/(gestante)/(tabs)/citas';
  }

  // Signo de alarma / emergencia → el obstetra va a su bandeja/alertas.
  if (tipo === 'signo_alarma' || data?.dangerSignId) {
    if (role === 'obstetra') return '/(obstetra)/(tabs)/alertas';
  }

  // Recordatorio de suplemento → tratamiento de la gestante.
  if (tipo === 'recordatorio_suplemento') {
    if (role === 'gestante') return '/(gestante)/(tabs)/tratamiento';
  }

  // Por defecto, abrir la bandeja de notificaciones del rol.
  if (role === 'obstetra') return '/(obstetra)/notificaciones';
  if (role === 'gestante') return '/(gestante)/notificaciones';
  return null;
}

export function usePushNotifications(): void {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const roleRef = useRef<string | undefined>(user?.role);
  roleRef.current = user?.role;

  useEffect(() => {
    // Push no aplica en web, en Expo Go (importar el módulo allí falla), ni sin sesión.
    if (!pushSupported || !isAuthenticated) return;

    let receivedSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');

        // Mostrar la notificación aunque la app esté en primer plano.
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });

        if (cancelled) return;

        // Al RECIBIR una notificación: refrescar el contador y la lista.
        receivedSub = Notifications.addNotificationReceivedListener(() => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });

        // Al TOCAR una notificación: navegar a la pantalla relevante.
        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = (response.notification.request.content.data || {}) as Record<string, any>;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          const target = routeForNotification(roleRef.current, data);
          if (target) {
            try {
              router.push(target as never);
            } catch {
              // Ruta no disponible: ignorar silenciosamente.
            }
          }
        });
      } catch (e) {
        console.log('Push notifications no disponibles:', e);
      }
    })();

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [isAuthenticated, queryClient, router]);
}
