/**
 * VITMATERNA — Haptics helper
 *
 * Envoltura segura sobre expo-haptics. En web (donde no existe la API nativa)
 * cada función es un no-op silencioso, de modo que los componentes pueden
 * llamar a haptics.* sin condicionales de plataforma.
 */
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptics = {
  /** Toque ligero — press de botones, toggles. */
  light: () => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** Toque medio — acciones con peso (confirmar, enviar). */
  medium: () => {
    if (enabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** Éxito — operación completada. */
  success: () => {
    if (enabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** Advertencia. */
  warning: () => {
    if (enabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
  /** Error. */
  error: () => {
    if (enabled)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
  /** Selección — cambio de pestaña/segmento. */
  selection: () => {
    if (enabled) Haptics.selectionAsync().catch(() => {});
  },
};
