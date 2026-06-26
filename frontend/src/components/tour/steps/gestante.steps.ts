/**
 * VITMATERNA — Recorrido guiado de la gestante (completo y depurado).
 *
 * Cubre TODAS las funciones que la gestante debe saber usar, navegando por cada
 * módulo y resaltando su elemento clave UNA sola vez por elemento (sin pasos
 * repetidos sobre el mismo target, para que el foco siempre avance y nunca
 * parezca "trabado"). Textos en lenguaje simple y cercano, para usuarias sin
 * experiencia con apps. El motor centra y resalta el elemento con una transición
 * suave, y la tarjeta nunca lo tapa.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(gestante)/(tabs)';

export const gestanteTourSteps: TourStep[] = [
  // 1) Bienvenida (sin spotlight, centrado)
  {
    navigateTo: HOME,
    label: 'Recorrido',
    title: 'Conoce tu app en 1 minuto',
    description:
      'Te mostramos para qué sirve cada parte, en pasos cortos. Avanza con "Siguiente"; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteHomeRibbon,
    label: 'Inicio',
    title: 'En qué semana vas',
    description:
      'Esta barra muestra la semana de tu embarazo y cuánto has avanzado. Se actualiza sola.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteNextAppointment,
    label: 'Inicio',
    title: 'Tu próxima cita',
    description:
      'Aquí ves el día y la hora de tu siguiente control. Toca "Confirmar asistencia" para avisar que irás.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteTreatment,
    label: 'Inicio',
    title: 'Tus pastillas de hoy',
    description:
      'Te recuerda cuántas vitaminas o pastillas tomar hoy. El círculo se llena a medida que las marcas.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteQuickActions,
    label: 'Inicio',
    title: 'Ayuda rápida',
    description:
      'Si te sientes mal: "Reportar" avisa a tu obstetra y "Emergencia" envía tu ubicación para pedir auxilio.',
  },

  // ── CITAS ───────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/citas`,
    targetId: TOUR_TARGETS.gestanteCitas,
    label: 'Citas',
    title: 'Tus controles prenatales',
    description:
      'Lleva la cuenta de tus controles (la meta es 8). Toca cualquier cita para confirmarla o pedir cambiarla de día.',
  },

  // ── TRATAMIENTO ─────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/tratamiento`,
    targetId: TOUR_TARGETS.gestanteTratamiento,
    label: 'Tratamiento',
    title: 'Marca lo que tomas',
    description:
      'Cada vez que tomes una vitamina o pastilla, márcala con "Marcar como tomado". Así llevas tu constancia y tu obstetra la ve.',
  },

  // ── CHAT ────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.gestanteChat,
    label: 'Mensajes',
    title: 'Habla con tu obstetra',
    description:
      'Escribe aquí para hacer preguntas o contar cómo te sientes. Con el clip puedes enviar una foto.',
  },

  // ── EDUCACIÓN ───────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/educacion`,
    targetId: TOUR_TARGETS.gestanteEducacion,
    label: 'Aprende',
    title: 'Información para ti',
    description:
      'Artículos sencillos según tu mes de embarazo. Búscalos, guárdalos con el corazón y calcula tus semanas.',
  },

  // ── PERFIL ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/perfil`,
    targetId: TOUR_TARGETS.gestantePerfilDatos,
    label: 'Mi perfil',
    title: 'Tus datos y tu fecha',
    description:
      'Aquí editas tus datos y registras tu fecha de última regla (FUM). Con ella calculamos tus semanas.',
  },
  {
    navigateTo: `${HOME}/perfil`,
    targetId: TOUR_TARGETS.gestantePerfilNotif,
    label: 'Mi perfil',
    title: 'Cómo recibir avisos',
    description:
      'Elige cómo quieres recibir recordatorios: por la app, por SMS o por WhatsApp. Tú decides.',
  },
  {
    navigateTo: `${HOME}/perfil`,
    targetId: TOUR_TARGETS.gestantePerfilTour,
    label: 'Mi perfil',
    title: 'Repite este recorrido',
    description:
      'Cuando quieras volver a ver esta guía, tócala aquí como "Conoce tu app".',
  },

  // ── CIERRE (sin spotlight, centrado) ──────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Listo',
    title: '¡Eso es todo!',
    description:
      'Ya sabes usar tu app. Explora con calma; tu obstetra te acompaña en cada paso.',
  },
];
