import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { SERVER_ORIGIN as SOCKET_URL } from '../config/env';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = useAuthStore((state) => state.token);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      // Permitir fallback a polling: en Expo/React Native el transporte
      // 'websocket' puro a veces no conecta. Con polling+websocket es robusto.
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      // ISSUE #31 FIX: reconexión INFINITA en lugar de 10 intentos.
      // Con 10 intentos, si la app está en background >10s el socket muere
      // permanentemente y hay que re-loguearse.
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      // Backoff exponencial con tope de 30s (no bombardea al servidor).
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (__DEV__) console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      if (__DEV__) console.log('Socket connect_error:', err?.message);
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('authentication') || msg.includes('token') || msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('401')) {
        if (__DEV__) console.log('Socket auth error detected, triggering token refresh...');
        useAuthStore.getState().refreshToken().then((newToken: string | undefined) => {
          // Tras renovar el token, actualizar la autenticación del socket
          // para que la próxima reconexión use el token nuevo.
          if (newToken) {
            newSocket.auth = { token: newToken };
          }
        }).catch(() => {});
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (__DEV__) console.log('Socket disconnected:', reason);
      // Si el servidor cerró la conexión (no fue el cliente), intentar reconectar.
      if (reason === 'io server disconnect') {
        newSocket.connect();
      }
    });

    // Si el socket YA estaba conectado antes de registrar el listener (el evento
    // 'connect' pudo dispararse antes), sincronizamos el estado de inmediato.
    // Sin esto, isConnected se quedaba en false y el header mostraba
    // "Conectando..." de forma permanente.
    if (newSocket.connected) {
      setIsConnected(true);
    }

    socketRef.current = newSocket;
    setSocket(newSocket);

    // ISSUE #31 FIX: Al volver al FOREGROUND, forzar reconexión si el socket
    // se desconectó mientras la app estaba en background. Esto es necesario
    // porque en iOS/Android el OS puede suspender las conexiones de red.
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && socketRef.current) {
        const s = socketRef.current;
        if (s.disconnected) {
          if (__DEV__) console.log('App resumed → reconectando socket...');
          // Refrescar el token antes de reconectar (puede haber expirado).
          useAuthStore.getState().refreshToken().then((newToken: string | undefined) => {
            if (newToken) {
              s.auth = { token: newToken };
            }
            s.connect();
          }).catch(() => {
            // Intentar reconectar con el token actual de todas formas.
            s.connect();
          });
        }
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      socketRef.current = null;
      newSocket.disconnect();
    };
  }, [token]);

  const emit = useCallback(
    (event: string, data: any) => {
      if (!socket) return; // Aún no hay socket: ignorar en silencio.
      // socket.io-client encola (buffer) los emits mientras (re)conecta y los
      // envía automáticamente al conectar. Por eso emitimos siempre que exista
      // el socket: no se pierden eventos y no hace falta avisar "not connected".
      socket.emit(event, data);
    },
    [socket]
  );

  return { socket, isConnected, emit };
};
