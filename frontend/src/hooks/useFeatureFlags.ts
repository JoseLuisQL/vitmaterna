/**
 * useFeatureFlags — lee del backend qué módulos están activos para ocultar/mostrar
 * secciones de la interfaz (alcance del sistema alineado a los objetivos).
 *
 * La fuente de verdad es el backend (GET /admin/feature-flags), accesible a
 * cualquier usuario autenticado. Si la petición falla (offline, etc.), se asume
 * que los módulos opcionales están DESACTIVADOS (coincide con el default del
 * backend tras la Fase 3), para no mostrar pantallas que el servidor rechazaría.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export type FeatureModule =
  | 'ecografias'
  | 'pesoRegistros'
  | 'tamizajeViolencia'
  | 'tamizajeSaludMental'
  | 'patologias'
  | 'odontograma'
  | 'consejeriaNutricional';

export type FeatureFlags = Record<FeatureModule, boolean>;

/** Valor por defecto: módulos opcionales apagados (coincide con el backend). */
const DEFAULT_FLAGS: FeatureFlags = {
  ecografias: false,
  pesoRegistros: false,
  tamizajeViolencia: false,
  tamizajeSaludMental: false,
  patologias: false,
  odontograma: false,
  consejeriaNutricional: false,
};

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  try {
    const res = await api.get('/admin/feature-flags');
    return { ...DEFAULT_FLAGS, ...(res.data?.data?.flags ?? {}) };
  } catch {
    return DEFAULT_FLAGS;
  }
};

/** Hook con el mapa de banderas. Cacheado (cambia muy poco). */
export function useFeatureFlags() {
  const { data } = useQuery({
    queryKey: ['featureFlags'],
    queryFn: fetchFeatureFlags,
    staleTime: 5 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
  return data ?? DEFAULT_FLAGS;
}
