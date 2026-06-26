/**
 * VITMATERNA — Pasos del tour para el administrador.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

export const adminTourSteps: TourStep[] = [
  {
    title: 'Un recorrido rápido por el panel',
    description:
      'Conoce en un minuto el control del sistema. Puedes verlo de nuevo desde tu perfil.',
  },
  {
    targetId: TOUR_TARGETS.adminPending,
    label: 'Cuentas',
    title: 'Aprobaciones pendientes',
    description: 'Si hay obstetras esperando aprobación, lo verás aquí para resolverlo rápido.',
  },
  {
    targetId: TOUR_TARGETS.adminKpis,
    label: 'Sistema',
    title: 'El pulso del sistema',
    description: 'Usuarios, gestantes activas, casos de alto riesgo y citas del día.',
  },
  {
    title: '¡Listo!',
    description:
      'Desde el menú gestionas usuarios, contenido, reportes, sedes y la configuración. Explora con calma.',
  },
];
