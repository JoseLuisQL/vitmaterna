/**
 * VITMATERNA — Recorrido guiado del administrador (exhaustivo).
 *
 * Explica CADA función de CADA vista para que el administrador entienda todo el
 * control del sistema: inicio, usuarios, contenido, canales SMS/WhatsApp,
 * configuración (incl. mantenimiento), sedes, auditoría y supervisión.
 *
 * Convenciones:
 *  - Pasos con `targetId` resaltan un elemento real (anclado con useTourTarget en
 *    la rama activa web/móvil).
 *  - Pasos SIN `targetId` se muestran centrados: se usan para describir vistas de
 *    solo lectura o que dependen de un registro seleccionado (supervisión).
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(admin)/(tabs)';

export const adminTourSteps: TourStep[] = [
  // 1) Bienvenida
  {
    navigateTo: HOME,
    label: 'Recorrido',
    title: 'Conoce el panel a fondo',
    description:
      'Te explicamos cada función del sistema, pantalla por pantalla. Avanza con "Siguiente"; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminPending,
    label: 'Inicio',
    title: 'Aprobaciones pendientes',
    description:
      'Si hay cuentas de obstetras o gestantes esperando aprobación, aparecen aquí para resolverlas de inmediato.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminKpis,
    label: 'Inicio',
    title: 'El pulso del sistema',
    description:
      'Las cifras clave: usuarios totales, gestantes activas, casos de alto riesgo y citas del día.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminEstado,
    label: 'Inicio',
    title: 'Estado del sistema',
    description:
      'De un vistazo: alertas pendientes, contenido publicado y si los canales SMS y WhatsApp están activos o en modo prueba.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.adminGestion,
    label: 'Inicio',
    title: 'Accesos rápidos',
    description:
      'Atajos directos a Usuarios, Contenido y Reportes para llegar en un toque a lo que más usas.',
  },

  // ── USUARIOS ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/usuarios`,
    targetId: TOUR_TARGETS.adminUsuarios,
    label: 'Usuarios',
    title: 'Administra las cuentas',
    description:
      'Busca por nombre o DNI. En cada usuario puedes ver su ficha, aprobar la cuenta, activarla o desactivarla, editar sus datos, cambiar la contraseña o eliminarlo.',
  },
  {
    navigateTo: `${HOME}/usuarios`,
    targetId: TOUR_TARGETS.adminNuevoUsuario,
    label: 'Usuarios',
    title: 'Crea una cuenta nueva',
    description:
      'Registra un nuevo usuario eligiendo su rol: obstetra, gestante o administrador.',
  },

  // ── CONTENIDO ─────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/contenido`,
    targetId: TOUR_TARGETS.adminContenido,
    label: 'Contenido',
    title: 'Gestiona el contenido educativo',
    description:
      'Filtra por categoría y busca recursos. Crea, edita o elimina los artículos que verán las gestantes en su biblioteca.',
  },
  {
    navigateTo: `${HOME}/contenido`,
    targetId: TOUR_TARGETS.adminContenidoStats,
    label: 'Contenido',
    title: 'Estadísticas de lectura',
    description:
      'Mira lo más leído y el total de vistas para saber qué contenido funciona mejor.',
  },

  // ── CANALES (SMS / WHATSAPP) ─────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/notificaciones`,
    targetId: TOUR_TARGETS.adminNotif,
    label: 'Canales',
    title: 'Canales de notificación',
    description:
      'El estado actual de SMS y WhatsApp: si están activos para mensajes reales o en modo prueba.',
  },
  {
    navigateTo: `${HOME}/notificaciones`,
    targetId: TOUR_TARGETS.adminNotifSms,
    label: 'Canales',
    title: 'Configura SMS (Twilio)',
    description:
      'Activa el SMS y guarda tus credenciales de Twilio. Puedes enviar un mensaje de prueba para verificar la conexión.',
  },
  {
    navigateTo: `${HOME}/notificaciones`,
    targetId: TOUR_TARGETS.adminNotifWa,
    label: 'Canales',
    title: 'Configura WhatsApp',
    description:
      'Activa WhatsApp con la Cloud API (token y phone ID), guárdalo y prueba el envío.',
  },

  // ── CONFIGURACIÓN ──────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/config`,
    targetId: TOUR_TARGETS.adminConfig,
    label: 'Sistema',
    title: 'Límites, accesos y parámetros',
    description:
      'Define el máximo de pacientes por obstetra, permite o bloquea nuevos registros, ajusta la altitud para corregir la hemoglobina y la generación automática de cronogramas.',
  },
  {
    navigateTo: `${HOME}/config`,
    targetId: TOUR_TARGETS.adminConfigMantenimiento,
    label: 'Sistema',
    title: 'Modo mantenimiento',
    description:
      'Cuando lo activas, gestantes y obstetras ven una pantalla de mantenimiento (tú sigues con acceso). Útil para actualizaciones.',
  },

  // ── SEDES ──────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/sedes`,
    targetId: TOUR_TARGETS.adminSedes,
    label: 'Sedes',
    title: 'Establecimientos de salud',
    description:
      'Registra y administra las sedes: nombre, código, dirección, teléfono, altitud y servicios. Toca el botón para crear una nueva.',
  },

  // ── AUDITORÍA ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/auditoria`,
    targetId: TOUR_TARGETS.adminAuditoria,
    label: 'Seguridad',
    title: 'Auditoría y backup',
    description:
      'Revisa el registro de acciones (quién hizo qué y cuándo) y exporta un respaldo completo de la base de datos.',
  },

  // ── SUPERVISIÓN (centrado) ──────────────────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Supervisión',
    title: 'Reportes y vistas globales',
    description:
      'En el menú, "Supervisión" reúne los reportes globales (KPIs y MINSA, con exportación), todas las gestantes y la agenda de citas de todo el centro, en modo solo lectura.',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Listo',
    title: '¡Ya conoces todo el panel!',
    description:
      'Puedes repetir este recorrido cuando quieras desde tu perfil, en "Conoce tu app".',
  },
];
