/**
 * VITMATERNA — Chat del obstetra (bandeja + hilo, estilo WhatsApp).
 *
 * - Bandeja: TODAS las gestantes asignadas como contactos, ordenadas por último
 *   mensaje (no leídos arriba), con buscador, avatar por color de riesgo,
 *   preview profesional y badge de no leídos.
 * - Web: vista master-detail (lista a la izquierda + hilo a la derecha).
 * - Móvil: lista → al tocar, abre el hilo a pantalla completa.
 * - Tiempo real: la lista se reordena/actualiza al recibir mensajes nuevos.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../../src/services/api';
import { ChatSkeleton, ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { SearchField } from '../../../src/components/ui/Field';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { ConversationListItem, type ConversationRow } from '../../../src/components/shared/ConversationListItem';
import { MessageThread } from '../../../src/components/shared/MessageThread';
import { ChatInput } from '../../../src/components/shared/ChatInput';
import { useChatConversations } from '../../../src/services/api-queries';
import { ChevronLeft, MessageSquare, Megaphone, Search, Users } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useChat } from '../../../src/hooks/useChat';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { formatLastSeen } from '../../../src/utils/lastSeen';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { typography } from '../../../src/theme/typography';
import { shadows, coloredGlow } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;
const LIST_WIDTH = 380;

export default function ObstetraChatScreen() {
  const router = useRouter();
  const { webShell } = useResponsive();
  const chatTourTarget = useTourTarget(TOUR_TARGETS.obstetraChat);
  const { user } = useAuthStore();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { socket, isConnected, emit } = useSocket();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRow, setActiveRow] = useState<ConversationRow | null>(null);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);

  const { data: conversations = [], isLoading: isLoadingConvs, isError: convsError, refetch: refetchConvs } = useChatConversations();

  // Reordena/actualiza la bandeja al recibir mensajes nuevos en tiempo real.
  useEffect(() => {
    if (!socket) return;
    const onChange = () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
    };
    socket.on('chat:new_message', onChange);
    socket.on('chat:unread_changed', onChange);
    return () => {
      socket.off('chat:new_message', onChange);
      socket.off('chat:unread_changed', onChange);
    };
  }, [socket, queryClient]);

  // Presencia de TODA la bandeja: mapa userId→online que se alimenta de los
  // eventos `presence` globales del servidor, para mostrar el punto verde en
  // cualquier gestante en línea (no solo la conversación abierta).
  const [presenceMap, setPresenceMap] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!socket) return;
    const onPresence = (data: { userId: string; online: boolean }) => {
      if (!data?.userId) return;
      setPresenceMap((prev) => (prev[data.userId] === data.online ? prev : { ...prev, [data.userId]: data.online }));
    };
    socket.on('presence', onPresence);
    return () => {
      socket.off('presence', onPresence);
    };
  }, [socket]);

  const conversationId = activeId;
  const otherUserId = activeRow?.otherUserId ?? undefined;
  const {
    messages, isLoadingHistory, isLoadingMore, hasMore,
    otherTyping, otherOnline, otherLastSeen, loadOlder, sendText, sendImage, retryMessage, notifyTyping,
  } = useChat({ socket, isConnected, emit, conversationId, currentUserId: user?.id, otherUserId });

  // Deep-link desde notificación: abrir directo la conversación del remitente y
  // resaltar el mensaje. Se ejecuta cuando llega el parámetro y ya hay bandeja.
  const params = useLocalSearchParams<{ conversationId?: string; gestanteId?: string; messageId?: string }>();
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const handledDeepLink = useRef<string | null>(null);

  // Solo filas con el formato nuevo (la caché persistida puede traer registros
  // antiguos sin `nombre`; los descartamos para no romper el render).
  const rows = useMemo<ConversationRow[]>(
    () => (conversations as ConversationRow[]).filter((c) => c && (c.nombre || c.gestanteId)),
    [conversations],
  );

  // Filtrado por búsqueda (nombre o DNI).
  const filtered = useMemo<ConversationRow[]>(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (c) => (c.nombre || '').toLowerCase().includes(q) || String(c.dni || '').includes(q),
    );
  }, [rows, debouncedSearch]);

  // Abrir una conversación: si no existe (id null), la crea vía targetId.
  const openConversation = async (row: ConversationRow) => {
    let id = row.id;
    if (!id && row.gestanteId) {
      try {
        const res = await api.get('/chat/conversation', { params: { targetId: row.gestanteId } });
        id = res.data?.data?.id ?? null;
      } catch {
        toast.error('No se pudo abrir el chat', 'Inténtalo nuevamente.');
        return;
      }
    }
    if (!id) return;
    setActiveRow({ ...row, id });
    setActiveId(id);
    queryClient.invalidateQueries({ queryKey: ['chat', 'unread'] });
  };

  // ── Deep-link: abre la conversación indicada por la notificación ──
  useEffect(() => {
    const wantConv = (params.conversationId as string) || '';
    const wantGest = (params.gestanteId as string) || '';
    const wantMsg = (params.messageId as string) || '';
    const key = wantConv || wantGest;
    if (!key || handledDeepLink.current === key) return;
    if (rows.length === 0) return; // esperar a que cargue la bandeja
    // Buscar la fila por conversación o por gestante.
    const row =
      rows.find((r) => (wantConv && r.id === wantConv)) ||
      rows.find((r) => (wantGest && r.gestanteId === wantGest));
    if (row) {
      handledDeepLink.current = key;
      void openConversation(row);
      if (wantMsg) {
        setHighlightMessageId(wantMsg);
        setTimeout(() => setHighlightMessageId(null), 2500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.conversationId, params.gestanteId, params.messageId, rows]);

  const handleBack = () => {
    setActiveId(null);
    setActiveRow(null);
    refetchConvs();
  };

  const handleSend = () => {
    if (!inputText.trim() || !conversationId) return;
    sendText(inputText);
    setInputText('');
    // La bandeja se reordena sola al recibir `chat:new_message` por socket;
    // no hace falta un refetch agresivo que provoca parpadeo.
  };

  const handleAttachPhoto = async () => {
    if (!conversationId || uploading) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.info('Permiso requerido', 'Permite el acceso a tus fotos para enviar imágenes.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
      if (result.canceled || !result.assets?.[0]?.base64) return;
      setUploading(true);
      const asset = result.assets[0];
      const res = await api.post('/chat/upload', { base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' });
      const mediaUrl = res.data?.data?.mediaUrl;
      if (!mediaUrl) throw new Error('upload failed');
      sendImage(mediaUrl);
    } catch {
      toast.error('No se pudo enviar la foto', 'Inténtalo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  // ── Sub-render: lista de conversaciones ──
  const renderList = (inWeb: boolean) =>
    convsError ? (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon={MessageSquare}
          title="No se pudo cargar la bandeja"
          description="Revisa tu conexión y vuelve a intentar."
          themeColor={BRAND}
          actionTitle="Reintentar"
          onAction={() => refetchConvs()}
        />
      </View>
    ) : (
    <FlashList
      data={filtered}
      keyExtractor={(item) => item.id ?? item.gestanteId ?? item.nombre}
      renderItem={({ item }) => (
        <ConversationListItem
          item={item}
          accent={BRAND}
          useRiskColor
          selected={inWeb && activeId === item.id}
          online={
            item.otherUserId
              ? (otherUserId === item.otherUserId ? otherOnline : !!presenceMap[item.otherUserId])
              : false
          }
          onPress={() => openConversation(item)}
        />
      )}
      contentContainerStyle={styles.listContent}
      refreshing={isLoadingConvs}
      onRefresh={refetchConvs}
      ListEmptyComponent={
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={search ? Search : Users}
            title={search ? 'Sin resultados' : 'Aún no tienes gestantes'}
            description={search ? 'Prueba con otro nombre o DNI.' : 'Cuando registres gestantes aparecerán aquí para conversar.'}
            themeColor={BRAND}
          />
        </View>
      }
    />
  );

  // ── Sub-render: barra de búsqueda ──
  const SearchBar = (
    <SearchField
      value={search}
      onChangeText={setSearch}
      placeholder="Buscar gestante por nombre o DNI"
    />
  );

  const activeName = activeRow?.nombre || 'Gestante';
  const statusText = otherTyping
    ? 'escribiendo…'
    : otherOnline
      ? 'En línea'
      : (otherLastSeen || activeRow?.lastSeenAt)
        ? formatLastSeen(otherLastSeen || (activeRow?.lastSeenAt ?? null))
        : isConnected ? 'Desconectada' : 'Conectando…';

  // ── Sub-render: panel del hilo (cabecera + mensajes + input) ──
  const renderThread = (showBackButton: boolean) => (
    <>
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.threadHeader}>
        <SafeAreaView edges={['top']} style={styles.threadHeaderRow}>
          {showBackButton && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver a la lista">
              <ChevronLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
          )}
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(activeName[0] || 'G').toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>{activeName}</Text>
            <View style={styles.statusRow}>
              {otherOnline && !otherTyping && <View style={styles.statusDot} />}
              <Text style={[styles.headerSubtitle, otherTyping && styles.typingText]} numberOfLines={1}>{statusText}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoadingHistory && messages.length === 0 ? (
        <ChatSkeleton count={7} />
      ) : (
        <MessageThread
          messages={messages}
          currentUserId={user?.id}
          accent={BRAND}
          otherTyping={otherTyping}
          isLoadingMore={isLoadingMore}
          hasMore={hasMore}
          onLoadOlder={loadOlder}
          onRetry={retryMessage}
          highlightMessageId={highlightMessageId}
          emptyText="No hay mensajes en esta conversación. Escribe el primero."
          bottomSpace={spacing.lg}
        />
      )}

      <ChatInput
        value={inputText}
        onChangeText={(t) => { setInputText(t); notifyTyping(); }}
        onSend={handleSend}
        onAttach={handleAttachPhoto}
        uploading={uploading}
        accent={BRAND}
        placeholder="Escribe tu mensaje..."
      />
    </>
  );

  // ════════════════════ WEB: master-detail ════════════════════
  if (webShell) {
    return (
      <View style={styles.webShell}>
        {/* Columna izquierda: lista */}
        <View style={styles.webListCol}>
          <View ref={webShell ? chatTourTarget : undefined} collapsable={false} style={styles.webListHeader}>
            <View>
              <Text style={styles.webListTitle}>Bandeja de Consultas</Text>
              <Text style={styles.webListSubtitle}>Tus gestantes</Text>
            </View>
            <TouchableOpacity style={styles.broadcastBtn} onPress={() => router.push('/(obstetra)/mensaje-masivo')} accessibilityRole="button" accessibilityLabel="Mensaje masivo">
              <Megaphone size={16} color={commonColors.white} />
              <Text style={styles.broadcastBtnText}>Masivo</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.webSearchWrap}>{SearchBar}</View>
          {isLoadingConvs ? (
            <View style={{ padding: spacing.md }}><ListSkeleton count={6} /></View>
          ) : (
            renderList(true)
          )}
        </View>

        {/* Columna derecha: hilo o estado vacío */}
        <View style={styles.webThreadCol}>
          {activeId ? (
            renderThread(false)
          ) : (
            <View style={styles.webPlaceholder}>
              <MessageSquare size={56} color={commonColors.textTertiary} />
              <Text style={styles.webPlaceholderTitle}>Selecciona una gestante</Text>
              <Text style={styles.webPlaceholderText}>Elige una conversación de la izquierda para ver y responder los mensajes.</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ════════════════════ MÓVIL ════════════════════
  if (activeId) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {renderThread(true)}
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bandejaHeader}>
        <SafeAreaView edges={['top']}>
          <Text style={styles.bandejaTitle}>Bandeja de Consultas</Text>
          <Text style={styles.bandejaSubtitle}>Mensajes con tus gestantes</Text>
        </SafeAreaView>
      </LinearGradient>

      <View ref={!webShell ? chatTourTarget : undefined} collapsable={false} style={styles.mobileSearchWrap}>{SearchBar}</View>

      {isLoadingConvs ? (
        <View style={{ paddingHorizontal: spacing.md }}><ListSkeleton count={6} /></View>
      ) : (
        renderList(false)
      )}

      <TouchableOpacity style={styles.broadcastFab} onPress={() => router.push('/(obstetra)/mensaje-masivo')} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel="Mensaje masivo">
        <Megaphone size={20} color={commonColors.white} />
        <Text style={styles.broadcastFabText}>Mensaje masivo</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },

  // Web master-detail
  webShell: { flex: 1, flexDirection: 'row', backgroundColor: commonColors.background },
  webListCol: { width: LIST_WIDTH, borderRightWidth: 1, borderRightColor: commonColors.border, backgroundColor: commonColors.surface },
  webListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm },
  webListTitle: { ...typography.h3, color: commonColors.text },
  webListSubtitle: { ...typography.caption, color: commonColors.textSecondary },
  webSearchWrap: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  webThreadCol: { flex: 1, minWidth: 0 },
  webPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  webPlaceholderTitle: { ...typography.h3, color: commonColors.text, marginTop: spacing.sm },
  webPlaceholderText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', maxWidth: 360 },

  // Headers móviles
  bandejaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderBottomLeftRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg },
  bandejaTitle: { ...typography.h1, color: commonColors.white },
  bandejaSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },

  mobileSearchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.md },

  listContent: { paddingHorizontal: spacing.sm, paddingTop: spacing.sm, paddingBottom: layout.tabBarSpace + 80 },
  emptyWrap: { paddingTop: spacing.xxl },

  // Hilo
  threadHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomLeftRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg },
  threadHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.onColorSurface },
  headerAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: commonColors.onColorSurfaceStrong, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { ...typography.h4, color: commonColors.white },
  headerTitle: { ...typography.h3, color: commonColors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: semanticColors.successMid },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft },
  typingText: { fontStyle: 'italic', color: commonColors.white },

  broadcastBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, paddingHorizontal: spacing.sm2, height: 36, borderRadius: borderRadius.full },
  broadcastBtnText: { ...typography.bodySm, fontWeight: '600', color: commonColors.white },
  // Sobre la barra de tabs flotante (64 + safe-area). Antes en bottom:24 el FAB
  // quedaba TAPADO por la barra inferior en móvil.
  broadcastFab: { position: 'absolute', right: spacing.lg, bottom: layout.tabBarSpace + spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND, paddingHorizontal: 20, paddingVertical: 14, borderRadius: borderRadius.full, ...coloredGlow(BRAND) },
  broadcastFabText: { color: commonColors.white, ...typography.button, fontSize: 15 },
});
