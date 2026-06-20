/**
 * VITMATERNA — ConfirmSheet (confirmación declarativa sobre Overlay)
 *
 * Para confirmaciones puntuales dentro de una pantalla (eliminar, descartar,
 * cerrar sesión) cuando se quiere control local del estado. Usa `Overlay`, así
 * que se ve como BottomSheet en móvil y como diálogo en web, con un par de
 * acciones consistentes.
 *
 * Nota: para confirmaciones imperativas (await) sigue disponible
 * `confirmAction()` de utils/confirm, que delega en ConfirmHost. ConfirmSheet
 * es la variante declarativa con props.
 */
import React from 'react';
import { Overlay } from './Overlay';
import { AppText } from '../ui/AppText';
import { AppButton } from '../ui/AppButton';
import { commonColors, semanticColors } from '../../theme/colors';

interface ConfirmSheetProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Acción destructiva → botón rojo. */
  destructive?: boolean;
  /** Color de acento del rol para la acción primaria no destructiva. */
  accentColor?: string;
  loading?: boolean;
}

export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  destructive = false,
  accentColor,
  loading = false,
}: ConfirmSheetProps): React.ReactElement {
  return (
    <Overlay
      visible={visible}
      onClose={onCancel}
      title={title}
      showCloseButton={false}
      scroll={false}
      footer={
        <>
          <AppButton title={cancelLabel} variant="ghost" onPress={onCancel} fullWidth style={{ flex: 1 }} />
          <AppButton
            title={confirmLabel}
            variant={destructive ? 'danger' : 'primary'}
            themeColor={!destructive ? accentColor : undefined}
            onPress={onConfirm}
            loading={loading}
            fullWidth
            style={{ flex: 1 }}
          />
        </>
      }
    >
      {message ? (
        <AppText variant="body" color={commonColors.textSecondary}>
          {message}
        </AppText>
      ) : null}
    </Overlay>
  );
}

export default ConfirmSheet;
