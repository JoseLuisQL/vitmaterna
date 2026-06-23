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

  // Emergencia (botón de pánico) → el obstetra entra DIRECTO a la conversación
  // de esa gestante (donde actúa), no a la bandeja.
  if (tipo === 'emergencia') {
    if (role === 'obstetra') {
      const conv = data?.conversationId as string | undefined;
      const gid = data?.gestanteId as string | undefined;
      const qs = conv ? `?conversationId=${conv}` : gid ? `?gestanteId=${gid}` : '';
      return `/(obstetra)/(tabs)/chat${qs}`;
    }
  }

  // Signo de alarma → el obstetra va a la ficha de la gestante (sección
  // Alarmas) si viene el id; si no, a la lista de gestantes.
  if (tipo === 'signo_alarma' || data?.dangerSignId) {
    if (role === 'obstetra') {
      const gid = data?.gestanteId as string | undefined;
      return gid ? `/(obstetra)/gestante/${gid}` : '/(obstetra)/(tabs)/gestantes';
    }
  }

  // Recordatorio de suplemento → tratamiento de la gestante.
  if (tipo === 'recordatorio_suplemento') {
    if (role === 'gestante') return '/(gestante)/(tabs)/tratamiento';
  }

  // Contenido educativo recomendado → abrir el artículo (o la sección Educación).
  if (tipo === 'educacion') {
    if (role === 'gestante') {
      return data?.contentId
        ? `/(gestante)/educacion/${data.contentId}`
        : '/(gestante)/(tabs)/educacion';
    }
  }

  // Mensaje de chat → abrir DIRECTO la conversación de quien escribió, con scroll
  // al mensaje. La gestante tiene un único hilo; el obstetra abre el de la
  // gestante remitente (conversationId/gestanteId vienen en los datos).
  if (tipo === 'mensaje_chat') {
    const conv = data?.conversationId as string | undefined;
    const msgId = data?.messageId as string | undefined;
    const msgQs = msgId ? `&messageId=${msgId}` : '';
    if (role === 'gestante') {
      return conv ? `/(gestante)/(tabs)/chat?conversationId=${conv}${msgQs}` : '/(gestante)/(tabs)/chat';
    }
    if (role === 'obstetra') {
      const gid = data?.gestanteId as string | undefined;
      if (conv) return `/(obstetra)/(tabs)/chat?conversationId=${conv}${msgQs}`;
      if (gid) return `/(obstetra)/(tabs)/chat?gestanteId=${gid}`;
      return '/(obstetra)/(tabs)/chat';
    }
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
