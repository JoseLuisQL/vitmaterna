/**
 * VITMATERNA — Tiempo real de citas.
 *
 * Escucha los eventos `appointment:*` que el backend emite a la sala personal del
 * usuario (`user:<id>`) e invalida las queries de citas para que la pantalla se
 * actualice al instante, sin recargar. Funciona para gestante y obstetra.
 */
import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { SERVER_ORIGIN as SOCKET_URL } from '../config/env';

const APPOINTMENT_EVENTS = [
  'appointment:created',
  'appointment:updated',
  'appointment:status_changed',
] as const;

/** Suscribe la pantalla a los cambios de citas en tiempo real. */
export function useAppointmentRealtime(): void {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

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

    const invalidate = () => {
      // Refresca todo lo que depende de citas en ambos roles.
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    };

    // Al (re)conectar, refrescar citas que pudieron cambiar mientras estaba offline.
    socket.on('connect', invalidate);

    // ISSUE #31 FIX: al error de auth, refrescar token.
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

    for (const ev of APPOINTMENT_EVENTS) socket.on(ev, invalidate);

    // ISSUE #31 FIX: al volver a foreground, reconectar si se perdió.
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && socketRef.current) {
        const s = socketRef.current;
        if (s.disconnected) {
          useAuthStore.getState().refreshToken().then((newToken: string | undefined) => {
            if (newToken) {
              s.auth = { token: newToken };
            }
            s.connect();
          }).catch(() => {
            s.connect();
          });
        } else {
          invalidate();
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      socketRef.current = null;
      socket.off('connect', invalidate);
      for (const ev of APPOINTMENT_EVENTS) socket.off(ev, invalidate);
      socket.disconnect();
    };
  }, [token, queryClient]);
}

