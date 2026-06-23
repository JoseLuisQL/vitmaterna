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

/** Contenido educativo referenciado por un mensaje tipo `educacion`. */
export interface ChatMessageContent {
  id: string;
  titulo: string;
  categoria?: string | null;
  tipo?: string | null;
  trimestre?: number | null;
  thumbnailUrl?: string | null;
  duracionMin?: number | null;
}

export interface ChatMessage {
  id: string;
  clientId?: string;
  senderId: string;
  text: string;
  createdAt: string;
  tipo?: string;
  mediaUrl?: string | null;
  /** Id del contenido educativo recomendado (mensajes tipo `educacion`). */
  contentId?: string | null;
  /** Datos del contenido educativo para la tarjeta clickeable. */
  content?: ChatMessageContent | null;
  leido?: boolean;
  /** El mensaje optimista aún no fue confirmado por el servidor. */
  pending?: boolean;
  /** El envío no se confirmó en el tiempo esperado: ofrecer reintento. */
  failed?: boolean;
}

const PAGE_SIZE = 30;

/**
 * Tiempo máximo de espera de confirmación de un envío antes de marcarlo fallido.
 * Se lee en tiempo de ejecución (no al cargar el módulo) para poder acelerarlo
 * en las pruebas automatizadas vía variable de entorno.
 */
function sendAckTimeout(): number {
  return Number(process.env.EXPO_PUBLIC_CHAT_ACK_TIMEOUT_MS) || 12000;
}

/**
 * Caché en memoria del último historial por conversación. Permite mostrar los
 * mensajes al instante al reabrir un chat (sin spinner) mientras se revalida en
 * segundo plano. Es la pieza que hace que entrar al chat se sienta fluido.
 */
const historyCache = new Map<string, ChatMessage[]>();

const mapServerMessage = (m: any): ChatMessage => ({
  id: m.id,
  senderId: m.senderId,
  text: m.contenido,
  createdAt: m.createdAt,
  tipo: m.tipo,
  mediaUrl: m.mediaUrl,
  contentId: m.contentId ?? null,
  content: m.content ?? null,
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
  // Hidratar al instante desde caché si ya visitamos esta conversación: el chat
  // abre con los mensajes ya pintados, sin parpadeo de skeleton.
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => (conversationId && historyCache.get(conversationId)) || [],
  );
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);

  const pageRef = useRef(1);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSent = useRef(false);
  const ackTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Espejo síncrono de `messages` para leer el estado actual sin depender del
  // ciclo de render (lo usa retryMessage para encontrar el mensaje a reenviar).
  const messagesRef = useRef<ChatMessage[]>(messages);

  // Espeja `messages` en la caché en memoria y en el ref para hidratación
  // instantánea futura y lectura síncrona.
  useEffect(() => {
    messagesRef.current = messages;
    if (conversationId) historyCache.set(conversationId, messages);
  }, [conversationId, messages]);

  // ── Carga inicial del historial (página 1, los más recientes) ──
  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setMessages([]);
      return;
    }
    // Si hay caché, mostramos de inmediato y revalidamos en segundo plano
    // (no bloqueamos con skeleton). Si no, sí mostramos el estado de carga.
    const cached = historyCache.get(conversationId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setIsLoadingHistory(false);
    } else {
      setMessages([]);
      setIsLoadingHistory(true);
    }
    pageRef.current = 1;
    (async () => {
      try {
        const res = await api.get(`/chat/history/${conversationId}`, { params: { page: 1, limit: PAGE_SIZE } });
        if (cancelled) return;
        const list: any[] = res.data?.data || [];
        const meta = res.data?.meta;
        // El backend devuelve desc (más nuevos primero); invertimos para mostrar
        // del más antiguo (arriba) al más nuevo (abajo).
        const fresh = list.map(mapServerMessage).reverse();
        // Conservar mensajes optimistas locales aún sin confirmar (pending/failed)
        // para no perderlos al reconciliar con el servidor.
        setMessages((prev) => {
          const optimistic = prev.filter((m) => m.pending || m.failed);
          const ids = new Set(fresh.map((m) => m.id));
          const keep = optimistic.filter((m) => !ids.has(m.id));
          return [...fresh, ...keep];
        });
        setHasMore(meta ? meta.page < meta.totalPages : list.length === PAGE_SIZE);
      } catch {
        // En error mantenemos lo que haya en caché (no vaciamos la vista).
        if (!cancelled && !cached) setMessages([]);
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
      // Llegó la confirmación del servidor: cancelar el temporizador de "fallo".
      if (clientId) {
        const t = ackTimers.current.get(clientId);
        if (t) {
          clearTimeout(t);
          ackTimers.current.delete(clientId);
        }
      }
      setMessages((prev) => {
        // Reconciliación: si es la confirmación de un optimista nuestro, lo reemplazamos.
        if (clientId) {
          const idx = prev.findIndex((m) => m.clientId === clientId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = { ...incoming, clientId, pending: false, failed: false };
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

  // Programa el temporizador que marca un envío como fallido si no llega el ack.
  const armAckTimeout = useCallback((clientId: string) => {
    const prevTimer = ackTimers.current.get(clientId);
    if (prevTimer) clearTimeout(prevTimer);
    const timer = setTimeout(() => {
      ackTimers.current.delete(clientId);
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId && m.pending ? { ...m, pending: false, failed: true } : m)),
      );
    }, sendAckTimeout());
    ackTimers.current.set(clientId, timer);
  }, []);

  // ── Enviar texto (optimista con clientId + acuse con timeout) ──
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
      armAckTimeout(clientId);
      stopTyping();
    },
    [conversationId, currentUserId, emit, armAckTimeout],
  );

  // ── Enviar imagen (optimista con clientId + acuse con timeout) ──
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
      armAckTimeout(clientId);
    },
    [conversationId, currentUserId, emit, armAckTimeout],
  );

  // ── Reintentar un mensaje fallido (lo re-emite con el mismo clientId) ──
  const retryMessage = useCallback(
    (clientId: string) => {
      if (!conversationId) return;
      const target = messagesRef.current.find((m) => m.clientId === clientId);
      setMessages((prev) =>
        prev.map((m) => (m.clientId === clientId ? { ...m, pending: true, failed: false } : m)),
      );
      if (!target) return;
      if (target.tipo === 'imagen' && target.mediaUrl) {
        emit('send_message', { conversationId, content: target.text || '📷 Foto', type: 'imagen', mediaUrl: target.mediaUrl, clientId });
      } else {
        emit('send_message', { conversationId, content: target.text, type: 'texto', clientId });
      }
      armAckTimeout(clientId);
    },
    [conversationId, emit, armAckTimeout],
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

  // Limpieza de temporizadores de acuse al desmontar.
  useEffect(() => {
    const timers = ackTimers.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

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
    retryMessage,
    notifyTyping,
    stopTyping,
  };
}
