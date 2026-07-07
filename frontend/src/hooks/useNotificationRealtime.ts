/**
 * VITMATERNA — Notificaciones y chat in-app en tiempo real.
 *
 * Una sola conexión global (montada en SidebarProvider) que escucha:
 *  - `notification:new`  → refresca campana + contador, suena y muestra banner.
 *  - `chat:new_message`  → refresca badge del tab de Chat y la lista de
 *     conversaciones, suena y muestra un banner "Nuevo mensaje de…".
 *  - `chat:unread_changed` → refresca el badge del Chat al marcar leído.
 *
 * Así, aunque el usuario no tenga abierta la conversación, ve el contador de
 * pendientes y escucha el tono (estilo WhatsApp), y al tocar el banner/campana
 * llega al chat correspondiente.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui';
import { playNotificationSound } from '../utils/notificationSound';

import { SERVER_ORIGIN as SOCKET_URL } from '../config/env';

/** Suscribe la app a notificaciones y mensajes de chat en tiempo real. */
export function useNotificationRealtime(): void {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.user?.role);
  const queryClient = useQueryClient();
  const router = useRouter();
  const toast = useToast();
  // Refs para usar los valores más recientes dentro de los listeners del socket.
  const roleRef = useRef(role);
  const routerRef = useRef(router);
  const toastRef = useRef(toast);
  const socketRef = useRef<Socket | null>(null);
  roleRef.current = role;
  routerRef.current = router;
  toastRef.current = toast;

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      // ISSUE #31 FIX: reconexión INFINITA.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socketRef.current = socket;

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const refreshChat = () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    };

    // Al (re)conectar: refrescar estado que pudo cambiar durante la desconexión.
    const onConnect = () => {
      if (__DEV__) console.log('NotificationRealtime socket connected');
      refreshNotifications();
      refreshChat();
    };
    socket.on('connect', onConnect);

    // ISSUE #31 FIX: al error de auth, refrescar token y actualizar el socket.
    socket.on('connect_error', (err) => {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('authentication') || msg.includes('token') || msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('401')) {
        useAuthStore.getState().refreshToken().then((newToken: string | undefined) => {
          if (newToken) {
            socket.auth = { token: newToken };
          }
        }).catch(() => {});
      }
    });

    // Nueva notificación (cualquier tipo): refresca campana + suena + banner.
    const onNotification = () => {
      refreshNotifications();
      playNotificationSound();
    };

    // Nuevo mensaje de chat recibido (estés donde estés en la app).
    const onChatMessage = (payload: { conversationId?: string; senderName?: string; preview?: string }) => {
      refreshChat();
      refreshNotifications();
      playNotificationSound();
      const r = roleRef.current;
      const chatHref = r === 'gestante' ? '/(gestante)/(tabs)/chat' : '/(obstetra)/(tabs)/chat';
      toastRef.current.showToast({
        type: 'info',
        title: payload?.senderName ? `Nuevo mensaje de ${payload.senderName}` : 'Nuevo mensaje',
        message: payload?.preview || 'Toca para abrir el chat.',
        onPress: () => routerRef.current.push(chatHref as any),
      });
    };

    const onUnreadChanged = () => refreshChat();

    // La obstetra recomendó contenido → refresca el módulo de educación.
    const onNewRecommendation = () => {
      queryClient.invalidateQueries({ queryKey: ['education'] });
    };

    socket.on('notification:new', onNotification);
    socket.on('chat:new_message', onChatMessage);
    socket.on('chat:unread_changed', onUnreadChanged);
    socket.on('education:new_recommendation', onNewRecommendation);

    // ISSUE #31 FIX: al volver a foreground, forzar reconexión si se perdió.
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && socketRef.current) {
        const s = socketRef.current;
        if (s.disconnected) {
          if (__DEV__) console.log('App resumed → reconectando socket de notificaciones...');
          useAuthStore.getState().refreshToken().then((newToken: string | undefined) => {
            if (newToken) {
              s.auth = { token: newToken };
            }
            s.connect();
          }).catch(() => {
            s.connect();
          });
        } else {
          // Aunque esté conectado, refrescar datos por si se perdieron eventos.
          refreshNotifications();
          refreshChat();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      socketRef.current = null;
      socket.off('connect', onConnect);
      socket.off('notification:new', onNotification);
      socket.off('chat:new_message', onChatMessage);
      socket.off('chat:unread_changed', onUnreadChanged);
      socket.off('education:new_recommendation', onNewRecommendation);
      socket.disconnect();
    };
  }, [token, queryClient]);
}

