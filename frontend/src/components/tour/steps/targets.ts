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
  // Obstetra — inicio
  obstetraKpis: 'tour-obstetra-kpis',
  obstetraRisk: 'tour-obstetra-risk',
  obstetraCitasHoy: 'tour-obstetra-citas-hoy',
  // Obstetra — gestantes
  obstetraGestantes: 'tour-obstetra-gestantes',
  obstetraGestantesFiltros: 'tour-obstetra-gestantes-filtros',
  obstetraNuevaGestante: 'tour-obstetra-nueva-gestante',
  obstetraGestantePaciente: 'tour-obstetra-gestante-paciente',
  // Obstetra — agenda
  obstetraAgenda: 'tour-obstetra-agenda',
  obstetraNuevaCita: 'tour-obstetra-nueva-cita',
  // Obstetra — reportes
  obstetraReportes: 'tour-obstetra-reportes',
  obstetraReportesExport: 'tour-obstetra-reportes-export',
  obstetraReportesMinsa: 'tour-obstetra-reportes-minsa',
  // Obstetra — chat / masivo
  obstetraChat: 'tour-obstetra-chat',
  obstetraMasivo: 'tour-obstetra-masivo',
  // Admin — inicio
  adminKpis: 'tour-admin-kpis',
  adminPending: 'tour-admin-pending',
  adminEstado: 'tour-admin-estado',
  adminGestion: 'tour-admin-gestion',
  // Admin — usuarios
  adminUsuarios: 'tour-admin-usuarios',
  adminNuevoUsuario: 'tour-admin-nuevo-usuario',
  // Admin — contenido
  adminContenido: 'tour-admin-contenido',
  adminContenidoStats: 'tour-admin-contenido-stats',
  // Admin — canales
  adminNotif: 'tour-admin-notif',
  adminNotifSms: 'tour-admin-notif-sms',
  adminNotifWa: 'tour-admin-notif-wa',
  // Admin — config
  adminConfig: 'tour-admin-config',
  adminConfigMantenimiento: 'tour-admin-config-mantenimiento',
  // Admin — sedes / auditoría
  adminSedes: 'tour-admin-sedes',
  adminAuditoria: 'tour-admin-auditoria',
} as const;
