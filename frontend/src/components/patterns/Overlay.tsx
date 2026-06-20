/**
 * VITMATERNA — Overlay (una sola forma de mostrar una superficie modal)
 *
 * Política de superficies modales del sistema:
 *   - MÓVIL  → BottomSheet (panel inferior con handle), natural para el pulgar.
 *   - WEB    → AppModal centrado (≤440px), natural para escritorio.
 *
 * `Overlay` elige automáticamente según `webShell` y expone UNA API común, para
 * que las pantallas no decidan a mano (causa de la inconsistencia actual: 5
 * `<Modal>` crudos + BottomSheet sin usar). Anatomía única: título + subtítulo +
 * cierre, cuerpo (scroll opcional) y pie de acciones.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { AppModal } from '../ui/AppModal';
import { BottomSheet } from '../ui/BottomSheet';
import { AppText } from '../ui/AppText';
import { IconButton } from '../ui/IconButton';
import { X } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useResponsive } from '../../theme/responsive';

interface OverlayProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Pie de acciones (AppButtons), orden [secundaria][primaria]. */
  footer?: React.ReactNode;
  /** Cerrar tocando el fondo. Default true. */
  dismissable?: boolean;
  /** Mostrar X de cierre. Default true. */
  showCloseButton?: boolean;
  /** Scroll del cuerpo. Default true. */
  scroll?: boolean;
}

export function Overlay({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  dismissable = true,
  showCloseButton = true,
  scroll = true,
}: OverlayProps): React.ReactElement {
  const { webShell } = useResponsive();

  // WEB → AppModal ya trae header/footer/scroll con la anatomía correcta.
  if (webShell) {
    return (
      <AppModal
        visible={visible}
        onClose={onClose}
        title={title}
        subtitle={subtitle}
        footer={footer}
        dismissable={dismissable}
        showCloseButton={showCloseButton}
        scroll={scroll}
      >
        {children}
      </AppModal>
    );
  }

  // MÓVIL → BottomSheet + cabecera/pie consistentes con AppModal.
  return (
    <BottomSheet visible={visible} onClose={onClose} scroll={scroll}>
      {(title || (dismissable && showCloseButton)) && (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? <AppText variant="h3">{title}</AppText> : null}
            {subtitle ? (
              <AppText variant="bodySmall" color={commonColors.textSecondary}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {dismissable && showCloseButton ? (
            <IconButton icon={X} onPress={onClose} accessibilityLabel="Cerrar" size="sm" />
          ) : null}
        </View>
      )}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
});

export default Overlay;
