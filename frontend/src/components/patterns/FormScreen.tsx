/**
 * VITMATERNA — FormScreen (pantalla de formulario)
 *
 * Plantilla única para altas/ediciones a pantalla completa (gestante nueva,
 * control nuevo, sedes, config, tamizajes). Resuelve dos problemas actuales:
 * el manejo de teclado disperso (solo 6 pantallas) y las barras de acción
 * inconsistentes. Aporta:
 *   - ScreenLayout con ancho 'readable' (formularios se leen mejor en columna).
 *   - KeyboardAvoidingView + scroll para que el teclado nunca tape el campo.
 *   - Barra de acciones fija al pie con orden [secundaria][primaria].
 *
 * Los campos los aporta la pantalla (con la familia Field/AppInput).
 */
import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { ScreenLayout, type ScreenRole } from '../layout/ScreenLayout';
import { AppButton } from '../ui/AppButton';
import { FormSkeleton } from '../ui/SkeletonLoader';
import { commonColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useResponsive } from '../../theme/responsive';

interface FormScreenProps {
  role: ScreenRole;
  title: string;
  subtitle?: string;
  accentColor: string;
  showBack?: boolean;
  onBack?: () => void;
  children: React.ReactNode;

  /** Acción primaria (guardar). El verbo se conserva en el toast de la pantalla. */
  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;

  /** Acción secundaria (cancelar). */
  cancelLabel?: string;
  onCancel?: () => void;

  /** Estado de carga inicial (edición que trae datos). */
  loading?: boolean;
}

export function FormScreen({
  role,
  title,
  subtitle,
  accentColor,
  showBack = true,
  onBack,
  children,
  submitLabel,
  onSubmit,
  submitting = false,
  submitDisabled = false,
  cancelLabel = 'Cancelar',
  onCancel,
  loading = false,
}: FormScreenProps): React.ReactElement {
  const { webShell } = useResponsive();

  return (
    <ScreenLayout
      role={role}
      title={title}
      subtitle={subtitle}
      showBack={showBack}
      onBack={onBack}
      accentColor={accentColor}
      width="readable"
      scroll={false}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? <FormSkeleton fields={5} /> : children}
        </ScrollView>

        {!loading ? (
          <View style={[styles.actions, webShell && styles.actionsWeb]}>
            {onCancel ? (
              <AppButton title={cancelLabel} variant="ghost" onPress={onCancel} style={styles.actionBtn} />
            ) : null}
            <AppButton
              title={submitLabel}
              onPress={onSubmit}
              loading={submitting}
              disabled={submitDisabled}
              themeColor={accentColor}
              style={styles.actionBtn}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingTop: spacing.lg, paddingBottom: spacing.xl },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
    backgroundColor: commonColors.background,
  },
  actionsWeb: { justifyContent: 'flex-end' },
  actionBtn: { flex: 1, maxWidth: 240 },
});

export default FormScreen;
