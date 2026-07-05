import React, { ReactNode } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing } from '../../../src/theme/spacing';

const LIST_WIDTH = 380;

interface ChatMasterDetailLayoutProps {
  listColumn: ReactNode;
  threadColumn: ReactNode | null;
  activeId: string | null;
  placeholderTitle?: string;
  placeholderText?: string;
}

export function ChatMasterDetailLayout({
  listColumn,
  threadColumn,
  activeId,
  placeholderTitle = 'Selecciona una conversación',
  placeholderText = 'Elige un contacto de la lista para ver y responder los mensajes.',
}: ChatMasterDetailLayoutProps) {
  return (
    <View style={styles.webShell}>
      {/* Columna izquierda: lista */}
      <View style={styles.webListCol}>
        {listColumn}
      </View>

      {/* Columna derecha: hilo o estado vacío */}
      <View style={styles.webThreadCol}>
        {activeId && threadColumn ? (
          threadColumn
        ) : (
          <View style={styles.webPlaceholder}>
            <MessageSquare size={56} color={commonColors.textTertiary} />
            <Text style={styles.webPlaceholderTitle}>{placeholderTitle}</Text>
            <Text style={styles.webPlaceholderText}>{placeholderText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webShell: { 
    flex: 1, 
    flexDirection: 'row', 
    backgroundColor: commonColors.background 
  },
  webListCol: { 
    width: LIST_WIDTH, 
    borderRightWidth: 1, 
    borderRightColor: commonColors.border, 
    backgroundColor: commonColors.surface 
  },
  webThreadCol: { 
    flex: 1, 
    minWidth: 0 
  },
  webPlaceholder: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: spacing.xl, 
    gap: spacing.sm 
  },
  webPlaceholderTitle: { 
    ...typography.h3, 
    color: commonColors.text, 
    marginTop: spacing.sm 
  },
  webPlaceholderText: { 
    ...typography.bodySm, 
    color: commonColors.textSecondary, 
    textAlign: 'center', 
    maxWidth: 360 
  },
});
