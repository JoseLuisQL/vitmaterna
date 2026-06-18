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
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/authStore';
import { useToast } from '../components/ui';
import { playNotificationSound } from '../utils/notificationSound';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1';
const SOCKET_URL = API_URL.replace(/\/v1|\/api/g, '');

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
  roleRef.current = role;
  routerRef.current = router;
  toastRef.current = toast;

  useEffect(() => {
    if (!token) return;

    const socket: Socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    const refreshNotifications = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };
    const refreshChat = () => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    };

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

    socket.on('notification:new', onNotification);
    socket.on('chat:new_message', onChatMessage);
    socket.on('chat:unread_changed', onUnreadChanged);

    return () => {
      socket.off('notification:new', onNotification);
      socket.off('chat:new_message', onChatMessage);
      socket.off('chat:unread_changed', onUnreadChanged);
      socket.disconnect();
    };
  }, [token, queryClient]);
}
