import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api, { resolveMediaUrl } from '../../../src/services/api';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { AppModal, useToast } from '../../../src/components/ui';
import { usePatients } from '../../../src/services/api-queries';
import { Send, ChevronLeft, User, MessageSquare, Megaphone, ImagePlus, Plus, Search } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  tipo?: string;
  mediaUrl?: string | null;
}

export default function ObstetraChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();
  const { socket, isConnected, emit } = useSocket();
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [startingChat, setStartingChat] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Gestantes asignadas a esta obstetra (para iniciar una conversación nueva).
  const { data: patients = [] } = usePatients();

  // 1. Fetch active conversations for this obstetra
  const { data: conversations, isLoading: isLoadingConvs, refetch: refetchConvs } = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => {
      try {
        const res = await api.get('/chat/conversations');
        return res.data.data || [];
      } catch (error) {
        console.warn('Failed to load conversations:', error);
        return [];
      }
    },
  });

  // 2. Fetch history for active conversation
  const conversationId = activeConv?.id || null;
  const { isLoading: isLoadingHistory } = useQuery({
    queryKey: ['chat-history', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      try {
        const res = await api.get(`/chat/history/${conversationId}`);
        const history = res.data.data || [];
        const mappedHistory = history.map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          text: m.contenido,
          createdAt: m.createdAt,
          tipo: m.tipo,
          mediaUrl: m.mediaUrl,
        }));
        const sortedHistory = [...mappedHistory].reverse();
        setMessages(sortedHistory);
        return sortedHistory;
      } catch (error) {
        return [];
      }
    },
    enabled: !!conversationId,
  });

  // 3. Socket listener for active conversation
  useEffect(() => {
    if (socket && conversationId) {
      emit('join_conversation', conversationId);

      socket.on('receive_message', (message: any) => {
        const chatMsg: ChatMessage = {
          id: message.id,
          senderId: message.senderId,
          text: message.contenido,
          createdAt: message.createdAt,
          tipo: message.tipo,
          mediaUrl: message.mediaUrl,
        };

        setMessages(prev => {
          if (prev.some(m => m.id === chatMsg.id)) return prev;
          const filtered = prev.filter(m => !(m.senderId === 'me' && m.text === chatMsg.text && m.id.length < 15));
          return [...filtered, chatMsg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });
    }

    return () => {
      if (socket) {
        socket.off('receive_message');
        if (conversationId) {
          emit('leave_conversation', conversationId);
        }
      }
    };
  }, [socket, conversationId]);

  const handleSend = () => {
    if (!inputText.trim() || !conversationId) return;

    const newMessage = { conversationId, content: inputText.trim(), type: 'texto' };
    emit('send_message', newMessage);

    const optimisticMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user?.id || 'me',
      text: inputText.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
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

      emit('send_message', { conversationId, content: '📷 Foto', type: 'imagen', mediaUrl });

      const optimistic: ChatMessage = {
        id: Date.now().toString(),
        senderId: user?.id || 'me',
        text: '📷 Foto',
        createdAt: new Date().toISOString(),
        tipo: 'imagen',
        mediaUrl,
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      toast.error('No se pudo enviar la foto', 'Inténtalo nuevamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleBack = () => {
    setActiveConv(null);
    setMessages([]);
    refetchConvs();
  };

  // Inicia (o abre) la conversación con una gestante asignada.
  const startChatWith = async (gestanteId: string, nombre: string) => {
    if (startingChat) return;
    setStartingChat(true);
    try {
      const res = await api.get('/chat/conversation', { params: { targetId: gestanteId } });
      const conv = res.data?.data;
      if (!conv?.id) throw new Error('sin conversación');
      setPickerVisible(false);
      setPickerSearch('');
      setMessages([]);
      setActiveConv({ ...conv, gestante: { user: { firstName: nombre } } });
    } catch (e) {
      toast.error('No se pudo abrir el chat', 'Inténtalo nuevamente.');
    } finally {
      setStartingChat(false);
    }
  };

  const filteredPatients = (patients || []).filter((p: any) => {
    const q = pickerSearch.toLowerCase();
    return (
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      String(p.documentNumber || '').includes(pickerSearch)
    );
  });

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMe = item.senderId === user?.id || item.senderId === 'me';
    const isAlert = item.tipo === 'alerta_emergencia';

    if (isAlert) {
      return (
        <View style={styles.emergencyMessageBubble}>
          <Text style={styles.emergencyMessageText}>
            {item.text}
          </Text>
          <Text style={styles.emergencyTimeText}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
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
        <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const renderConvItem = ({ item }: { item: any }) => {
    const patientName = `${item.gestante?.user?.firstName || 'Gestante'} ${item.gestante?.user?.lastName || ''}`;
    const dni = item.gestante?.user?.dni || '';
    const lastMsg = item.messages?.[0]?.contenido || 'No hay mensajes aún';
    const lastMsgTime = item.messages?.[0]?.createdAt 
      ? new Date(item.messages[0].createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : '';

    return (
      <TouchableOpacity 
        style={styles.convItem} 
        onPress={() => setActiveConv(item)}
      >
        <View style={styles.convAvatar}>
          <User size={22} color={BRAND} />
        </View>
        <View style={styles.convInfo}>
          <View style={styles.convHeaderRow}>
            <Text style={styles.convName} numberOfLines={1}>{patientName}</Text>
            <Text style={styles.convTime}>{lastMsgTime}</Text>
          </View>
          <Text style={styles.convDni}>DNI: {dni}</Text>
          <Text style={styles.convLastMsg} numberOfLines={1}>{lastMsg}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (!activeConv) {
    if (isLoadingConvs) return <LoadingScreen message="Cargando consultas..." />;

    return (
      <View style={styles.container}>
        <AppHeader title="Bandeja de Consultas" />

        {/* Iniciar conversación con una gestante asignada */}
        <TouchableOpacity style={styles.newChatBtn} onPress={() => setPickerVisible(true)} activeOpacity={0.85}>
          <Plus size={18} color={obstetraColors.onPrimary} />
          <Text style={styles.newChatBtnText}>Nueva conversación</Text>
        </TouchableOpacity>

        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderConvItem}
          contentContainerStyle={styles.listContent}
          refreshing={isLoadingConvs}
          onRefresh={refetchConvs}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageSquare size={48} color={commonColors.textTertiary} style={{ marginBottom: 16 }} />
              <Text style={styles.emptyText}>Aún no tienes chats activos. Pulsa "Nueva conversación" para escribir a una gestante asignada.</Text>
            </View>
          }
        />
        <TouchableOpacity
          style={styles.broadcastFab}
          onPress={() => router.push('/(obstetra)/mensaje-masivo')}
          activeOpacity={0.85}
        >
          <Megaphone size={20} color={obstetraColors.onPrimary} />
          <Text style={styles.broadcastFabText}>Mensaje masivo</Text>
        </TouchableOpacity>

        {/* Selector de gestante para iniciar chat */}
        <AppModal
          visible={pickerVisible}
          onClose={() => setPickerVisible(false)}
          title="Nueva conversación"
          subtitle="Selecciona una gestante para iniciar el chat."
        >
          <View style={styles.searchBox}>
            <Search size={18} color={commonColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o DNI..."
              placeholderTextColor={commonColors.textTertiary}
              value={pickerSearch}
              onChangeText={setPickerSearch}
            />
          </View>
          <View style={{ maxHeight: 360 }}>
            {filteredPatients.length === 0 ? (
              <Text style={styles.pickerEmpty}>No se encontraron gestantes.</Text>
            ) : (
              filteredPatients.map((p: any) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.pickerRow}
                  onPress={() => startChatWith(p.id, `${p.firstName} ${p.lastName}`)}
                  disabled={startingChat}
                >
                  <View style={styles.pickerAvatar}>
                    <Text style={styles.pickerAvatarText}>{(p.firstName || '?')[0]}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerName}>{p.firstName} {p.lastName}</Text>
                    <Text style={styles.pickerDni}>DNI: {p.documentNumber}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </AppModal>
      </View>
    );
  }

  if (isLoadingHistory) return <LoadingScreen message="Cargando chat..." />;

  const activePatientName = `${activeConv.gestante?.user?.firstName || 'Gestante'} ${activeConv.gestante?.user?.lastName || ''}`;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.activeChatHeader}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={commonColors.text} />
        </TouchableOpacity>
        <View style={styles.activeHeaderTitleWrap}>
          <Text style={styles.activeHeaderTitle} numberOfLines={1}>{activePatientName}</Text>
          <Text style={styles.activeHeaderSubtitle}>DNI: {activeConv.gestante?.user?.dni || ''}</Text>
        </View>
      </View>
      
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Conectando al chat...</Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No hay mensajes en esta conversación. Envía uno para comenzar.</Text>
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
          {uploading ? <ActivityIndicator size="small" color={BRAND} /> : <ImagePlus size={22} color={BRAND} />}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Escribe tu mensaje..."
          placeholderTextColor={commonColors.textTertiary}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={20} color={obstetraColors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: layout.tabBarSpace,
  },
  convItem: {
    flexDirection: 'row',
    backgroundColor: commonColors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: commonColors.border,
    alignItems: 'center',
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  convInfo: {
    flex: 1,
  },
  convHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  convName: {
    ...typography.bodyMedium,
    color: commonColors.text,
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textTertiary,
  },
  convDni: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
    marginBottom: 4,
  },
  convLastMsg: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  activeChatHeader: {
    flexDirection: 'row',
    backgroundColor: commonColors.surface,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
    alignItems: 'center',
  },
  backBtn: {
    padding: 6,
    marginRight: 10,
  },
  activeHeaderTitleWrap: {
    flex: 1,
  },
  activeHeaderTitle: {
    ...typography.h3,
    color: commonColors.text,
  },
  activeHeaderSubtitle: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
    marginTop: 1,
  },
  offlineBanner: {
    backgroundColor: commonColors.surfaceAlt,
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  messageMe: {
    alignSelf: 'flex-end',
    backgroundColor: BRAND,
    borderBottomRightRadius: 4,
  },
  messageOther: {
    alignSelf: 'flex-start',
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderBottomLeftRadius: 4,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: commonColors.surfaceAlt,
  },
  messageText: {
    ...typography.bodySmall,
    fontSize: 15,
    marginBottom: 4,
  },
  messageTextMe: {
    color: obstetraColors.onPrimary,
  },
  messageTextOther: {
    color: commonColors.text,
  },
  timeText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: obstetraColors.primaryLight,
  },
  timeTextOther: {
    color: commonColors.textTertiary,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: commonColors.surface,
    borderTopWidth: 1,
    borderColor: commonColors.border,
    alignItems: 'flex-end',
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: obstetraColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 40,
    maxHeight: 120,
    ...typography.bodySmall,
    fontSize: 15,
    color: commonColors.text,
  },
  sendButton: {
    backgroundColor: BRAND,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginBottom: 2,
  },
  sendButtonDisabled: {
    backgroundColor: commonColors.disabled,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyText: {
    ...typography.bodySmall,
    fontSize: 15,
    color: commonColors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  broadcastFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 99,
    ...shadows.md,
  },
  broadcastFabText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
  newChatBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: BRAND, marginHorizontal: 20, marginTop: 12, marginBottom: 4,
    paddingVertical: 12, borderRadius: 14,
  },
  newChatBtnText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1, borderColor: commonColors.border, borderRadius: 14, paddingHorizontal: 14, height: 48, marginBottom: 12,
  },
  searchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  pickerEmpty: { ...typography.bodySmall, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: 24 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  pickerAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  pickerAvatarText: { ...typography.bodyMedium, color: commonColors.textSecondary, fontWeight: '700' },
  pickerName: { ...typography.bodyMedium, color: commonColors.text },
  pickerDni: { ...typography.caption, color: commonColors.textTertiary },
  emergencyMessageBubble: {
    alignSelf: 'center',
    backgroundColor: semanticColors.dangerLight,
    borderWidth: 1.5,
    borderColor: semanticColors.danger,
    borderRadius: 16,
    padding: 14,
    marginVertical: 8,
    width: '95%',
  },
  emergencyMessageText: {
    ...typography.bodySmall,
    fontSize: 15,
    fontWeight: '700',
    color: semanticColors.danger,
    lineHeight: 22,
  },
  emergencyTimeText: {
    color: semanticColors.danger,
    ...typography.overline,
    letterSpacing: 0.1,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
});
