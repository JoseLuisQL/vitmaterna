/**
 * VITMATERNA — Recorrido guiado de la obstetra (completo).
 *
 * Cubre las funciones clave del rol, navegando por cada módulo y resaltando su
 * elemento principal UNA sola vez. Funciona igual en web y móvil: cada target se
 * ancla en la rama activa (webShell) de su pantalla. Textos en voz activa,
 * claros y profesionales.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(obstetra)/(tabs)';

export const obstetraTourSteps: TourStep[] = [
  // 1) Bienvenida (centrado)
  {
    navigateTo: HOME,
    label: 'Recorrido',
    title: 'Conoce tu panel en 1 minuto',
    description:
      'Te mostramos lo esencial para acompañar a tus gestantes. Avanza con "Siguiente"; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.obstetraKpis,
    label: 'Inicio',
    title: 'Tu día de un vistazo',
    description:
      'Las cifras clave de hoy: citas, total de pacientes y alertas pendientes. Toca cada una para ir al detalle.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.obstetraRisk,
    label: 'Inicio',
    title: 'Distribución de riesgo',
    description:
      'El semáforo de tus gestantes: cuántas están en riesgo bajo, medio o alto.',
  },

  // ── GESTANTES ─────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/gestantes`,
    targetId: TOUR_TARGETS.obstetraGestantes,
    label: 'Gestantes',
    title: 'Busca y filtra a tus pacientes',
    description:
      'Encuentra a una gestante por nombre o DNI y filtra la lista por su nivel de riesgo.',
  },
  {
    navigateTo: `${HOME}/gestantes`,
    targetId: TOUR_TARGETS.obstetraNuevaGestante,
    label: 'Gestantes',
    title: 'Registra una nueva gestante',
    description:
      'Desde aquí abres la ficha para registrar a una paciente nueva y empezar su control prenatal.',
  },

  // ── AGENDA ────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/cronograma`,
    targetId: TOUR_TARGETS.obstetraAgenda,
    label: 'Agenda',
    title: 'Gestiona tus citas',
    description:
      'Tu agenda del día: atiende una cita, repórtala como no asistida o aprueba reprogramaciones.',
  },

  // ── REPORTES ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/reportes`,
    targetId: TOUR_TARGETS.obstetraReportes,
    label: 'Reportes',
    title: 'Indicadores y exportación',
    description:
      'Tus KPIs clínicos y los indicadores MINSA, con exportación a Excel y PDF.',
  },

  // ── CHAT ──────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.obstetraChat,
    label: 'Mensajes',
    title: 'Conversa con tus gestantes',
    description:
      'Responde consultas una a una o envía un aviso masivo a un grupo según trimestre o riesgo.',
  },

  // ── CIERRE (centrado) ──────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Listo',
    title: '¡Eso es todo!',
    description:
      'Ya conoces tu panel. Vuelve a ver este recorrido cuando quieras desde tu perfil, en "Conoce tu app".',
  },
];
