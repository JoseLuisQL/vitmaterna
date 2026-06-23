/**
 * VITMATERNA — MessageThread (hilo de mensajes del chat, estilo WhatsApp)
 *
 * Lista de mensajes compartida por la gestante y el obstetra. Unifica el render
 * de burbujas (texto, imagen, contenido educativo, alerta de emergencia), los
 * separadores de día (Hoy / Ayer / fecha), el indicador "escribiendo…", la
 * carga de mensajes antiguos y el posicionamiento al final.
 *
 * Rendimiento y fluidez (estándar de apps de mensajería):
 *  - FlatList `inverted`: el hilo se ancla abajo, así abre SIEMPRE en el último
 *    mensaje sin salto ni "scroll a mano". Cargar histórico (arriba) no mueve la
 *    vista. Internamente la data va del más nuevo (índice 0) al más antiguo.
 *  - Agrupación de mensajes consecutivos del mismo emisor (menos ruido visual).
 *  - Pill flotante "bajar al final" cuando el usuario sube a leer histórico.
 *  - Mensajes fallidos muestran reintento.
 *
 * Mantiene una sola fuente de verdad para que ambos roles se vean idénticos.
 */
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, ActivityIndicator, Pressable } from 'react-native';
import { Check, CheckCheck, ChevronRight, ChevronDown, AlertCircle, RotateCw } from 'lucide-react-native';
import { TypingDots } from './TypingDots';
import { EmergencyMessageCard } from './EmergencyMessageCard';
import { resolveMediaUrl } from '../../services/api';
import { categoryMeta, typeMeta } from '../../utils/educationMeta';
import { formatTime, formatDaySeparator, dayKey } from '../../utils/chatFormat';
import type { ChatMessage } from '../../hooks/useChat';
import { commonColors, chatColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

/**
 * Item de la lista: un mensaje o un separador de día.
 * `firstOfGroup` / `lastOfGroup` controlan el espaciado y la "cola" de la burbuja
 * para agrupar mensajes consecutivos del mismo emisor.
 */
type Row =
  | { kind: 'day'; id: string; label: string }
  | { kind: 'msg'; id: string; msg: ChatMessage; firstOfGroup: boolean; lastOfGroup: boolean };

interface Props {
  messages: ChatMessage[];
  currentUserId?: string;
  accent: string;
  /** Color de la burbuja propia (por defecto = accent). */
  bubbleMine?: string;
  otherTyping: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadOlder: () => void;
  /** Acción al tocar una tarjeta de contenido educativo. */
  onOpenContent?: (contentId: string) => void;
  /** Reintentar el envío de un mensaje fallido (por clientId). */
  onRetry?: (clientId: string) => void;
  /** Id del mensaje a resaltar momentáneamente (deep-link desde notificación). */
  highlightMessageId?: string | null;
  emptyText?: string;
  /** Reserva inferior para el tab bar flotante (móvil). */
  bottomSpace?: number;
}

function isMine(msg: ChatMessage, currentUserId?: string): boolean {
  return msg.senderId === currentUserId || msg.senderId === 'me';
}

export function MessageThread({
  messages,
  currentUserId,
  accent,
  bubbleMine,
  otherTyping,
  isLoadingMore,
  hasMore,
  onLoadOlder,
  onOpenContent,
  onRetry,
  highlightMessageId,
  emptyText = 'Envía un mensaje para comenzar.',
  bottomSpace = spacing.lg,
}: Props): React.ReactElement {
  const listRef = useRef<FlatList<Row>>(null);
  const mineColor = bubbleMine ?? accent;
  const [showJump, setShowJump] = useState(false);

  // Intercala separadores de día y marca grupos de mensajes consecutivos.
  // La lista se renderiza INVERTIDA, así que devolvemos las filas del más
  // reciente (índice 0) al más antiguo: el hilo queda anclado abajo.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const k = dayKey(m.createdAt);

      const firstOfGroup = !prev || prev.senderId !== m.senderId || dayKey(prev.createdAt) !== k;
      const lastOfGroup = !next || next.senderId !== m.senderId || dayKey(next.createdAt) !== k;

      out.push({ kind: 'msg', id: m.id, msg: m, firstOfGroup, lastOfGroup });

      // Separador de día: se inserta DESPUÉS del mensaje en orden normal, lo que
      // equivale a "encima" del primer mensaje del día en la lista invertida.
      if (k && k !== lastDay) {
        out.push({ kind: 'day', id: `day-${k}`, label: formatDaySeparator(m.createdAt) });
        lastDay = k;
      }
    }
    return out.reverse();
  }, [messages]);

  const scrollToBottom = useCallback((animated = true) => {
    // En lista invertida, "abajo" es el offset 0.
    listRef.current?.scrollToOffset({ offset: 0, animated });
  }, []);

  // Mostrar el botón "bajar" solo cuando el usuario subió a leer histórico.
  const handleScroll = useCallback((e: any) => {
    const y = e?.nativeEvent?.contentOffset?.y ?? 0;
    setShowJump(y > 240);
  }, []);

  const renderRow = useCallback(
    ({ item }: { item: Row }) => {
      if (item.kind === 'day') {
        return (
          <View style={styles.daySeparator}>
            <Text style={styles.dayText}>{item.label}</Text>
          </View>
        );
      }
      return (
        <Bubble
          msg={item.msg}
          currentUserId={currentUserId}
          mineColor={mineColor}
          firstOfGroup={item.firstOfGroup}
          lastOfGroup={item.lastOfGroup}
          highlighted={!!highlightMessageId && item.msg.id === highlightMessageId}
          onOpenContent={onOpenContent}
          onRetry={onRetry}
        />
      );
    },
    [currentUserId, mineColor, highlightMessageId, onOpenContent, onRetry],
  );

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        data={rows}
        inverted
        keyExtractor={(r) => r.id}
        renderItem={renderRow}
        contentContainerStyle={[styles.content, { paddingTop: bottomSpace }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={64}
        // En lista invertida, los mensajes antiguos están al "final".
        onEndReached={hasMore ? onLoadOlder : undefined}
        onEndReachedThreshold={0.25}
        ListFooterComponent={
          isLoadingMore ? <ActivityIndicator size="small" color={accent} style={{ marginVertical: spacing.md }} /> : null
        }
        // En lista invertida el header se pinta abajo: aquí va el "escribiendo…".
        ListHeaderComponent={
          otherTyping ? (
            <View style={styles.typingWrap}>
              <TypingDots color={commonColors.textSecondary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{emptyText}</Text>
          </View>
        }
      />

      {showJump && (
        <Pressable
          onPress={() => scrollToBottom(true)}
          style={styles.jumpBtn}
          accessibilityRole="button"
          accessibilityLabel="Ir al último mensaje"
        >
          <ChevronDown size={22} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

interface BubbleProps {
  msg: ChatMessage;
  currentUserId?: string;
  mineColor: string;
  firstOfGroup: boolean;
  lastOfGroup: boolean;
  highlighted?: boolean;
  onOpenContent?: (contentId: string) => void;
  onRetry?: (clientId: string) => void;
}

const Bubble = React.memo(function Bubble({
  msg,
  currentUserId,
  mineColor,
  firstOfGroup,
  lastOfGroup,
  highlighted,
  onOpenContent,
  onRetry,
}: BubbleProps): React.ReactElement {
  const isMe = isMine(msg, currentUserId);
  const time = formatTime(msg.createdAt);

  if (msg.tipo === 'alerta_emergencia') {
    return <EmergencyMessageCard text={msg.text} time={time} mapsUrl={msg.mediaUrl} />;
  }

  // Margen reducido entre mensajes del mismo grupo; mayor al cambiar de emisor.
  const groupSpacing = { marginTop: firstOfGroup ? spacing.sm : 2 };
  // "Cola" de la burbuja solo en el último mensaje del grupo (estilo WhatsApp).
  const tail = isMe
    ? lastOfGroup
      ? { borderBottomRightRadius: borderRadius.xs }
      : null
    : lastOfGroup
      ? { borderBottomLeftRadius: borderRadius.xs }
      : null;

  // Recibos de lectura solo en mensajes propios.
  const Ticks = isMe ? (
    msg.failed ? null : msg.pending ? (
      <Check size={13} color={chatColors.tickOnBubble} />
    ) : msg.leido ? (
      <CheckCheck size={14} color={chatColors.readReceipt} />
    ) : (
      <CheckCheck size={14} color={chatColors.tickOnBubble} />
    )
  ) : null;

  const FailedRetry =
    isMe && msg.failed ? (
      <Pressable
        onPress={() => msg.clientId && onRetry?.(msg.clientId)}
        style={styles.retryRow}
        accessibilityRole="button"
        accessibilityLabel="Reintentar envío del mensaje"
        hitSlop={8}
      >
        <AlertCircle size={13} color={semanticColors.danger} />
        <Text style={styles.retryText}>No enviado · Reintentar</Text>
        <RotateCw size={13} color={semanticColors.danger} />
      </Pressable>
    ) : null;

  if (msg.tipo === 'educacion' && msg.content) {
    const cm = categoryMeta(msg.content.categoria);
    const tm = typeMeta(msg.content.tipo);
    const CIcon = cm.icon;
    return (
      <View style={groupSpacing}>
        <View
          style={[
            styles.bubble,
            isMe ? [styles.mine, { backgroundColor: mineColor }] : styles.other,
            tail,
            styles.eduBubble,
            highlighted && styles.highlighted,
          ]}
        >
          {!!msg.text && (
            <Text style={[styles.text, isMe ? styles.textMine : styles.textOther, { marginBottom: spacing.sm }]}>{msg.text}</Text>
          )}
          <Pressable
            style={[styles.eduCard]}
            onPress={onOpenContent && msg.content ? () => onOpenContent(msg.content!.id) : undefined}
            accessibilityRole="button"
            accessibilityLabel={`Abrir contenido: ${msg.content.titulo}`}
          >
            {msg.content.thumbnailUrl ? (
              <Image source={{ uri: resolveMediaUrl(msg.content.thumbnailUrl) || undefined }} style={styles.eduThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.eduIcon, { backgroundColor: cm.bg }]}>
                <CIcon size={22} color={cm.color} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.eduCategory, { color: cm.color }]} numberOfLines={1}>{cm.label}</Text>
              <Text style={styles.eduTitle} numberOfLines={2}>{msg.content.titulo}</Text>
              <Text style={styles.eduMeta} numberOfLines={1}>
                {tm.label}{msg.content.duracionMin ? ` · ${msg.content.duracionMin} min` : ''} · Toca para abrir
              </Text>
            </View>
            <ChevronRight size={18} color={commonColors.textTertiary} />
          </Pressable>
          <View style={styles.meta}>
            <Text style={[styles.time, isMe ? styles.timeMine : styles.timeOther]}>{time}</Text>
            {Ticks}
          </View>
        </View>
        {FailedRetry}
      </View>
    );
  }

  const isImage = msg.tipo === 'imagen' && msg.mediaUrl;

  return (
    <View style={groupSpacing}>
      <View
        style={[
          styles.bubble,
          isMe ? [styles.mine, { backgroundColor: mineColor }] : styles.other,
          tail,
          highlighted && styles.highlighted,
        ]}
      >
        {isImage ? (
          <Image
            source={{ uri: resolveMediaUrl(msg.mediaUrl) || undefined }}
            style={styles.image}
            resizeMode="cover"
            accessibilityLabel="Foto enviada en el chat"
          />
        ) : (
          <Text style={[styles.text, isMe ? styles.textMine : styles.textOther]}>{msg.text}</Text>
        )}
        <View style={styles.meta}>
          <Text style={[styles.time, isMe ? styles.timeMine : styles.timeOther]}>{time}</Text>
          {Ticks}
        </View>
      </View>
      {FailedRetry}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  content: { padding: spacing.lg, flexGrow: 1 },
  daySeparator: { alignItems: 'center', marginVertical: spacing.md },
  dayText: {
    ...typography.caption,
    color: commonColors.textSecondary,
    backgroundColor: commonColors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    fontWeight: '600',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    borderRadius: borderRadius.lg,
  },
  mine: { alignSelf: 'flex-end' },
  other: { alignSelf: 'flex-start', backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.borderLight },
  highlighted: { borderWidth: 2, borderColor: semanticColors.warning },
  image: { width: 220, height: 220, borderRadius: borderRadius.lg, marginBottom: 6, backgroundColor: commonColors.surfaceAlt },
  eduBubble: { maxWidth: '86%' },
  eduCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.sm2, borderWidth: 1, borderColor: commonColors.border },
  eduThumb: { width: 46, height: 46, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceHover },
  eduIcon: { width: 46, height: 46, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  eduCategory: { ...typography.overline, fontSize: 10, marginBottom: 2 },
  eduTitle: { ...typography.bodySm, fontWeight: '700', color: commonColors.text, lineHeight: 18 },
  eduMeta: { ...typography.caption, fontSize: 11, color: commonColors.textSecondary, marginTop: 2 },
  text: { ...typography.body },
  textMine: { color: commonColors.white },
  textOther: { color: commonColors.text },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', marginTop: 2 },
  time: { ...typography.caption, fontSize: 11 },
  timeMine: { color: chatColors.timeOnBubble },
  timeOther: { color: commonColors.textTertiary },
  retryRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end', marginTop: 3, paddingHorizontal: spacing.xs },
  retryText: { ...typography.caption, fontSize: 11, color: semanticColors.danger, fontWeight: '600' },
  typingWrap: { paddingVertical: spacing.xs },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, paddingHorizontal: spacing.xl, transform: [{ scaleY: -1 }] },
  emptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22 },
  jumpBtn: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } as any),
    elevation: 4,
  },
});

export default MessageThread;
