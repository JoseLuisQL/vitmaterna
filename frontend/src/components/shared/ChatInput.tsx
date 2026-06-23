/**
 * VITMATERNA — ChatInput (barra de redacción del chat, estilo WhatsApp)
 *
 * Barra única reutilizada por la gestante y el obstetra para escribir mensajes.
 * Consistencia total: botón adjuntar, campo multilínea y botón enviar.
 *
 * Paridad con WhatsApp (CHAT-04): en WEB, Enter envía y Shift+Enter inserta un
 * salto de línea. En móvil/nativo se usa el botón enviar (el teclado del
 * dispositivo controla el salto de línea).
 */
import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Pressable } from 'react-native';
import { Send, ImagePlus } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { haptics } from '../../utils/haptics';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  /** Adjuntar foto (opcional). */
  onAttach?: () => void;
  uploading?: boolean;
  accent: string;
  placeholder?: string;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  uploading = false,
  accent,
  placeholder = 'Escribe un mensaje...',
}: Props): React.ReactElement {
  const canSend = value.trim().length > 0 && !uploading;

  // Enviar con feedback háptico (móvil) y reseteo del estado.
  const handleSend = () => {
    if (!canSend) return;
    haptics.light();
    onSend();
  };

  // CHAT-04: en web, Enter envía; Shift+Enter = salto de línea.
  const handleKeyPress = (e: any) => {
    if (Platform.OS !== 'web') return;
    if (e?.nativeEvent?.key === 'Enter' && !e?.nativeEvent?.shiftKey) {
      e.preventDefault?.();
      handleSend();
    }
  };

  return (
    <View style={styles.container}>
      {onAttach && (
        <TouchableOpacity
          style={[styles.attach, { backgroundColor: accent + '1A' }]}
          onPress={onAttach}
          disabled={uploading}
          accessibilityRole="button"
          accessibilityLabel="Adjuntar foto"
        >
          {uploading ? <ActivityIndicator size="small" color={accent} /> : <ImagePlus size={22} color={accent} />}
        </TouchableOpacity>
      )}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onKeyPress={handleKeyPress}
        placeholder={placeholder}
        placeholderTextColor={commonColors.textTertiary}
        multiline
        maxLength={1000}
        {...(Platform.OS === 'web' ? ({ blurOnSubmit: false } as any) : {})}
      />
      <Pressable
        style={({ pressed }: any) => [
          styles.send,
          { backgroundColor: canSend ? accent : commonColors.disabled },
          pressed && canSend && styles.sendPressed,
        ]}
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Enviar mensaje"
      >
        <Send size={20} color={commonColors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.sm2,
    backgroundColor: commonColors.surface,
    borderTopWidth: 1,
    borderColor: commonColors.borderLight,
    paddingBottom: Platform.OS === 'ios' ? spacing.xl : spacing.sm2,
  },
  attach: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.xxl,
    paddingHorizontal: spacing.md,
    paddingTop: 12,
    paddingBottom: 12,
    minHeight: 44,
    maxHeight: 120,
    ...typography.body,
    color: commonColors.text,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendPressed: { transform: [{ scale: 0.92 }], opacity: 0.9 },
});

export default ChatInput;
