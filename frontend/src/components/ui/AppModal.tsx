import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pie del modal (acciones). Se renderiza fijo bajo el contenido. */
  footer?: React.ReactNode;
  /** Permite cerrar tocando el fondo (por defecto sí). */
  dismissable?: boolean;
  /** Habilita scroll en el cuerpo (por defecto sí). */
  scroll?: boolean;
}

/**
 * Modal centrado, consistente y profesional para toda la app:
 * encabezado con título + cierre, cuerpo (opcionalmente scrollable) y pie
 * de acciones. Fondo atenuado y elevación sutil.
 */
export function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissable = true,
  scroll = true,
}: AppModalProps): React.ReactElement {
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scale, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.96);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const Body = scroll ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismissable ? onClose : undefined}
          accessibilityLabel="Cerrar modal tocando el fondo"
        />
        <Animated.View style={[styles.card, shadows.modal, { transform: [{ scale }] }]}>
          {(title || dismissable) && (
            <View style={styles.header}>
              <View style={styles.headerText}>
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              {dismissable && (
                <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
                  <X size={20} color={commonColors.textSecondary} />
                </Pressable>
              )}
            </View>
          )}
          <Body
            style={scroll ? styles.bodyScroll : undefined}
            contentContainerStyle={scroll ? styles.bodyContent : undefined}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </Body>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    // En pantallas anchas (web/tablet) el modal no se estira a lo ancho.
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: commonColors.border,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: { flex: 1, gap: 2 },
  title: { ...typography.h3, color: commonColors.text },
  subtitle: { ...typography.bodySmall, color: commonColors.textSecondary },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: commonColors.surfaceAlt,
  },
  bodyScroll: { flexGrow: 0 },
  bodyContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
  },
});
