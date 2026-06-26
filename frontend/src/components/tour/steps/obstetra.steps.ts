/**
 * VITMATERNA — Pasos del tour para la obstetra.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

export const obstetraTourSteps: TourStep[] = [
  {
    title: 'Un recorrido rápido por tu panel',
    description:
      'Conoce en un minuto lo esencial para acompañar a tus gestantes. Puedes verlo de nuevo desde tu perfil.',
  },
  {
    targetId: TOUR_TARGETS.obstetraKpis,
    label: 'Tu día',
    title: 'Tu jornada de un vistazo',
    description: 'Citas de hoy, total de pacientes y alertas pendientes, siempre a la vista.',
  },
  {
    targetId: TOUR_TARGETS.obstetraRisk,
    label: 'Riesgo',
    title: 'Distribución de riesgo',
    description: 'El semáforo de tus gestantes: cuántas están en riesgo bajo, medio o alto.',
  },
  {
    title: '¡Listo!',
    description:
      'Desde el menú llegas a tus gestantes, la agenda, el chat y los reportes. Explora con calma.',
  },
];
