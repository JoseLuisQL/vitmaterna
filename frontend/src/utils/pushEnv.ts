/**
 * VITMATERNA — Detección del entorno para notificaciones push.
 *
 * Las push notifications de expo-notifications NO funcionan en Expo Go desde el
 * SDK 53 y, además, **importar** el módulo en Expo Go dispara un error. Por eso
 * exponemos una bandera para decidir si siquiera se debe cargar el módulo.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * true si estamos corriendo dentro de Expo Go (donde push no está disponible).
 * `executionEnvironment === 'storeClient'` identifica Expo Go en SDK modernos;
 * se mantiene el fallback a `appOwnership === 'expo'` por compatibilidad.
 */
export const isExpoGo =
  (Constants as any)?.executionEnvironment === 'storeClient' ||
  (Constants as any)?.appOwnership === 'expo';

/**
 * true solo si las push reales pueden funcionar: no es web y no es Expo Go.
 * En estos casos NO se debe ni importar expo-notifications.
 */
export const pushSupported = Platform.OS !== 'web' && !isExpoGo;
