/**
 * VITMATERNA — Notificaciones in-app en tiempo real.
 *
 * Escucha `notification:new` (emitido por el backend a `user:<id>`) e invalida
 * la bandeja y el contador de no leídas para que la campana (badge) y la lista
 * se actualicen al instante, sin esperar al polling de 60 s.
 */
import { useEffect } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1';
const SOCKET_URL = API_URL.replace(/\/v1|\/api/g, '');

/** Suscribe la app a nuevas notificaciones en tiempo real. */
export function useNotificationRealtime(): void {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

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

    const onNew = () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    socket.on('notification:new', onNew);

    return () => {
      socket.off('notification:new', onNew);
      socket.disconnect();
    };
  }, [token, queryClient]);
}
