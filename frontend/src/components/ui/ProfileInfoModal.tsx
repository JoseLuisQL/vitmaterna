import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface InfoRow {
  label: string;
  value: string;
}

interface ProfileInfoModalProps {
  visible: boolean;
  title: string;
  description?: string;
  rows?: InfoRow[];
  onClose: () => void;
}

export function ProfileInfoModal({ visible, title, description, rows = [], onClose }: ProfileInfoModalProps): React.ReactElement {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={20} color={commonColors.textSecondary} />
            </Pressable>
          </View>
          {description ? <Text style={styles.description}>{description}</Text> : null}
          {rows.length > 0 ? (
            <View style={styles.rows}>
              {rows.map((row) => (
                <View key={row.label} style={styles.row}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  <Text style={styles.rowValue}>{row.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Pressable onPress={onClose} style={styles.actionBtn} accessibilityRole="button">
            <Text style={styles.actionText}>Entendido</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: commonColors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { ...typography.h3, color: commonColors.text, flex: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surfaceAlt },
  description: { ...typography.body, color: commonColors.textSecondary, lineHeight: 24 },
  rows: { borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, overflow: 'hidden' },
  row: { padding: spacing.md, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  rowLabel: { ...typography.caption, color: commonColors.textSecondary, marginBottom: 2 },
  rowValue: { ...typography.bodyMedium, color: commonColors.text },
  actionBtn: { backgroundColor: semanticColors.info, borderRadius: borderRadius.md, paddingVertical: 13, alignItems: 'center' },
  actionText: { ...typography.buttonSmall, color: commonColors.white },
});
