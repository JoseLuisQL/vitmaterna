/**
 * VITMATERNA — Chat de la gestante (hilo único con su obstetra, estilo WhatsApp).
 *
 * La gestante tiene una sola conversación (con su obstetra), por eso entra
 * directo al hilo. Reutiliza MessageThread + ChatInput para que se vea idéntico
 * al chat del obstetra (Enter envía en web, separadores de fecha, recibos de
 * lectura, contenido educativo recomendado).
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { ChatSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import { WhatsAppIcon } from '../../../src/components/ui/WhatsAppIcon';
import { MessageThread } from '../../../src/components/shared/MessageThread';
import { ChatInput } from '../../../src/components/shared/ChatInput';
import api from '../../../src/services/api';
import { Bot } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useChat } from '../../../src/hooks/useChat';
import { useAuthStore } from '../../../src/store/authStore';
import { openWhatsApp } from '../../../src/utils/whatsapp';
import { formatLastSeen } from '../../../src/utils/lastSeen';
import { gestanteColors, commonColors, semanticColors, accentColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';

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

  const {
    messages, isLoadingHistory, isLoadingMore, hasMore,
    otherTyping, otherOnline, otherLastSeen, loadOlder, sendText, sendImage, notifyTyping,
  } = useChat({ socket, isConnected, emit, conversationId, currentUserId: user?.id, otherUserId: obstetra?.userId });

  const { isLoading: isResolvingConv } = useQuery({
    queryKey: ['chat-conversation'],
    queryFn: async () => {
      try {
        const res = await api.get('/chat/conversation');
        setConversationId(res.data.data.id);
        setObstetra(res.data.data.obstetra || null);
        return res.data.data;
      } catch (error) {
        console.warn('Failed to resolve conversation:', error);
        return null;
      }
    },
  });

  const handleWhatsApp = async () => {
    if (!obstetra?.phone) {
      toast.info('WhatsApp no disponible', 'Tu obstetra no tiene un número registrado.');
      return;
    }
    const saludo = `Hola Obst. ${obstetra.firstName}, soy ${user?.firstName || ''}. Tengo una consulta sobre mi control prenatal.`;
    const ok = await openWhatsApp(obstetra.phone, saludo);
    if (!ok) toast.error('No se pudo abrir WhatsApp', 'Verifica que tengas WhatsApp instalado.');
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

  if (isResolvingConv || (isLoadingHistory && messages.length === 0)) {
    return <View style={styles.container}><ChatSkeleton count={7} /></View>;
  }

  const statusText = otherTyping
    ? 'escribiendo…'
    : otherOnline
      ? 'En línea'
      : (otherLastSeen || obstetra?.lastSeenAt)
        ? formatLastSeen(otherLastSeen || (obstetra?.lastSeenAt ?? null))
        : isConnected ? 'Desconectada' : 'Conectando…';

  const thread = (
    <MessageThread
      messages={messages}
      currentUserId={user?.id}
      accent={BRAND}
      otherTyping={otherTyping}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      onLoadOlder={loadOlder}
      onOpenContent={(cid) => router.push(`/(gestante)/educacion/${cid}` as any)}
      emptyText="Envía un mensaje a tu obstetra para comenzar la consulta."
    />
  );

  const input = (
    <ChatInput
      value={inputText}
      onChangeText={(t) => { setInputText(t); notifyTyping(); }}
      onSend={handleSend}
      onAttach={handleAttachPhoto}
      uploading={uploading}
      accent={BRAND}
    />
  );

  // ── WEB: cabecera del ScreenLayout + hilo ──
  if (webShell) {
    return (
      <View style={styles.container}>
        <ScreenLayout
          role="gestante"
          title={obstetra ? `Obst. ${obstetra.firstName} ${obstetra.lastName}` : 'Mi obstetra'}
          subtitle={statusText}
          width="full"
          accentColor={BRAND}
          scroll={false}
          actions={
            <TouchableOpacity style={styles.webSymptomBtn} onPress={() => router.push('/(gestante)/alarmas')} accessibilityRole="button" accessibilityLabel="Reportar síntoma">
              <Bot size={16} color={commonColors.white} />
              <Text style={styles.webSymptomText}>Reportar síntoma</Text>
            </TouchableOpacity>
          }
        >
          {thread}
          {input}
        </ScreenLayout>
      </View>
    );
  }

  // ── MÓVIL: cabecera con gradiente + hilo ──
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <LinearGradient colors={gestanteColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>{obstetra ? `${obstetra.firstName?.[0] ?? ''}${obstetra.lastName?.[0] ?? ''}` : 'OB'}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.headerTitle} numberOfLines={1}>{obstetra ? `Obst. ${obstetra.firstName} ${obstetra.lastName}` : 'Mi obstetra'}</Text>
              <View style={styles.statusRow}>
                {otherOnline && !otherTyping && <View style={styles.statusDot} />}
                <Text style={[styles.headerSubtitle, otherTyping && styles.typingText]} numberOfLines={1}>{statusText}</Text>
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

      {thread}
      {input}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: { paddingBottom: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.onColorSurfaceStrong, alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { ...typography.h4, color: commonColors.white },
  headerTitle: { ...typography.h3, color: commonColors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  statusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: semanticColors.successMid },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft },
  typingText: { fontStyle: 'italic', color: commonColors.white },
  waBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: accentColors.whatsapp, alignItems: 'center', justifyContent: 'center' },
  botBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: commonColors.onColorSurface, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 9, marginTop: spacing.sm2 },
  botBtnText: { ...typography.label, fontWeight: '700', color: commonColors.white },
  webSymptomBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: BRAND, paddingHorizontal: 16, height: 36, borderRadius: borderRadius.full },
  webSymptomText: { ...typography.bodySm, fontWeight: '600', color: commonColors.white },
});
