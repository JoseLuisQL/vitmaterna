/**
 * VITMATERNA — Gestión de red y conectividad (offline-first).
 *
 * Conecta NetInfo y AppState con React Query:
 *  - onlineManager: React Query pausa/reanuda queries y mutaciones según haya
 *    o no conexión (modo offlineFirst sirve caché y reintenta al volver).
 *  - focusManager: refresca al volver la app a primer plano.
 *
 * También expone un store ligero (suscribible) con el estado de conexión para
 * pintar el banner global "Sin conexión".
 *
 * En web, NetInfo se apoya en navigator.onLine; degrada con elegancia.
 */
import { onlineManager, focusManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import { AppState, Platform, type AppStateStatus } from 'react-native';

type Listener = (online: boolean) => void;

let _isOnline = true;
const listeners = new Set<Listener>();

/** Estado de conexión actual (síncrono). */
export function isOnline(): boolean {
  return _isOnline;
}

/** Suscribe a cambios de conexión. Devuelve función para desuscribir. */
export function subscribeOnline(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setOnline(next: boolean): void {
  if (next === _isOnline) return;
  _isOnline = next;
  listeners.forEach((l) => l(next));
}

let initialized = false;

/**
 * Inicializa los managers de React Query con NetInfo + AppState.
 * Idempotente: se puede llamar varias veces sin efectos duplicados.
 */
export function initNetwork(): void {
  if (initialized) return;
  initialized = true;

  // 1) Conectividad → onlineManager de React Query.
  onlineManager.setEventListener((setRQOnline) => {
    return NetInfo.addEventListener((state) => {
      // `isInternetReachable` puede ser null mientras se determina; en ese
      // caso usamos `isConnected` para no marcar offline por falso negativo.
      const online =
        state.isInternetReachable != null
          ? Boolean(state.isInternetReachable)
          : Boolean(state.isConnected);
      setRQOnline(online);
      setOnline(online);
    });
  });

  // Estado inicial.
  NetInfo.fetch()
    .then((state) => {
      const online =
        state.isInternetReachable != null
          ? Boolean(state.isInternetReachable)
          : Boolean(state.isConnected);
      onlineManager.setOnline(online);
      setOnline(online);
    })
    .catch(() => {
      onlineManager.setOnline(true);
      setOnline(true);
    });

  // 2) Foco de la app (foreground) → focusManager.
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (status: AppStateStatus) => {
      focusManager.setFocused(status === 'active');
    });
  }
}
