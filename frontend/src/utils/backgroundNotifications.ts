/**
 * VITMATERNA — Background Notification Handler.
 *
 * Define y registra un background task con expo-notifications + expo-task-manager
 * para que las notificaciones push se procesen aunque la app esté CERRADA o en
 * segundo plano. Este archivo se importa en el entry point de la app (antes del
 * árbol de React) para que el task esté registrado desde el inicio.
 *
 * En iOS, las push con content-available ya despiertan la app brevemente; este
 * task asegura que en Android también se maneje correctamente.
 *
 * No hace nada en web ni en Expo Go (push requiere build nativo).
 */
import { Platform } from 'react-native';

/**
 * Nombre del background task registrado con TaskManager.
 * Debe coincidir con el que se pasa a Notifications.registerTaskAsync().
 */
export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

/**
 * Registra el task de background para notificaciones. Debe llamarse al inicio
 * de la app, fuera del árbol de React (top-level). Idempotente.
 *
 * Solo actúa en plataformas nativas (no web). En Expo Go no hay soporte, pero
 * el import dinámico evita que falle.
 */
export async function setupBackgroundNotifications(): Promise<void> {
  // Solo plataformas nativas con build de desarrollo/producción.
  if (Platform.OS === 'web') return;

  try {
    const TaskManager = await import('expo-task-manager');
    const Notifications = await import('expo-notifications');

    // ISSUE #32/#34/#35 FIX: crear el canal Android 'default' AQUÍ, en el
    // arranque nativo (antes de montar React y antes de iniciar sesión). El
    // canal define el sonido, la vibración y la importancia (heads-up). Si el
    // canal no existe cuando llega la PRIMERA push (p. ej. con la app cerrada o
    // recién instalada, antes de autenticar), Android la enruta a un canal por
    // defecto SIN sonido ni banner. Crearlo al inicio garantiza que toda push
    // —cita, tratamiento, recordatorio de control/medicamento— suene y aparezca
    // en la barra aunque la app esté cerrada o en segundo plano.
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Notificaciones VITMATERNA',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0C8174',
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          sound: 'default',
          enableVibrate: true,
          showBadge: true,
        });
        if (__DEV__) console.log('[BG NOTIF] Canal Android "default" creado al arranque.');
      } catch (e: any) {
        if (__DEV__) console.log('[BG NOTIF] No se pudo crear el canal Android:', e?.message);
      }
    }

    // Definir el task que se ejecuta cuando llega una notificación con la app
    // cerrada o en background. El OS despierta la app brevemente para esto.
    if (!TaskManager.isTaskDefined(BACKGROUND_NOTIFICATION_TASK)) {
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: { data?: any; error?: any }) => {
        if (error) {
          console.error('[BG NOTIF] Error en background task:', error);
          return;
        }
        // `data` contiene la notificación (trigger, content, etc.).
        // No necesitamos hacer nada especial aquí: expo-notifications ya muestra
        // la notificación en la bandeja del sistema. Este task asegura que el
        // proceso se registra para que el OS nos entregue las push en background.
        if (__DEV__) {
          console.log('[BG NOTIF] Notificación recibida en background:', data);
        }
      });
    }

    // Registrar el task con expo-notifications para que las push en background
    // lo disparen. Idempotente (si ya está registrado, no falla).
    try {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      if (__DEV__) {
        console.log('[BG NOTIF] Background notification task registrado.');
      }
    } catch (e: any) {
      // En Expo Go o si ya estaba registrado: ignorar silenciosamente.
      if (!e?.message?.includes('already registered')) {
        if (__DEV__) console.log('[BG NOTIF] No se pudo registrar el task:', e?.message);
      }
    }
  } catch (e) {
    // expo-task-manager o expo-notifications no disponible (Expo Go).
    if (__DEV__) console.log('[BG NOTIF] Módulos de background no disponibles:', e);
  }
}
