/**
 * VITMATERNA — Recorrido guiado de la gestante.
 *
 * Tour completo y profesional: presenta TODOS los módulos de la app, no solo el
 * inicio. Cada paso navega a la pantalla correspondiente (`navigateTo`) y
 * resalta su elemento clave (`targetId`). El motor centra el elemento de forma
 * inteligente antes de iluminarlo; si un target no está disponible (datos
 * vacíos), el paso se muestra centrado sin romper el flujo.
 *
 * Recorrido: Inicio (panel, cita, tratamiento, alarmas) → Citas → Tratamiento →
 * Chat → Educación → cierre.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(gestante)/(tabs)';

export const gestanteTourSteps: TourStep[] = [
  // 1) Bienvenida
  {
    navigateTo: HOME,
    title: 'Conoce tu app',
    description:
      'Te vamos a mostrar, en pocos pasos, para qué sirve cada parte. Toca "Siguiente" para avanzar. Puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteHomeRibbon,
    label: 'Inicio',
    title: 'En qué semana vas',
    description:
      'Esta barra te muestra la semana de tu embarazo y cuánto has avanzado. Se actualiza sola, no tienes que hacer nada.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteNextAppointment,
    label: 'Inicio',
    title: 'Tu próxima cita',
    description: 'Aquí ves el día y la hora de tu siguiente control. Con un toque puedes confirmar que vas a asistir.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteTreatment,
    label: 'Inicio',
    title: 'Tus pastillas de hoy',
    description: 'Te recuerda cuántas vitaminas o pastillas debes tomar hoy. El círculo muestra cuántas ya tomaste.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteQuickActions,
    label: 'Inicio',
    title: 'Si te sientes mal',
    description:
      'Si tienes un malestar o una urgencia, toca aquí para avisar a tu obstetra o pedir ayuda rápido.',
  },

  // ── CITAS ───────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/citas`,
    targetId: TOUR_TARGETS.gestanteCitas,
    label: 'Citas',
    title: 'Tus citas médicas',
    description:
      'Aquí están todas tus citas: las que vienen y las pasadas. Toca una cita para ver los detalles, confirmar o pedir cambiarla de fecha.',
  },

  // ── TRATAMIENTO ─────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/tratamiento`,
    targetId: TOUR_TARGETS.gestanteTratamiento,
    label: 'Tratamiento',
    title: 'Tus vitaminas y pastillas',
    description:
      'Cada vez que tomes una pastilla, márcala aquí. Así no se te olvida y tu obstetra ve que las estás tomando bien.',
  },

  // ── CHAT ────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.gestanteChat,
    label: 'Mensajes',
    title: 'Habla con tu obstetra',
    description:
      'Escribe aquí para hacer preguntas o contar cómo te sientes. También puedes enviar fotos. Es como un chat normal.',
  },

  // ── EDUCACIÓN ───────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/educacion`,
    targetId: TOUR_TARGETS.gestanteEducacion,
    label: 'Aprende',
    title: 'Información para ti',
    description:
      'Artículos y consejos sencillos sobre tu embarazo, elegidos según el mes en que vas. Toca cualquiera para leerlo.',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    title: '¡Eso es todo!',
    description:
      'Ya sabes usar tu app. Explora con calma; tu obstetra te acompaña. Si quieres ver este recorrido otra vez, búscalo en el menú o en tu perfil.',
  },
];
