/**
 * VITMATERNA — Configuración de entorno (única fuente de la URL de la API).
 *
 * Resuelve la URL del backend de forma robusta para TODOS los contextos:
 *   1. Constants.expoConfig.extra.apiUrl  → inyectado por app.config.js (lo más
 *      fiable en un APK ya compilado, donde process.env puede no existir).
 *   2. process.env.EXPO_PUBLIC_API_URL    → desarrollo con Metro / .env.
 *   3. http://localhost:3000/v1           → último recurso (web local).
 *
 * Centralizar esto evita que cada archivo (api, sockets) derive la URL por su
 * cuenta y que un APK quede apuntando a localhost por error.
 */
import Constants from 'expo-constants';

const extra: Record<string, unknown> =
  (Constants.expoConfig?.extra as Record<string, unknown>) ||
  ((Constants as { manifest2?: { extra?: Record<string, unknown> } }).manifest2?.extra) ||
  {};

/** URL base de la API REST, p.ej. http://192.168.1.10:3000/v1 */
export const API_URL: string =
  (extra.apiUrl as string) ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000/v1';

/** Entorno declarado en el build: "local" | "production". */
export const APP_ENV: string = (extra.appEnv as string) || process.env.APP_ENV || 'local';

/** Origen del servidor (sin el sufijo /v1 ni /api) para Socket.IO y /uploads. */
export const SERVER_ORIGIN: string = API_URL.replace(/\/v1|\/api/g, '');

/** true cuando el build apunta a un backend de producción por HTTPS. */
export const IS_PRODUCTION = APP_ENV === 'production';
