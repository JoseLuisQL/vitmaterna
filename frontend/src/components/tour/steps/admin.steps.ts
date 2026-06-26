/**
 * VITMATERNA — Recorrido guiado del administrador (completo).
 *
 * Cubre el control del sistema, navegando por cada módulo y resaltando su
 * elemento principal UNA sola vez. Funciona igual en web y móvil: cada target se
 * ancla en la rama activa (webShell) de su pantalla. El paso de "aprobaciones"
 * apunta a la tarjeta de pendientes cuando existe y, si no, al bloque "Estado
 * del sistema" (siempre visible), para que el recorrido nunca quede sin foco.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(admin)/(tabs)';

export const adminTourSteps: TourStep[] = [
  // 1) Bienvenida (centrado)
  {
    navigateTo: HOME,
    label: 'Recorrido',
    title: 'Conoce el panel en 1 minuto',
    description:
      'Te mostramos el control del sistema, paso a paso. Avanza con "Siguiente"; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminPending,
    label: 'Inicio',
    title: 'Aprobaciones y estado',
    description:
      'Si hay cuentas pendientes de aprobar, aparecen aquí para resolverlas rápido; debajo, el estado general del sistema.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminKpis,
    label: 'Inicio',
    title: 'El pulso del sistema',
    description:
      'Las cifras clave: usuarios, gestantes activas, casos de alto riesgo y citas del día.',
  },

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/usuarios`,
    targetId: TOUR_TARGETS.adminUsuarios,
    label: 'Usuarios',
    title: 'Administra las cuentas',
    description:
      'Busca, crea, edita y aprueba las cuentas de obstetras y gestantes del sistema.',
  },

  // ── CONTENIDO ─────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/contenido`,
    targetId: TOUR_TARGETS.adminContenido,
    label: 'Contenido',
    title: 'Publica contenido educativo',
    description:
      'Crea y gestiona los artículos y recursos que verán las gestantes en su biblioteca.',
  },

  // ── NOTIFICACIONES ──────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/notificaciones`,
    targetId: TOUR_TARGETS.adminNotif,
    label: 'Canales',
    title: 'SMS y WhatsApp',
    description:
      'Revisa el estado y configura los canales de notificación para enviar mensajes reales.',
  },

  // ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/config`,
    targetId: TOUR_TARGETS.adminConfig,
    label: 'Sistema',
    title: 'Parámetros del sistema',
    description:
      'Ajusta límites y accesos, parámetros clínicos de las citas y el modo mantenimiento.',
  },

  // ── CIERRE (centrado) ──────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Listo',
    title: '¡Eso es todo!',
    description:
      'Reportes, sedes y auditoría están en el menú. Vuelve a este recorrido cuando quieras desde tu perfil.',
  },
];
