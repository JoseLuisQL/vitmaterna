import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1';

// Derive socket URL from API URL (remove /v1 or /api path if present)
const SOCKET_URL = API_URL.replace(/\/v1|\/api/g, '');

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
      console.log('Socket connected:', newSocket.id);
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      console.log('Socket connect_error:', err?.message);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  const emit = useCallback(
    (event: string, data: any) => {
      if (socket && isConnected) {
        socket.emit(event, data);
      } else {
        console.warn('Cannot emit, socket not connected');
      }
    },
    [socket, isConnected]
  );

  return { socket, isConnected, emit };
};
