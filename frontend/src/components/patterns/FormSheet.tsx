/**
 * VITMATERNA — FormSheet (formulario dentro de un overlay)
 *
 * Para altas/ediciones cortas que no merecen pantalla completa (crear cita,
 * editar un dato puntual). Usa `Overlay` (BottomSheet móvil / AppModal web) y
 * añade una barra de acciones consistente al pie. Comparte el lenguaje de
 * `FormScreen` para que un formulario se vea igual esté donde esté.
 */
import React from 'react';
import { View } from 'react-native';
import { Overlay } from './Overlay';
import { AppButton } from '../ui/AppButton';

interface FormSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accentColor?: string;

  submitLabel: string;
  onSubmit: () => void;
  submitting?: boolean;
  submitDisabled?: boolean;
  cancelLabel?: string;
}

export function FormSheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  accentColor,
  submitLabel,
  onSubmit,
  submitting = false,
  submitDisabled = false,
  cancelLabel = 'Cancelar',
}: FormSheetProps): React.ReactElement {
  return (
    <Overlay
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <AppButton title={cancelLabel} variant="ghost" onPress={onClose} fullWidth style={{ flex: 1 }} />
          <AppButton
            title={submitLabel}
            onPress={onSubmit}
            loading={submitting}
            disabled={submitDisabled}
            themeColor={accentColor}
            fullWidth
            style={{ flex: 1 }}
          />
        </>
      }
    >
      <View>{children}</View>
    </Overlay>
  );
}

export default FormSheet;
