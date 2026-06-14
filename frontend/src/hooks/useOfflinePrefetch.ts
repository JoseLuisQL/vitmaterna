/**
 * VITMATERNA — Precarga offline.
 *
 * Tras autenticarse, precarga en la caché de React Query los datos clave de la
 * matriz offline (dashboard, citas, tratamientos, educación, perfil) para que
 * estén disponibles sin conexión desde el primer uso. Sólo corre una vez por
 * sesión y sólo si hay conexión. Reutiliza las mismas funciones/keys que los
 * hooks de pantalla para garantizar que poblamos la caché correcta.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isOnline } from '../services/network';
import { useAuthStore } from '../store/authStore';
import {
  fetchGestanteDashboard,
  fetchAppointments,
  fetchTreatments,
  fetchEducation,
  fetchMyProfile,
  fetchObstetraDashboard,
  fetchTodayAppointments,
  fetchPatients,
} from '../services/api-queries';

const DAY = 1000 * 60 * 60 * 24;

export function useOfflinePrefetch(): void {
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const done = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !role || done.current) return;
    if (!isOnline()) return;
    done.current = true;

    const tasks: { key: unknown[]; fn: () => Promise<unknown>; staleTime?: number }[] = [];

    if (role === 'gestante') {
      tasks.push(
        { key: ['gestanteDashboard'], fn: fetchGestanteDashboard },
        { key: ['appointments'], fn: fetchAppointments },
        { key: ['treatments'], fn: fetchTreatments },
        { key: ['myProfile'], fn: fetchMyProfile },
        { key: ['education'], fn: fetchEducation, staleTime: DAY },
      );
    } else if (role === 'obstetra') {
      tasks.push(
        { key: ['obstetraDashboard'], fn: fetchObstetraDashboard },
        { key: ['todayAppointments'], fn: fetchTodayAppointments },
        { key: ['patients', undefined], fn: () => fetchPatients(undefined) },
      );
    }

    tasks.forEach((t) => {
      queryClient
        .prefetchQuery({ queryKey: t.key, queryFn: t.fn, staleTime: t.staleTime ?? 60 * 1000 })
        .catch(() => {
          /* silencioso: la pantalla reintenta */
        });
    });
  }, [isAuthenticated, role, queryClient]);
}
