/**
 * VITMATERNA — QueryClient con caché persistente (offline-first).
 *
 * - `networkMode: 'offlineFirst'`: las queries sirven la caché de inmediato y
 *   reintentan en segundo plano; las mutaciones se pausan sin red (se reanudan
 *   al reconectar mediante onlineManager).
 * - Persistencia: la caché de queries se guarda en AsyncStorage (nativo) o en
 *   localStorage (web) y sobrevive al cierre de la app, de modo que al reabrir
 *   sin conexión las pantallas muestran los últimos datos.
 */
import { Platform } from 'react-native';
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Cuánto tiempo conservar la caché persistida (también es el gcTime). */
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 7; // 7 días

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      networkMode: 'offlineFirst',
      // Datos "frescos" durante 60 s: reduce refetches innecesarios (y consumo de
      // datos móviles, crítico en zona rural) sin sacrificar frescura percibida.
      // Las queries de datos estables (educación, catálogos) suben su propio
      // staleTime; offline sirve la caché aunque esté "stale".
      staleTime: 60 * 1000,
      gcTime: PERSIST_MAX_AGE,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Persister sobre AsyncStorage en nativo y localStorage en web.
 * (AsyncStorage en web usa localStorage internamente, pero lo forzamos para
 * evitar dependencias de SQLite/WebSQL en navegador.)
 */
const webStorage = {
  getItem: (k: string) => Promise.resolve(typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
  setItem: (k: string, v: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
    return Promise.resolve();
  },
  removeItem: (k: string) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    return Promise.resolve();
  },
};

const persister = createAsyncStoragePersister({
  storage: Platform.OS === 'web' ? webStorage : AsyncStorage,
  key: 'vitmaterna_query_cache',
  throttleTime: 1500,
});

let started = false;

/** Arranca la persistencia de la caché de React Query. Idempotente. */
export function startQueryPersistence(): void {
  if (started) return;
  started = true;
  persistQueryClient({
    queryClient,
    persister,
    maxAge: PERSIST_MAX_AGE,
    // Sólo persistir queries con datos exitosos (no errores ni pendientes).
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => query.state.status === 'success',
    },
  });
}

/** Limpia la caché persistida (p. ej. al cerrar sesión). */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  try {
    if (Platform.OS === 'web') webStorage.removeItem('vitmaterna_query_cache');
    else await AsyncStorage.removeItem('vitmaterna_query_cache');
  } catch {
    // ignore
  }
}
