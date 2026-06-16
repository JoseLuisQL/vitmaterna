/**
 * useChat — lógica compartida del chat en tiempo real (gestante y obstetra).
 *
 * Resuelve de raíz el bug de mensaje duplicado al enviar: el mensaje optimista
 * lleva un clientId; cuando el servidor reenvía el mensaje real con ese mismo
 * clientId, se reemplaza el optimista en vez de añadir uno nuevo.
 *
 * Aporta además: paginación del historial (cargar más antiguos), indicador de
 * "escribiendo...", presencia (en línea) del otro participante y vistos
 * (read receipts) en tiempo real.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import api from '../services/api';

export interface ChatMessage {
  id: string;
  clientId?: string;
  senderId: string;
  text: string;
  createdAt: string;
  tipo?: string;
  mediaUrl?: string | null;
  leido?: boolean;
  pending?: boolean;
}

const PAGE_SIZE = 30;

const mapServerMessage = (m: any): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  text: m.contenido,
  createdAt: m.createdAt,
  tipo: m.tipo,
  mediaUrl: m.mediaUrl,
  leido: m.leido,
});

interface UseChatArgs {
  socket: Socket | null;
  isConnected: boolean;
  emit: (event: string, data: any) => void;
  conversationId: string | null;
  currentUserId?: string;
  /** userId del otro participante, para presencia global (en línea / últ. vez). */
  otherUserId?: string;
}

export function useChat({ socket, isConnected, emit, conversationId, currentUserId, otherUserId }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  const pageRef = useRef(1);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(false);

  // ── Carga inicial del historial (página 1, los más recientes) ──
  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    setIsLoadingHistory(true);
    pageRef.current = 1;
    (async () => {
      try {
        const res = await api.get(`/chat/history/${conversationId}`, { params: { page: 1, limit: PAGE_SIZE } });
        if (cancelled) return;
        const list: any[] = res.data?.data || [];
        const meta = res.data?.meta;
        // El backend devuelve desc (más nuevos primero); invertimos para mostrar
        // del más antiguo (arriba) al más nuevo (abajo).
        setMessages(list.map(mapServerMessage).reverse());
        setHasMore(meta ? meta.page < meta.totalPages : list.length === PAGE_SIZE);
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setIsLoadingHistory(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ── Cargar mensajes más antiguos (paginación hacia atrás) ──
  const loadOlder = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    const nextPage = pageRef.current + 1;
    try {
      const res = await api.get(`/chat/history/${conversationId}`, { params: { page: nextPage, limit: PAGE_SIZE } });
      const list: any[] = res.data?.data || [];
      const meta = res.data?.meta;
      const older = list.map(mapServerMessage).reverse();
      // Anteponer los más antiguos, evitando duplicados por id.
      setMessages((prev) => {
        const ids = new Set(prev.map((m) => m.id));
        const merged = older.filter((m) => !ids.has(m.id));
        return [...merged, ...prev];
      });
      pageRef.current = nextPage;
      setHasMore(meta ? meta.page < meta.totalPages : list.length === PAGE_SIZE);
    } catch {
      /* noop */
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId, isLoadingMore, hasMore]);

  // ── Suscripción a eventos de socket ──
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Unirse a la sala y marcar leído. Se hace ahora y también en cada
    // (re)conexión, para no perder el join si el socket aún no estaba conectado
    // o si se cae y vuelve.
    const joinAndRead = () => {
      emit('join_conversation', conversationId);
      emit('mark_read', { conversationId });
      // Pedir el estado de presencia actual del otro participante.
      if (otherUserId) emit('get_presence', { userId: otherUserId });
    };
    joinAndRead();
    socket.on('connect', joinAndRead);

    const onReceive = (message: any) => {
      const incoming = mapServerMessage(message);
      const clientId = message.clientId as string | undefined;
      setMessages((prev) => {
        // Reconciliación: si es la confirmación de un optimista nuestro, lo reemplazamos.
        if (clientId) {
          const idx = prev.findIndex((m) => m.clientId === clientId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...incoming, clientId };
            return next;
          }
        }
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      // Si el mensaje es del otro y la conversación está abierta, marcar leído.
      if (message.senderId !== currentUserId) {
        emit('mark_read', { conversationId });
      }
    };

    const onTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId !== currentUserId) setOtherTyping(data.isTyping);
    };

    const onPresence = (data: { userId: string; online: boolean; lastSeenAt?: string | null }) => {
      // Presencia GLOBAL: solo nos importa el otro participante de ESTA conversación.
      if (otherUserId && data.userId !== otherUserId) return;
      if (data.userId === currentUserId) return;
      setOtherOnline(data.online);
      if (data.lastSeenAt) setOtherLastSeen(data.lastSeenAt);
    };

    const onRead = (data: { conversationId: string; readerId: string }) => {
      if (data.readerId !== currentUserId) {
        // El otro leyó: marcamos nuestros mensajes como vistos.
        setMessages((prev) => prev.map((m) => (m.senderId === currentUserId ? { ...m, leido: true } : m)));
      }
    };

    socket.on('receive_message', onReceive);
    socket.on('typing', onTyping);
    socket.on('presence', onPresence);
    socket.on('messages_read', onRead);

    return () => {
      socket.off('connect', joinAndRead);
      socket.off('receive_message', onReceive);
      socket.off('typing', onTyping);
      socket.off('presence', onPresence);
      socket.off('messages_read', onRead);
      emit('leave_conversation', conversationId);
      setOtherTyping(false);
    };
  }, [socket, conversationId, currentUserId, otherUserId, emit]);

  // ── Enviar texto (optimista con clientId) ──
  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !conversationId) return;
      const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      emit('send_message', { conversationId, content: trimmed, type: 'texto', clientId });
      setMessages((prev) => [
        ...prev,
        {
          id: clientId,
          clientId,
          senderId: currentUserId || 'me',
          text: trimmed,
          createdAt: new Date().toISOString(),
          tipo: 'texto',
          pending: true,
        },
      ]);
      stopTyping();
    },
    [conversationId, currentUserId, emit],
  );

  // ── Enviar imagen (optimista con clientId) ──
  const sendImage = useCallback(
    (mediaUrl: string) => {
      if (!conversationId) return;
      const clientId = `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      emit('send_message', { conversationId, content: '📷 Foto', type: 'imagen', mediaUrl, clientId });
      setMessages((prev) => [
        ...prev,
        {
          id: clientId,
          clientId,
          senderId: currentUserId || 'me',
          text: '📷 Foto',
          createdAt: new Date().toISOString(),
          tipo: 'imagen',
          mediaUrl,
          pending: true,
        },
      ]);
    },
    [conversationId, currentUserId, emit],
  );

  // ── Indicador "escribiendo..." con debounce ──
  const stopTyping = useCallback(() => {
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
    }
    if (lastTypingSent.current && conversationId) {
      emit('typing', { conversationId, isTyping: false });
      lastTypingSent.current = false;
    }
  }, [conversationId, emit]);

  const notifyTyping = useCallback(() => {
    if (!conversationId) return;
    if (!lastTypingSent.current) {
      emit('typing', { conversationId, isTyping: true });
      lastTypingSent.current = true;
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(stopTyping, 2500);
  }, [conversationId, emit, stopTyping]);

  return {
    messages,
    isLoadingHistory,
    isLoadingMore,
    hasMore,
    otherTyping,
    otherOnline,
    otherLastSeen,
    loadOlder,
    sendText,
    sendImage,
    notifyTyping,
    stopTyping,
  };
}
