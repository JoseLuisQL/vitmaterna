import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import { SERVER_ORIGIN as SOCKET_URL } from '../config/env';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      // Permitir fallback a polling: en Expo/React Native el transporte
      // 'websocket' puro a veces no conecta. Con polling+websocket es robusto.
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      if (__DEV__) console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      if (__DEV__) console.log('Socket connect_error:', err?.message);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      if (__DEV__) console.log('Socket disconnected');
    });

    // Si el socket YA estaba conectado antes de registrar el listener (el evento
    // 'connect' pudo dispararse antes), sincronizamos el estado de inmediato.
    // Sin esto, isConnected se quedaba en false y el header mostraba
    // "Conectando..." de forma permanente.
    if (newSocket.connected) {
      setIsConnected(true);
    }

    setSocket(newSocket);

    return () => {
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
