/**
 * VITMATERNA — Tiempo real de citas.
 *
 * Escucha los eventos `appointment:*` que el backend emite a la sala personal del
 * usuario (`user:<id>`) e invalida las queries de citas para que la pantalla se
 * actualice al instante, sin recargar. Funciona para gestante y obstetra.
 */
import { useEffect } from 'react';
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

    const invalidate = () => {
      // Refresca todo lo que depende de citas en ambos roles.
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['todayAppointments'] });
      queryClient.invalidateQueries({ queryKey: ['gestanteDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
    };

    for (const ev of APPOINTMENT_EVENTS) socket.on(ev, invalidate);

    return () => {
      for (const ev of APPOINTMENT_EVENTS) socket.off(ev, invalidate);
      socket.disconnect();
    };
  }, [token, queryClient]);
}
