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
    title: 'Conoce tu app paso a paso',
    description:
      'Te mostramos todas las funciones para que las uses con confianza. Puedes salir cuando quieras y repetir el recorrido desde tu perfil.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteHomeRibbon,
    label: 'Inicio',
    title: 'Tu embarazo, semana a semana',
    description:
      'En tu inicio ves en qué semana estás, tu progreso y tu próximo control prenatal de un vistazo.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteNextAppointment,
    label: 'Inicio',
    title: 'Tu próxima cita',
    description: 'Revisa tu próximo control y confirma tu asistencia con un solo toque.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteTreatment,
    label: 'Inicio',
    title: 'Tu tratamiento del día',
    description: 'Mira de un vistazo cuántos suplementos te faltan tomar hoy y tu adherencia.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.gestanteQuickActions,
    label: 'Inicio',
    title: 'Reporta o pide ayuda',
    description:
      'Si algo te preocupa, reporta un signo de alarma o activa la ayuda de emergencia desde aquí.',
  },

  // ── CITAS ───────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/citas`,
    targetId: TOUR_TARGETS.gestanteCitas,
    label: 'Citas',
    title: 'Tus controles prenatales',
    description:
      'Aquí llevas el seguimiento de tus controles MINSA: cuántos llevas, los próximos y tu historial. Toca una cita para confirmar o pedir reprogramación.',
  },

  // ── TRATAMIENTO ─────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/tratamiento`,
    targetId: TOUR_TARGETS.gestanteTratamiento,
    label: 'Tratamiento',
    title: 'Tus suplementos y medicamentos',
    description:
      'Marca cada toma del día, cuida tu constancia y revisa tus indicaciones. Tu obstetra ve tu adherencia.',
  },

  // ── CHAT ────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.gestanteChat,
    label: 'Chat',
    title: 'Conversa con tu obstetra',
    description:
      'Escríbele cuando lo necesites: dudas, fotos o cómo te sientes. Verás cuándo está en línea.',
  },

  // ── EDUCACIÓN ───────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/educacion`,
    targetId: TOUR_TARGETS.gestanteEducacion,
    label: 'Educación',
    title: 'Aprende sobre tu embarazo',
    description:
      'Contenido recomendado para tu trimestre: busca temas, marca favoritos y aprende a tu ritmo.',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    title: '¡Listo, ya conoces tu app!',
    description:
      'Explora con calma. Tu obstetra te acompaña en cada paso. Puedes repetir este recorrido cuando quieras desde tu perfil.',
  },
];
