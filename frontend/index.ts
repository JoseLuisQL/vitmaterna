// ISSUE #32 FIX: registrar el background task para notificaciones push ANTES
// de montar el árbol de React. Esto permite que el OS entregue push
// notifications incluso con la app cerrada o en segundo plano.
import { setupBackgroundNotifications } from './src/utils/backgroundNotifications';
setupBackgroundNotifications();

import 'expo-router/entry';
