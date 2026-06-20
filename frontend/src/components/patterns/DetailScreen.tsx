/**
 * VITMATERNA — DetailScreen (patrón de pantalla de detalle/ficha)
 *
 * Plantilla para vistas de detalle (ficha de gestante, detalle de educación,
 * atender cita). Da una cabecera de detalle consistente (avatar/título/estado +
 * acciones) y un cuerpo pensado para componerse con `SectionCard`s. Pensada
 * para trocear el monolito `gestante/[id]` en secciones independientes.
 *
 * El contenido (las secciones) lo aporta la pantalla; aquí vive el chrome.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenLayout, type ScreenRole } from '../layout/ScreenLayout';
import { AppText } from '../ui/AppText';
import { DetailHeaderSkeleton } from '../ui/SkeletonLoader';
import { commonColors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface DetailScreenProps {
  role: ScreenRole;
  /** Título corto para el header de navegación (ScreenLayout). */
  title: string;
  accentColor: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;

  /** Cabecera de identidad del detalle. */
  avatarText?: string;
  heading: string;
  meta?: string;
  /** Elemento de estado a la derecha de la cabecera (badge/chip). */
  statusSlot?: React.ReactNode;

  children: React.ReactNode;

  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function DetailScreen({
  role,
  title,
  accentColor,
  showBack = true,
  onBack,
  actions,
  avatarText,
  heading,
  meta,
  statusSlot,
  children,
  loading = false,
  error = false,
  onRetry,
  refreshing = false,
  onRefresh,
}: DetailScreenProps): React.ReactElement {
  return (
    <ScreenLayout
      role={role}
      title={title}
      showBack={showBack}
      onBack={onBack}
      actions={actions}
      accentColor={accentColor}
      width="wide"
      loading={loading}
      error={error}
      onRetry={onRetry}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {/* Cabecera de identidad */}
      <View style={styles.identity}>
        {avatarText ? (
          <View style={[styles.avatar, { backgroundColor: accentColor + '1F' }]}>
            <AppText variant="h2" color={accentColor}>{avatarText}</AppText>
          </View>
        ) : null}
        <View style={styles.identityText}>
          <AppText variant="h2" numberOfLines={1}>{heading}</AppText>
          {meta ? (
            <AppText variant="bodySm" color={commonColors.textSecondary} numberOfLines={1}>{meta}</AppText>
          ) : null}
        </View>
        {statusSlot ? <View>{statusSlot}</View> : null}
      </View>

      {children}
    </ScreenLayout>
  );
}

/** Skeleton de cabecera reexportado para usar como loading propio si se desea. */
export { DetailHeaderSkeleton };

const styles = StyleSheet.create({
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  identityText: { flex: 1, minWidth: 0 },
});

export default DetailScreen;
