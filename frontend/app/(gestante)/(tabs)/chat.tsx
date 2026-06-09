import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { Send } from 'lucide-react-native';
import { useSocket } from '../../../src/hooks/useSocket';
import { useAuthStore } from '../../../src/store/authStore';
import { typography } from '../../../src/theme/typography';

interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export default function GestanteChatScreen() {
  const { user } = useAuthStore();
  const { socket, isConnected, emit } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const { isLoading: isResolvingConv } = useQuery({
    queryKey: ['chat-conversation'],
    queryFn: async () => {
      try {
        const res = await api.get('/chat/conversation');
        const convId = res.data.data.id;
        setConversationId(convId);
        return res.data.data;
      } catch (error) {
        console.warn('Failed to resolve conversation:', error);
        return null;
      }
    },
  });

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
          <Text style={styles.headerTitle}>Consultas</Text>
          <Text style={styles.headerSubtitle}>Habla con tu obstetra</Text>
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
          placeholderTextColor="#94A3B8"
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]} 
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Send size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { fontFamily: typography.h1.fontFamily, fontSize: 28, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  headerSubtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#64748B' },
  offlineBanner: { backgroundColor: '#F1F5F9', padding: 8, alignItems: 'center' },
  offlineText: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: '#64748B' },
  listContent: { padding: 20, paddingBottom: 24 },
  messageBubble: { maxWidth: '80%', padding: 16, borderRadius: 24, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  messageMe: { alignSelf: 'flex-end', backgroundColor: '#7C3AED', borderBottomRightRadius: 4 },
  messageOther: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4 },
  messageText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, marginBottom: 6, lineHeight: 22 },
  messageTextMe: { color: '#FFFFFF' },
  messageTextOther: { color: '#0F172A' },
  timeText: { fontFamily: typography.caption.fontFamily, fontSize: 11, alignSelf: 'flex-end' },
  timeTextMe: { color: 'rgba(255,255,255,0.7)' },
  timeTextOther: { color: '#94A3B8' },
  inputContainer: { flexDirection: 'row', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#F1F5F9', alignItems: 'flex-end', paddingBottom: Platform.OS === 'ios' ? 32 : 16 },
  input: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, minHeight: 48, maxHeight: 120, fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#0F172A', borderWidth: 1, borderColor: '#E2E8F0' },
  sendButton: { backgroundColor: '#7C3AED', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginLeft: 12, marginBottom: 0, shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  sendButtonDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  emptyText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 }
});
