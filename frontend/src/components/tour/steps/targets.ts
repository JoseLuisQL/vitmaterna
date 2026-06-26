/**
 * VITMATERNA — Ids de target del tour.
 *
 * Centralizados en su propio módulo (sin dependencias) para evitar ciclos de
 * importación entre `steps/index.ts` y los archivos de pasos por rol, y para
 * que las pantallas los consuman sin acoplarse a la lista de pasos.
 */
export const TOUR_TARGETS = {
  // Gestante
  gestanteHomeRibbon: 'tour-gestante-ribbon',
  gestanteNextAppointment: 'tour-gestante-next-appointment',
  gestanteTreatment: 'tour-gestante-treatment',
  gestanteQuickActions: 'tour-gestante-quick-actions',
  // Obstetra
  obstetraKpis: 'tour-obstetra-kpis',
  obstetraRisk: 'tour-obstetra-risk',
  // Admin
  adminKpis: 'tour-admin-kpis',
  adminPending: 'tour-admin-pending',
  // Navegación (compartido)
  navChat: 'tour-nav-chat',
} as const;
