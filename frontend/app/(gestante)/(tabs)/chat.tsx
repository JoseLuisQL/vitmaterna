import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../../src/services/api';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useToast } from '../../../src/components/ui';
import { Send, Bot, MessageCircle } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useAuthStore } from '../../../src/store/authStore';
import { openWhatsApp } from '../../../src/utils/whatsapp';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = gestanteColors.primary;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  tipo?: string;
}

export default function GestanteChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const toast = useToast();
  const { socket, isConnected, emit } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [obstetra, setObstetra] = useState<{ firstName: string; lastName: string; phone?: string | null } | null>(null);
  const flatListRef = useRef<FlatList>(null);

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

  const handleWhatsApp = async () => {
    if (!obstetra?.phone) {
      toast.info('WhatsApp no disponible', 'Tu obstetra no tiene un número registrado.');
      return;
    }
    const saludo = `Hola Obst. ${obstetra.firstName}, soy ${user?.firstName || ''}. Tengo una consulta sobre mi control prenatal.`;
    const ok = await openWhatsApp(obstetra.phone, saludo);
    if (!ok) toast.error('No se pudo abrir WhatsApp', 'Verifica que tengas WhatsApp instalado.');
  };

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

    return (
      <View style={[styles.messageBubble, isMe ? styles.messageMe : styles.messageOther]}>
        <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextOther]}>
          {item.text}
        </Text>
        <Text style={[styles.timeText, isMe ? styles.timeTextMe : styles.timeTextOther]}>
          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  if (isResolvingConv || isLoadingHistory) return <LoadingScreen message="Cargando chat..." />;

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Consultas</Text>
              <Text style={styles.headerSubtitle}>Habla con tu obstetra</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.waBtn} onPress={handleWhatsApp} activeOpacity={0.8} accessibilityLabel="Consultar por WhatsApp">
                <MessageCircle size={20} color={commonColors.surface} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.botBtn} onPress={() => router.push('/(gestante)/chatbot')} activeOpacity={0.8}>
                <Bot size={20} color={BRAND} />
                <Text style={styles.botBtnText}>Asistente 24/7</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
            <Text style={styles.emptyText}>Envía un mensaje a tu obstetra para comenzar la consulta.</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
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
          <Send size={20} color={commonColors.surface} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: {
    paddingBottom: spacing.lg,
    backgroundColor: commonColors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderBottomWidth: 1,
    borderColor: commonColors.border,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { ...typography.h1, color: commonColors.text, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: commonColors.textSecondary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#25D366', alignItems: 'center', justifyContent: 'center' },
  botBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.full, paddingHorizontal: 14, paddingVertical: 10 },
  botBtnText: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: BRAND },
  offlineBanner: { backgroundColor: commonColors.surfaceAlt, padding: spacing.sm, alignItems: 'center' },
  offlineText: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0.1, color: commonColors.textSecondary },
  listContent: { padding: spacing.lg, paddingBottom: spacing.lg },
  messageBubble: { maxWidth: '80%', padding: spacing.md, borderRadius: borderRadius.xl, marginBottom: spacing.sm + 4, borderWidth: 1, borderColor: commonColors.border },
  messageMe: { alignSelf: 'flex-end', backgroundColor: BRAND, borderBottomRightRadius: 4, borderColor: BRAND },
  messageOther: { alignSelf: 'flex-start', backgroundColor: commonColors.surface, borderBottomLeftRadius: 4 },
  messageText: { ...typography.bodyMedium, marginBottom: 6 },
  messageTextMe: { color: commonColors.surface },
  messageTextOther: { color: commonColors.text },
  timeText: { ...typography.caption, fontSize: 11, alignSelf: 'flex-end' },
  timeTextMe: { color: 'rgba(255,255,255,0.7)' },
  timeTextOther: { color: commonColors.textTertiary },
  inputContainer: { flexDirection: 'row', padding: spacing.md, backgroundColor: commonColors.surface, borderTopWidth: 1, borderColor: commonColors.border, alignItems: 'flex-end', paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.md },
  input: { flex: 1, backgroundColor: commonColors.background, borderRadius: borderRadius.xl, paddingHorizontal: spacing.lg, paddingTop: 14, paddingBottom: 14, minHeight: 48, maxHeight: 120, ...typography.bodyMedium, color: commonColors.text, borderWidth: 1, borderColor: commonColors.border },
  sendButton: { backgroundColor: BRAND, width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: spacing.sm + 4, marginBottom: 0 },
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
