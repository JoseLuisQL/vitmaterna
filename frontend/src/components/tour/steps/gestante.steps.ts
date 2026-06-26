/**
 * VITMATERNA — Recorrido guiado de la gestante (completo).
 *
 * Cubre TODAS las funciones que la gestante debe saber usar, navegando por cada
 * módulo y resaltando su elemento clave. Textos en lenguaje simple y cercano,
 * para usuarias sin experiencia con apps. El motor centra y resalta el elemento
 * con una transición suave, y la tarjeta nunca lo tapa.
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
      'Te mostramos para qué sirve cada parte, en pasos cortos. Toca "Siguiente" para avanzar; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteHomeRibbon,
    label: 'Inicio',
    title: 'En qué semana vas',
    description:
      'Esta barra muestra la semana de tu embarazo y cuánto has avanzado. Se actualiza sola; no tienes que hacer nada.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteNextAppointment,
    label: 'Inicio',
    title: 'Tu próxima cita',
    description:
      'Aquí ves el día y la hora de tu siguiente control. Toca "Confirmar asistencia" para avisar que vas a ir.',
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
      'Si te sientes mal: "Reportar" avisa a tu obstetra, y "Emergencia" envía tu ubicación para pedir auxilio.',
  },

  // ── CITAS ───────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/citas`,
    targetId: TOUR_TARGETS.gestanteCitas,
    label: 'Citas',
    title: 'Tus controles',
    description:
      'Lleva la cuenta de tus controles (la meta es 8). Aquí se ven cuántos llevas y los que faltan.',
  },
  {
    navigateTo: `${HOME}/citas`,
    targetId: TOUR_TARGETS.gestanteCitas,
    label: 'Citas',
    title: 'Confirmar o cambiar una cita',
    description:
      'Toca cualquier cita para ver sus detalles. Desde ahí puedes confirmar que asistirás o pedir cambiarla de día.',
  },

  // ── TRATAMIENTO ─────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/tratamiento`,
    targetId: TOUR_TARGETS.gestanteTratamiento,
    label: 'Tratamiento',
    title: 'Marca lo que tomas',
    description:
      'Cada vez que tomes una vitamina o pastilla, márcala con "Marcar como tomado". Así no se te olvida.',
  },
  {
    navigateTo: `${HOME}/tratamiento`,
    targetId: TOUR_TARGETS.gestanteTratamiento,
    label: 'Tratamiento',
    title: 'Tu constancia',
    description:
      'Más abajo verás tu racha y tu porcentaje de cumplimiento. Tu obstetra ve que las estás tomando bien.',
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
      'Artículos sencillos elegidos según tu mes de embarazo. Búscalos, guárdalos con el corazón y calcula tus semanas con "Mis semanas".',
  },

  // ── PERFIL ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/perfil`,
    targetId: TOUR_TARGETS.gestantePerfilDatos,
    label: 'Mi perfil',
    title: 'Tus datos y tu fecha',
    description:
      'Aquí editas tus datos y registras tu fecha de última regla (FUM). Con ella la app calcula tus semanas.',
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
      'Cuando quieras volver a ver esta guía, tócala aquí o búscala en el menú como "Conoce tu app".',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    title: '¡Eso es todo!',
    description:
      'Ya sabes usar tu app. Explora con calma; tu obstetra te acompaña en cada paso.',
  },
];
