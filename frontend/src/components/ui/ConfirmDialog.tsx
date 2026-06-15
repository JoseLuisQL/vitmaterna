/**
 * VITMATERNA — ConfirmDialog y ValidationModal
 *
 * Modales propios y consistentes (web + nativo) para confirmar acciones y
 * mostrar errores de validación, en lugar de los diálogos nativos del
 * navegador/OS (window.confirm/alert) que se ven pobres y desentonan.
 *
 * Uso recomendado vía el provider/hook (useConfirm) — ver ConfirmProvider —
 * pero los componentes también pueden usarse de forma controlada.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { AlertTriangle, CheckCircle2, Info, Trash2, type LucideIcon } from 'lucide-react-native';
import { AppModal } from './AppModal';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

export type ConfirmTone = 'default' | 'danger' | 'info' | 'success';

const TONE: Record<ConfirmTone, { color: string; bg: string; icon: LucideIcon }> = {
  default: { color: semanticColors.warning, bg: semanticColors.warningLight, icon: AlertTriangle },
  danger: { color: semanticColors.danger, bg: semanticColors.dangerLight, icon: Trash2 },
  info: { color: semanticColors.info, bg: semanticColors.infoLight, icon: Info },
  success: { color: semanticColors.success, bg: semanticColors.successLight, icon: CheckCircle2 },
};

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación con icono temático y dos acciones. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  tone = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps): React.ReactElement {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <AppModal visible={visible} onClose={onCancel} dismissable scroll={false}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: t.bg }]}>
          <Icon size={28} color={t.color} />
        </View>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
      <View style={styles.actions}>
        <Pressable
          style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
          onPress={onCancel}
          accessibilityRole="button"
          accessibilityLabel={cancelText}
        >
          <Text style={styles.btnGhostText}>{cancelText}</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, { backgroundColor: t.color }, pressed && styles.pressed]}
          onPress={onConfirm}
          accessibilityRole="button"
          accessibilityLabel={confirmText}
        >
          <Text style={styles.btnPrimaryText}>{confirmText}</Text>
        </Pressable>
      </View>
    </AppModal>
  );
}

interface ValidationModalProps {
  visible: boolean;
  title?: string;
  /** Lista de errores a mostrar. */
  errors: string[];
  onClose: () => void;
  closeText?: string;
}

/** Modal para mostrar errores de validación de formularios. */
export function ValidationModal({
  visible,
  title = 'Revisa los datos',
  errors,
  onClose,
  closeText = 'Entendido',
}: ValidationModalProps): React.ReactElement {
  return (
    <AppModal visible={visible} onClose={onClose} dismissable scroll={false}>
      <View style={styles.center}>
        <View style={[styles.iconWrap, { backgroundColor: semanticColors.dangerLight }]}>
          <AlertTriangle size={28} color={semanticColors.danger} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <View style={styles.errorList}>
        {errors.map((e, i) => (
          <View key={i} style={styles.errorItem}>
            <View style={styles.errorDot} />
            <Text style={styles.errorText}>{e}</Text>
          </View>
        ))}
      </View>
      <Pressable
        style={({ pressed }) => [styles.btn, styles.btnFull, { backgroundColor: semanticColors.danger }, pressed && styles.pressed]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={closeText}
      >
        <Text style={styles.btnPrimaryText}>{closeText}</Text>
      </Pressable>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  title: { ...typography.h3, color: commonColors.text, textAlign: 'center' },
  message: { ...typography.body, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22 },

  actions: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, height: 50, borderRadius: borderRadius.full, alignItems: 'center', justifyContent: 'center' },
  btnFull: { width: '100%' },
  pressed: { opacity: 0.85 },
  btnGhost: { backgroundColor: commonColors.surfaceAlt },
  btnGhostText: { ...typography.button, color: commonColors.textSecondary },
  btnPrimaryText: { ...typography.button, color: commonColors.white },

  errorList: { gap: spacing.sm, marginBottom: spacing.lg },
  errorItem: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  errorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: semanticColors.danger, marginTop: 8 },
  errorText: { ...typography.bodySmall, color: commonColors.text, flex: 1, lineHeight: 20 },
});
