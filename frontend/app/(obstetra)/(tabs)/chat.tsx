import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import api from '../../../src/services/api';
import { AppHeader } from '../../../src/components/ui/AppHeader';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { Send, ChevronLeft, User, MessageSquare, Megaphone } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
  tipo?: string;
}

export default function ObstetraChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { socket, isConnected, emit } = useSocket();
  const [activeConv, setActiveConv] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

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

  const handleBack = () => {
    setActiveConv(null);
    setMessages([]);
    refetchConvs();
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
              <Text style={styles.emptyText}>No tienes consultas o chats activos con gestantes en este momento.</Text>
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
    paddingBottom: 24,
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
