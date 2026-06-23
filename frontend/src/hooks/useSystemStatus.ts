/**
 * useSystemStatus — estado público del sistema (modo mantenimiento).
 *
 * Consulta GET /system/status (endpoint público, sin sesión) para saber si el
 * administrador activó el modo mantenimiento y con qué mensaje. Se refresca
 * periódicamente para que, al desactivarlo, los usuarios vuelvan solos sin tener
 * que reiniciar la app.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface SystemStatus {
  maintenance: { enabled: boolean; message: string };
}

const DEFAULT: SystemStatus = {
  maintenance: { enabled: false, message: '' },
};

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await api.get('/system/status');
    const data = res.data?.data;
    if (data?.maintenance) return data as SystemStatus;
    return DEFAULT;
  } catch {
    // Si no se puede consultar, NO bloqueamos al usuario.
    return DEFAULT;
  }
}

export function useSystemStatus() {
  return useQuery({
    queryKey: ['systemStatus'],
    queryFn: fetchSystemStatus,
    // Revalida cada 30 s y al volver el foco, para reaccionar pronto a cambios.
    refetchInterval: 30 * 1000,
    refetchOnWindowFocus: true,
    staleTime: 15 * 1000,
  });
}
