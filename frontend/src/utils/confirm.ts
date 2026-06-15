/**
 * VITMATERNA — confirm() / notify() cross-platform con modal propio
 *
 * Antes esto usaba window.confirm/alert (web) y Alert.alert (nativo), que se ven
 * pobres y desentonan con el diseño. Ahora delega en un host global
 * (ConfirmHost) que muestra ConfirmDialog/ValidationModal propios, consistentes
 * en web y nativo. Si el host aún no está montado, cae con elegancia a los
 * diálogos nativos para no perder funcionalidad.
 *
 * La API pública se mantiene: confirmAction() devuelve Promise<boolean> y
 * notify() muestra un aviso simple.
 */
import { Alert, Platform } from 'react-native';

export type ConfirmTone = 'default' | 'danger' | 'info' | 'success';

export interface ConfirmRequest {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  /** Marca la acción como destructiva (estilo rojo). */
  destructive?: boolean;
}

interface ConfirmOptions extends ConfirmRequest {}

interface ConfirmHostApi {
  confirm: (req: ConfirmRequest) => Promise<boolean>;
  notify: (title: string, message?: string) => void;
}

let host: ConfirmHostApi | null = null;

/** Registra el host global (lo llama ConfirmHost al montarse). */
export function _registerConfirmHost(api: ConfirmHostApi): void {
  host = api;
}

/**
 * Confirmación con modal propio. Devuelve Promise<boolean>.
 *   if (await confirmAction({ title: 'Cerrar sesión', message: '¿Seguro?' })) { ... }
 */
export function confirmAction({
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  tone,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (host) {
    return host.confirm({ title, message, confirmText, cancelText, tone, destructive });
  }

  // Fallback si el host no está montado todavía.
  if (Platform.OS === 'web') {
    const text = message ? `${title}\n\n${message}` : title;
    const ok = typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(text) : true;
    return Promise.resolve(ok);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ]);
  });
}

/**
 * Aviso simple (un botón). Usa el modal propio si hay host; si no, cae a
 * window.alert / Alert.alert. Para éxito/error preferir useToast.
 */
export function notify(title: string, message?: string): void {
  if (host) {
    host.notify(title, message);
    return;
  }
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
    }
    return;
  }
  Alert.alert(title, message);
}
