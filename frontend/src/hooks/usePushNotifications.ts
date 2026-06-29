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
import { resolveNotificationTarget, type NotificationData } from '../navigation/notificationRoutes';

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

        // Navega al destino de una notificación (vista específica por payload o
        // bandeja del rol). Comparte la MISMA lógica que la bandeja in-app.
        const navigateTo = (data: NotificationData) => {
          const target = resolveNotificationTarget(roleRef.current, data);
          if (!target) return;
          try {
            router.push(target as never);
          } catch {
            // Ruta no disponible: ignorar silenciosamente.
          }
        };

        // ARRANQUE EN FRÍO: si la app se abrió tocando una notificación estando
        // cerrada, el listener no captura ese toque. Recuperamos la última
        // respuesta y navegamos a su destino (deep link por payload).
        try {
          const last = await Notifications.getLastNotificationResponseAsync();
          if (!cancelled && last) {
            const data = (last.notification.request.content.data || {}) as NotificationData;
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            navigateTo(data);
          }
        } catch {
          // No disponible o sin respuesta previa: continuar.
        }

        if (cancelled) return;

        // Al RECIBIR una notificación: refrescar el contador y la lista.
        receivedSub = Notifications.addNotificationReceivedListener(() => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        });

        // Al TOCAR una notificación (app en foreground/background): navegar.
        responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
          const data = (response.notification.request.content.data || {}) as NotificationData;
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          navigateTo(data);
        });
      } catch (e) {
        if (__DEV__) console.log('Push notifications no disponibles:', e);
      }
    })();

    return () => {
      cancelled = true;
      receivedSub?.remove();
      responseSub?.remove();
    };
  }, [isAuthenticated, queryClient, router]);
}
