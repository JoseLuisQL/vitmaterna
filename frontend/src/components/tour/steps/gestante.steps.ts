/**
 * VITMATERNA — Pasos del tour para la gestante.
 *
 * Recorrido por las funciones clave de su panel. Los `targetId` se resaltan si
 * la pantalla los registró; si no se encuentran, el paso se muestra centrado.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

export const gestanteTourSteps: TourStep[] = [
  {
    title: 'Te damos un recorrido rápido',
    description:
      'Conoce en un minuto lo principal de tu panel. Puedes omitirlo cuando quieras y verlo de nuevo desde tu perfil.',
  },
  {
    targetId: TOUR_TARGETS.gestanteHomeRibbon,
    label: 'Tu embarazo',
    title: 'Tu avance, semana a semana',
    description:
      'Aquí ves en qué semana estás, tu progreso y tu próximo control prenatal de un vistazo.',
  },
  {
    targetId: TOUR_TARGETS.gestanteNextAppointment,
    label: 'Tus citas',
    title: 'Tu próxima cita',
    description: 'Revisa tu próximo control y confirma tu asistencia con un toque.',
  },
  {
    targetId: TOUR_TARGETS.gestanteTreatment,
    label: 'Tu tratamiento',
    title: 'Tus suplementos del día',
    description: 'Marca cada toma y sigue tu adherencia. Tu constancia se refleja aquí.',
  },
  {
    targetId: TOUR_TARGETS.gestanteQuickActions,
    label: 'Acciones rápidas',
    title: 'Reporta o pide ayuda',
    description:
      'Si algo te preocupa, reporta un signo de alarma o usa la ayuda de emergencia desde aquí.',
  },
  {
    title: '¡Listo!',
    description:
      'Eso es todo por ahora. Explora con calma; tu obstetra te acompaña en cada paso.',
  },
];
