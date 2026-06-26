/**
 * VITMATERNA — Configuración dinámica de Expo.
 *
 * Extiende `app.json` (estático) con valores que dependen del ENTORNO de build:
 *
 *  - EXPO_PUBLIC_API_URL  → URL del backend (la usa el código en runtime).
 *  - APP_ENV              → "local" | "production" (define el comportamiento).
 *
 * Cleartext (HTTP sin TLS):
 *  Android 9+ bloquea el tráfico HTTP por defecto. Un APK que apunte a un
 *  backend local (http://192.168.x.x:3000) NO conectaría. Por eso, cuando
 *  APP_ENV=local (o la URL es http://) habilitamos `usesCleartextTraffic`.
 *  En producción (APP_ENV=production con https://) queda DESACTIVADO, como debe ser.
 *
 *  EAS inyecta estas variables desde el perfil de `eas.json` (campo "env").
 *  En desarrollo local las toma de `frontend/.env`.
 */

const APP_ENV = process.env.APP_ENV || 'local';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/v1';

// Habilita HTTP en claro si estamos en local o si la URL no es https.
const allowCleartext = APP_ENV !== 'production' || !API_URL.startsWith('https://');

module.exports = ({ config }) => ({
  ...config,
  // Variables accesibles desde Constants.expoConfig.extra en runtime.
  extra: {
    ...(config.extra || {}),
    apiUrl: API_URL,
    appEnv: APP_ENV,
    eas: {
      ...((config.extra && config.extra.eas) || {}),
      // projectId se completa al ejecutar `eas init` (queda en app.json/extra).
    },
  },
  plugins: [
    ...(config.plugins || []),
    'expo-image',
    [
      'expo-build-properties',
      {
        android: {
          // Permite HTTP en claro solo cuando corresponde (builds locales).
          usesCleartextTraffic: allowCleartext,
        },
      },
    ],
  ],
});
