/**
 * VITMATERNA — Ids de target del tour.
 *
 * Centralizados en su propio módulo (sin dependencias) para evitar ciclos de
 * importación entre `steps/index.ts` y los archivos de pasos por rol, y para
 * que las pantallas los consuman sin acoplarse a la lista de pasos.
 */
export const TOUR_TARGETS = {
  // Gestante — inicio
  gestanteHomeRibbon: 'tour-gestante-ribbon',
  gestanteNextAppointment: 'tour-gestante-next-appointment',
  gestanteTreatment: 'tour-gestante-treatment',
  gestanteQuickActions: 'tour-gestante-quick-actions',
  // Gestante — módulos (cada pantalla)
  gestanteCitas: 'tour-gestante-citas',
  gestanteTratamiento: 'tour-gestante-tratamiento',
  gestanteChat: 'tour-gestante-chat',
  gestanteEducacion: 'tour-gestante-educacion',
  gestantePerfilDatos: 'tour-gestante-perfil-datos',
  gestantePerfilNotif: 'tour-gestante-perfil-notif',
  gestantePerfilTour: 'tour-gestante-perfil-tour',
  // Obstetra
  obstetraKpis: 'tour-obstetra-kpis',
  obstetraRisk: 'tour-obstetra-risk',
  obstetraGestantes: 'tour-obstetra-gestantes',
  obstetraNuevaGestante: 'tour-obstetra-nueva-gestante',
  obstetraAgenda: 'tour-obstetra-agenda',
  obstetraReportes: 'tour-obstetra-reportes',
  obstetraChat: 'tour-obstetra-chat',
  // Admin
  adminKpis: 'tour-admin-kpis',
  adminPending: 'tour-admin-pending',
  adminUsuarios: 'tour-admin-usuarios',
  adminContenido: 'tour-admin-contenido',
  adminNotif: 'tour-admin-notif',
  adminConfig: 'tour-admin-config',
} as const;
