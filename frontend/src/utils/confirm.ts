/**
 * VITMATERNA — confirm() cross-platform
 *
 * En web, `Alert.alert` con botones NO ejecuta los `onPress` (no soportado por
 * React Native Web), por lo que las confirmaciones (cerrar sesión, eliminar,
 * suspender...) quedaban sin efecto. Este helper usa `window.confirm` en web y
 * `Alert.alert` en nativo, devolviendo una Promise<boolean>.
 *
 *   if (await confirmAction({ title: 'Cerrar sesión', message: '¿Seguro?' })) { ... }
 */
import { Alert, Platform } from 'react-native';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  /** Marca la acción como destructiva (estilo iOS). */
  destructive?: boolean;
}

export function confirmAction({
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    // window.confirm es síncrono y sí funciona en web.
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function'
      ? window.confirm(text)
      : true;
    return Promise.resolve(ok);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

/**
 * Aviso simple (un solo botón). En web usa `window.alert`; en nativo `Alert.alert`.
 * Para mensajes de éxito/error preferir `useToast`; esto es para casos sueltos.
 */
export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
