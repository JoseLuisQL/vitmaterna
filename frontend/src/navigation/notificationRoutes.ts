/**
 * VITMATERNA — Enrutado de notificaciones (fuente única de verdad)
 *
 * Decide a qué pantalla llevar cuando se interactúa con una notificación, sea
 * por:
 *   - toque de una push del sistema (foreground/background y arranque en frío), o
 *   - toque de una fila en la bandeja in-app.
 *
 * Antes esta lógica vivía DUPLICADA en `usePushNotifications.ts`
 * (routeForNotification) y en `NotificationsScreen.tsx` (handlePress), y ya había
 * divergido (admin, examenes_pendientes, fpp_proxima sólo enrutaban in-app).
 * Aquí se consolidan TODOS los casos: el destino se calcula a partir del `tipo`
 * de la notificación, su payload contextual (`datos`) y el rol del usuario, y se
 * abre exactamente esa vista con sus parámetros (deep link por payload).
 *
 * El payload contextual usa los nombres del backend: `tipo`, `gestanteId`,
 * `conversationId`, `messageId`, `contentId`, `dangerSignId`.
 */
import type { Href } from 'expo-router';
import type { UserRole } from '../types/user';

/** Datos contextuales que puede traer una notificación (push o in-app). */
export interface NotificationData {
  tipo?: string;
  gestanteId?: string;
  conversationId?: string;
  messageId?: string;
  contentId?: string;
  dangerSignId?: string;
  [key: string]: unknown;
}

const CITA_TIPOS = [
  'cita_confirmada',
  'solicitud_reprogramacion',
  'reprogramacion_aprobada',
  'reprogramacion_rechazada',
  'inasistencia',
  'recordatorio_cita',
];

/**
 * Calcula el destino de una notificación. Devuelve un `Href` de expo-router o
 * `null` si no hay vista específica (en cuyo caso el llamador puede caer a la
 * bandeja del rol con `fallbackInbox`).
 */
export function routeForNotification(
  role: UserRole | string | undefined,
  data: NotificationData | null | undefined,
): Href | null {
  const d = data ?? {};
  const tipo = d.tipo;
  const gid = d.gestanteId;
  const conv = d.conversationId;
  const msgId = d.messageId;
  const cid = d.contentId;
  const msgQs = msgId ? `&messageId=${msgId}` : '';

  // ── Emergencia (botón de pánico): el obstetra entra DIRECTO a la conversación
  // de esa gestante (donde actúa), no a la bandeja.
  if (tipo === 'emergencia' && role === 'obstetra') {
    if (conv) return `/(obstetra)/(tabs)/chat?conversationId=${conv}` as Href;
    if (gid) return `/(obstetra)/(tabs)/chat?gestanteId=${gid}` as Href;
    return '/(obstetra)/(tabs)/chat' as Href;
  }

  // ── Citas (confirmación, reprogramación, inasistencia, recordatorio).
  if (tipo && CITA_TIPOS.includes(tipo)) {
    if (role === 'obstetra') return '/(obstetra)/(tabs)/cronograma' as Href;
    if (role === 'gestante') return '/(gestante)/(tabs)/citas' as Href;
    if (role === 'admin') return '/(admin)/supervision/citas' as Href;
  }

  // ── Signo de alarma → ficha de la gestante (sección Clínico/Alarmas).
  if (tipo === 'signo_alarma' || d.dangerSignId) {
    if (role === 'obstetra') {
      return gid ? (`/(obstetra)/gestante/${gid}` as Href) : ('/(obstetra)/(tabs)/gestantes' as Href);
    }
    if (role === 'admin') return '/(admin)/supervision/gestantes' as Href;
  }

  // ── Exámenes pendientes → ficha de la gestante (pestaña Clínico).
  if (tipo === 'examenes_pendientes' && role === 'obstetra') {
    return gid ? (`/(obstetra)/gestante/${gid}?tab=clinico` as Href) : ('/(obstetra)/(tabs)/gestantes' as Href);
  }

  // ── Mensaje de chat → abrir DIRECTO la conversación correcta, con scroll al
  // mensaje exacto cuando viene el id.
  if (tipo === 'mensaje_chat') {
    if (role === 'gestante') {
      return conv
        ? (`/(gestante)/(tabs)/chat?conversationId=${conv}${msgQs}` as Href)
        : ('/(gestante)/(tabs)/chat' as Href);
    }
    if (role === 'obstetra') {
      if (conv) return `/(obstetra)/(tabs)/chat?conversationId=${conv}${msgQs}` as Href;
      if (gid) return `/(obstetra)/(tabs)/chat?gestanteId=${gid}` as Href;
      return '/(obstetra)/(tabs)/chat' as Href;
    }
  }

  // ── Contenido educativo recomendado → abrir el artículo (o la sección).
  if (tipo === 'educacion' && role === 'gestante') {
    return cid ? (`/(gestante)/educacion/${cid}` as Href) : ('/(gestante)/(tabs)/educacion' as Href);
  }

  // ── Recordatorio de suplemento / FPP próxima → tratamiento de la gestante.
  if ((tipo === 'recordatorio_suplemento' || tipo === 'fpp_proxima') && role === 'gestante') {
    return '/(gestante)/(tabs)/tratamiento' as Href;
  }

  // ── Resultado de laboratorio → ficha de la gestante (pestaña Clínico).
  if (tipo === 'resultado_laboratorio' && role === 'obstetra') {
    return gid ? (`/(obstetra)/gestante/${gid}?tab=clinico` as Href) : ('/(obstetra)/(tabs)/gestantes' as Href);
  }

  // ── Baja adherencia → ficha de la gestante (pestaña Tratamiento).
  if (tipo === 'baja_adherencia' && role === 'obstetra') {
    return gid ? (`/(obstetra)/gestante/${gid}?tab=tratamiento` as Href) : ('/(obstetra)/(tabs)/gestantes' as Href);
  }

  // ── Admin: obstetra pendiente de aprobación → usuarios.
  if (tipo === 'obstetra_pendiente' && role === 'admin') {
    return '/(admin)/(tabs)/usuarios' as Href;
  }

  // ── Admin: alarma sin atender → supervisión de gestantes.
  if (tipo === 'alarma_sin_atender' && role === 'admin') {
    return '/(admin)/supervision/gestantes' as Href;
  }

  return null;
}

/** Bandeja de notificaciones del rol (destino por defecto). */
export function fallbackInbox(role: UserRole | string | undefined): Href | null {
  if (role === 'obstetra') return '/(obstetra)/notificaciones' as Href;
  if (role === 'gestante') return '/(gestante)/notificaciones' as Href;
  if (role === 'admin') return '/(admin)/avisos' as Href;
  return null;
}

/**
 * Destino definitivo para una notificación: su vista específica si existe, o la
 * bandeja del rol como último recurso.
 */
export function resolveNotificationTarget(
  role: UserRole | string | undefined,
  data: NotificationData | null | undefined,
): Href | null {
  return routeForNotification(role, data) ?? fallbackInbox(role);
}
