import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { ChatSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import { WhatsAppIcon } from '../../../src/components/ui/WhatsAppIcon';
import { TypingDots } from '../../../src/components/shared/TypingDots';
import { EmergencyMessageCard } from '../../../src/components/shared/EmergencyMessageCard';
import api, { resolveMediaUrl } from '../../../src/services/api';
import { Send, Bot, ImagePlus, Check, CheckCheck, ChevronRight } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useChat, type ChatMessage } from '../../../src/hooks/useChat';
import { categoryMeta, typeMeta } from '../../../src/utils/educationMeta';
import { useAuthStore } from '../../../src/store/authStore';
import { openWhatsApp } from '../../../src/utils/whatsapp';
import { formatLastSeen } from '../../../src/utils/lastSeen';
import { gestanteColors, commonColors, semanticColors, accentColors, chatColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { shadows } from '../../../src/theme/shadows';

const BRAND = gestanteColors.primary;

export default function GestanteChatScreen() {
  const router = useRouter();
  const { webShell } = useResponsive();
  const { user } = useAuthStore();
  const toast = useToast();
  const { socket, isConnected, emit } = useSocket();
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [obstetra, setObstetra] = useState<{ userId?: string; firstName: string; lastName: string; phone?: string | null; lastSeenAt?: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    messages, isLoadingHistory, isLoadingMore, hasMore,
    otherTyping, otherOnline, otherLastSeen, loadOlder, sendText, sendImage, notifyTyping,
  } = useChat({ socket, isConnected, emit, conversationId, currentUserId: user?.id, otherUserId: obstetra?.userId });

  const { isLoading: isResolvingConv } = useQuery({
    queryKey: ['chat-conversation'],
    queryFn: async () => {
      try {
        const res = await api.get('/chat/conversation');
        const convId = res.data.data.id;
        setConversationId(convId);
        setObstetra(res.data.data.obstetra || null);
        return res.data.data;
      } catch (error) {
        console.warn('Failed to resolve conversation:', error);
        return null;
      }
    },
  });

  // Control del auto-scroll al final. Usamos onContentSizeChange (se dispara
  // cuando el contenido YA está medido) en vez de un setTimeout fijo, que
  // fallaba al abrir el chat porque los items aún no tenían su altura final.
  const didInitialScroll = useRef(false);
  const handleContentSizeChange = () => {
    if (isLoadingMore) return; // al cargar mensajes antiguos no saltar al final
    // Carga inicial: salto instantáneo (sin animación) para abrir abajo directo.
    flatListRef.current?.scrollToEnd({ animated: didInitialScroll.current });
    didInitialScroll.current = true;
  };

  const handleWhatsApp = async () => {
    if (!obstetra?.phone) {
      toast.info('WhatsApp no disponible', 'Tu obstetra no tiene un número registrado.');
      return;
    }
    const saludo = `Hola Obst. ${obstetra.firstName}, soy ${user?.firstName || ''}. Tengo una consulta sobre mi control prenatal.`;
    const ok = await openWhatsApp(obstetra.phone, saludo);
    if (!ok) toast.error('No se pudo abrir WhatsApp', 'Verifica que tengas WhatsApp instalado.');
  };

  const handleTyping = (text: string) => {
    setInputText(text);
    notifyTyping();
  };

  const handleSend = () => {
    if (!inputText.trim() || !conversationId) return;
    sendText(inputText);
    setInputText('');
  };

  const handleAttachPhoto = async () => {
    if (!conversationId || uploading) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.info('Permiso requerido', 'Permite el acceso a tus fotos para enviar imágenes.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.6,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.base64) return;

      setUploading(true);
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      const res = await api.post('/chat/upload', { base64: asset.base64, mimeType });
      const mediaUrl = res.data?.data?.mediaUrl;
      if (!mediaUrl) throw new Error('upload failed');
      sendImage(mediaUrl);
    } catch (e) {
      toast.error('No se pudo enviar la foto', 'Inténtalo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id || item.senderId === 'me';
    const isAlert = item.tipo === 'alerta_emergencia';

    if (isAlert) {
      return (
        <EmergencyMessageCard
          text={item.text}
          time={new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          mapsUrl={item.mediaUrl}
        />
      );
    }

    // Mensaje de contenido educativo recomendado: tarjeta clickeable que lleva
    // directamente al recurso (deep-link robusto vía /educacion/:id).
    if (item.tipo === 'educacion' && item.content) {
      const cm = categoryMeta(item.content.categoria);
      const tm = typeMeta(item.content.tipo);
      const CIcon = cm.icon;
      return (
        <View style={[styles.messageBubble, styles.messageOther, styles.eduBubble]}>
          {!!item.text && (
            <Text style={[styles.messageText, styles.messageTextOther, { marginBottom: spacing.sm }]}>{item.text}</Text>
          )}
          <TouchableOpacity
            style={styles.eduCard}
            activeOpacity={0.8}
            onPress={() => router.push(`/(gestante)/educacion/${item.content!.id}` as any)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir contenido: ${item.content.titulo}`}
          >
            {item.content.thumbnailUrl ? (
              <Image source={{ uri: resolveMediaUrl(item.content.thumbnailUrl) || undefined }} style={styles.eduThumb} resizeMode="cover" />
            ) : (
              <View style={[styles.eduIconBox, { backgroundColor: cm.bg }]}>
                <CIcon size={22} color={cm.color} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.eduCategory, { color: cm.color }]} numberOfLines={1}>{cm.label}</Text>
              <Text style={styles.eduTitle} numberOfLines={2}>{item.content.titulo}</Text>
              <Text style={styles.eduMeta} numberOfLines={1}>
                {tm.label}{item.content.duracionMin ? ` · ${item.content.duracionMin} min` : ''} · Toca para leer
              </Text>
            </View>
            <ChevronRight size={18} color={commonColors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.metaRow}>
            <Text style={[styles.timeText, styles.timeTextOther]}>
              {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      );
    }

    const isImage = item.tipo === 'imagen' && item.mediaUrl;

    return (
      <View style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageOther]}>
        {isImage ? (
          <Image
            source={{ uri: resolveMediaUrl(item.mediaUrl) || undefined }}
            style={styles.messageImage}
            resizeMode="cover"
            accessibilityLabel="Foto enviada en el chat"
          />
        ) : (
          <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
            {item.text}
          </Text>
        )}
        <View style={styles.metaRow}>
          <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {/* Estado de envío / visto (solo en mis mensajes) */}
          {isMe && (
            item.pending ? (
              <Check size={13} color={chatColors.tickOnBubble} />
            ) : item.leido ? (
              <CheckCheck size={14} color={chatColors.readReceipt} />
            ) : (
              <CheckCheck size={14} color={chatColors.tickOnBubble} />
            )
          )}
        </View>
      </View>
    );
  };

  if (isResolvingConv || (isLoadingHistory && messages.length === 0)) {
    return <View style={[styles.container, webShell && styles.containerWeb]}><ChatSkeleton count={7} /></View>;
  }

  const typingStatusText = otherTyping ? 'escribiendo…' :
    otherOnline ? 'En línea' :
    (otherLastSeen || obstetra?.lastSeenAt ? formatLastSeen(otherLastSeen || obstetra?.lastSeenAt) : isConnected ? 'Desconectada' : 'Conectando…');

  const mainContent = (
    <>
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={handleContentSizeChange}
        onStartReached={hasMore ? loadOlder : undefined}
        onStartReachedThreshold={0.2}
        ListHeaderComponent={
          isLoadingMore ? (
            <ActivityIndicator size="small" color={BRAND} style={{ marginVertical: spacing.md }} />
          ) : null
        }
        ListFooterComponent={otherTyping ? <TypingDots color={commonColors.textSecondary} /> : null}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Envía un mensaje a tu obstetra para comenzar la consulta.</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleAttachPhoto}
          disabled={uploading}
          accessibilityLabel="Adjuntar foto"
        >
          {uploading ? (
            <ActivityIndicator size="small" color={BRAND} />
          ) : (
            <ImagePlus size={22} color={BRAND} />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Escribe un mensaje..."
          placeholderTextColor={commonColors.textTertiary}
          value={inputText}
          onChangeText={handleTyping}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, !inputText.trim() && !uploading && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || uploading}
          accessibilityLabel="Enviar mensaje"
        >
          <Send size={18} color={(!inputText.trim() && !uploading) ? commonColors.textTertiary : commonColors.white} />
        </TouchableOpacity>
      </View>
    </>
  );

  if (webShell) {
    return (
      <View style={styles.containerWeb}>
        <ScreenLayout
          role="gestante"
          title={obstetra ? `Obst. ${obstetra.firstName} ${obstetra.lastName}` : 'Mi obstetra'}
          subtitle={typingStatusText}
          width="full"
          accentColor={BRAND}
          scroll={false}
          actions={
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND, paddingHorizontal: 16, height: 36, borderRadius: 18, gap: 8 }} onPress={() => router.push('/(gestante)/alarmas')}>
              <Bot size={16} color={commonColors.white} />
              <Text style={{ ...typography.bodySm, fontWeight: '600', color: commonColors.white }}>Reportar síntoma</Text>
            </TouchableOpacity>
          }
        >
          {mainContent}
        </ScreenLayout>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LinearGradient
        colors={gestanteColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {obstetra ? `${obstetra.firstName?.[0] ?? ''}${obstetra.lastName?.[0] ?? ''}` : 'OB'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {obstetra ? `Obst. ${obstetra.firstName} ${obstetra.lastName}` : 'Mi obstetra'}
              </Text>
              <View style={styles.statusRow}>
                {otherTyping ? (
                  <Text style={[styles.headerSubtitle, styles.typingText]}>escribiendo…</Text>
                ) : otherOnline ? (
                  <>
                    <View style={[styles.statusDot, { backgroundColor: semanticColors.successMid }]} />
                    <Text style={styles.headerSubtitle}>En línea</Text>
                  </>
                ) : (
                  <Text style={styles.headerSubtitle} numberOfLines={1}>
                    {typingStatusText}
                  </Text>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp} activeOpacity={0.8} accessibilityLabel="Consultar por WhatsApp" accessibilityRole="button">
              <WhatsAppIcon size={22} color={commonColors.white} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.botBtn} onPress={() => router.push('/(gestante)/alarmas')} activeOpacity={0.85}>
            <Bot size={18} color={commonColors.white} />
            <Text style={styles.botBtnText}>Reportar un síntoma a mi obstetra</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </LinearGradient>

      {mainContent}
    </KeyboardAvoidingView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  containerWeb: { width: '100%', maxWidth: webLayout.contentMaxWidth.lg, alignSelf: 'center', borderLeftWidth: 1, borderRightWidth: 1, borderColor: commonColors.border },
  headerGradient: {
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: commonColors.onColorSurfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: { ...typography.h4, color: commonColors.white },
  headerTitle: { ...typography.h3, color: commonColors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft },
  typingText: { fontStyle: 'italic', color: commonColors.white },
  waBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: accentColors.whatsapp, alignItems: 'center', justifyContent: 'center' },
  botBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: commonColors.onColorSurface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: spacing.sm2,
  },
  botBtnText: { ...typography.label, fontWeight: '700', color: commonColors.white },
  listContent: { padding: spacing.lg, paddingBottom: spacing.lg },
  messageBubble: { maxWidth: '78%', paddingHorizontal: spacing.md, paddingVertical: spacing.sm2, borderRadius: borderRadius.xl, marginBottom: spacing.sm2 },
  messageMe: { alignSelf: 'flex-end', backgroundColor: BRAND, borderBottomRightRadius: borderRadius.xs, ...shadows.card },
  messageOther: { alignSelf: 'flex-start', backgroundColor: commonColors.surface, borderBottomLeftRadius: borderRadius.xs, ...shadows.card },
  messageImage: { width: 200, height: 200, borderRadius: borderRadius.lg, marginBottom: 6, backgroundColor: commonColors.surfaceAlt },
  // Tarjeta de contenido educativo recomendado
  eduBubble: { maxWidth: '86%', paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm2 },
  eduCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.sm2, borderWidth: 1, borderColor: commonColors.border },
  eduThumb: { width: 46, height: 46, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceHover },
  eduIconBox: { width: 46, height: 46, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  eduCategory: { ...typography.overline, fontSize: 10, marginBottom: 2 },
  eduTitle: { ...typography.bodySmall, fontWeight: '700', color: commonColors.text, lineHeight: 18 },
  eduMeta: { ...typography.caption, fontSize: 11, color: commonColors.textSecondary, marginTop: 2 },
  messageText: { ...typography.body, marginBottom: 4 },
  messageTextMe: { color: commonColors.white },
  messageTextOther: { color: commonColors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end' },
  timeText: { ...typography.caption, fontSize: 11 },
  timeTextMe: { color: chatColors.timeOnBubble },
  timeTextOther: { color: commonColors.textTertiary },
  inputContainer: { flexDirection: 'row', padding: spacing.sm2, backgroundColor: commonColors.surface, borderTopWidth: 1, borderColor: commonColors.borderLight, alignItems: 'flex-end', paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm2 },
  attachButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: gestanteColors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  input: { flex: 1, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.xxl, paddingHorizontal: spacing.md, paddingTop: 12, paddingBottom: 12, minHeight: 44, maxHeight: 120, ...typography.body, color: commonColors.text },
  sendButton: { backgroundColor: BRAND, width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm, ...shadows.card },
  sendButtonDisabled: { backgroundColor: commonColors.disabled },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.xl, lineHeight: 22 },
  emergencyMessageBubble: {
    alignSelf: 'center',
    backgroundColor: semanticColors.dangerLight,
    borderWidth: 1.5,
    borderColor: semanticColors.danger,
    borderRadius: borderRadius.lg,
    padding: 14,
    marginVertical: spacing.sm,
    width: '95%',
  },
  emergencyMessageText: {
    color: semanticColors.danger,
    ...typography.bodySmall,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  emergencyTimeText: {
    color: semanticColors.danger,
    ...typography.caption,
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-end',
    marginTop: 6,
  },
});
