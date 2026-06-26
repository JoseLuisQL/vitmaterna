/**
 * VITMATERNA — Recorrido guiado de la obstetra (exhaustivo).
 *
 * Explica CADA función de CADA vista para que la obstetra entienda toda la app:
 * inicio, gestantes (buscar, filtrar, registrar, ficha clínica), agenda (atender,
 * reprogramar, nueva cita), reportes (KPIs, MINSA, exportar), chat y mensaje
 * masivo, notificaciones.
 *
 * Convenciones:
 *  - Pasos con `targetId` resaltan un elemento real (anclado con useTourTarget en
 *    la rama activa web/móvil).
 *  - Pasos SIN `targetId` se muestran centrados: se usan para explicar pantallas
 *    que requieren seleccionar un registro (ficha clínica, atender una cita,
 *    registro paso a paso), donde resaltar un elemento sería frágil.
 */
import { TOUR_TARGETS } from './targets';
import type { TourStep } from '../types';

const HOME = '/(obstetra)/(tabs)';

export const obstetraTourSteps: TourStep[] = [
  // 1) Bienvenida
  {
    navigateTo: HOME,
    label: 'Recorrido',
    title: 'Conoce tu panel a fondo',
    description:
      'Te explicamos cada función de la app, pantalla por pantalla. Avanza con "Siguiente"; puedes salir cuando quieras.',
  },

  // ── INICIO ──────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.obstetraKpis,
    label: 'Inicio',
    title: 'Tu día de un vistazo',
    description:
      'Citas de hoy, total de pacientes y alertas pendientes. Toca cada cifra para ir directo a ese módulo.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.obstetraRisk,
    label: 'Inicio',
    title: 'Distribución de riesgo',
    description:
      'El semáforo de tus gestantes: cuántas están en riesgo bajo, medio o alto, con su proporción.',
  },
  {
    navigateTo: HOME,
    targetId: TOUR_TARGETS.obstetraCitasHoy,
    label: 'Inicio',
    title: 'Citas de hoy',
    description:
      'El listado de tus citas del día. Toca una cita para abrir la ficha de esa gestante; "Ver todas" abre la agenda.',
  },

  // ── GESTANTES ─────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/gestantes`,
    targetId: TOUR_TARGETS.obstetraGestantes,
    label: 'Gestantes',
    title: 'Busca a tus pacientes',
    description:
      'Escribe el nombre o DNI para encontrar a una gestante al instante.',
  },
  {
    navigateTo: `${HOME}/gestantes`,
    targetId: TOUR_TARGETS.obstetraGestantesFiltros,
    label: 'Gestantes',
    title: 'Filtra por nivel de riesgo',
    description:
      'Muestra solo las gestantes de riesgo bajo, moderado o alto para priorizar a quién atender.',
  },
  {
    navigateTo: `${HOME}/gestantes`,
    targetId: TOUR_TARGETS.obstetraNuevaGestante,
    label: 'Gestantes',
    title: 'Registra una nueva gestante',
    description:
      'Abre un formulario por pasos: identificación y DNI, embarazo actual (FUM), medidas y antecedentes, y contacto.',
  },
  {
    navigateTo: `${HOME}/gestantes`,
    label: 'Ficha clínica',
    title: 'La historia clínica completa',
    description:
      'Al tocar una gestante abres su ficha con 4 pestañas: Resumen (datos del embarazo y antecedentes), Seguimiento (controles, peso y visitas), Tratamiento (suplementos y vacunas) y Clínico (laboratorios y signos de alarma). Desde la cabecera puedes llamar, escribir por WhatsApp o recomendar contenido.',
  },

  // ── AGENDA ────────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/cronograma`,
    targetId: TOUR_TARGETS.obstetraAgenda,
    label: 'Agenda',
    title: 'Organiza tus citas',
    description:
      'Filtra por Hoy, Próximas, Historial o Todas. En cada cita puedes atenderla, marcar "No asistió", aprobar o rechazar una reprogramación, o convertirla en visita domiciliaria.',
  },
  {
    navigateTo: `${HOME}/cronograma`,
    label: 'Atención',
    title: 'Atender una cita, paso a paso',
    description:
      'Al "Atender" una cita se abre un flujo en 4 pasos: control prenatal, laboratorios, tamizajes y tratamiento. Al terminar, la cita queda registrada como atendida.',
  },
  {
    navigateTo: `${HOME}/cronograma`,
    targetId: TOUR_TARGETS.obstetraNuevaCita,
    label: 'Agenda',
    title: 'Agenda una cita nueva',
    description:
      'Crea una cita para una gestante eligiendo fecha, hora y tipo de control.',
  },

  // ── REPORTES ──────────────────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/reportes`,
    targetId: TOUR_TARGETS.obstetraReportes,
    label: 'Reportes',
    title: 'Tus indicadores clínicos',
    description:
      'Pacientes, adherencia al tratamiento, gestantes con 6+ controles y casos de alto riesgo, de un vistazo.',
  },
  {
    navigateTo: `${HOME}/reportes`,
    targetId: TOUR_TARGETS.obstetraReportesMinsa,
    label: 'Reportes',
    title: 'Indicadores MINSA / ENDES',
    description:
      'El avance de cada indicador oficial frente a su meta, más la atención prioritaria de quienes tienen menor adherencia.',
  },
  {
    navigateTo: `${HOME}/reportes`,
    targetId: TOUR_TARGETS.obstetraReportesExport,
    label: 'Reportes',
    title: 'Exporta a Excel o PDF',
    description:
      'Descarga el reporte completo en Excel o un PDF clínico listo para imprimir o compartir.',
  },

  // ── CHAT Y MENSAJE MASIVO ───────────────────────────────────────────────────
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.obstetraChat,
    label: 'Mensajes',
    title: 'Conversa con tus gestantes',
    description:
      'Busca una gestante y abre su conversación para responder dudas, enviar texto o adjuntar una foto.',
  },
  {
    navigateTo: `${HOME}/chat`,
    targetId: TOUR_TARGETS.obstetraMasivo,
    label: 'Mensajes',
    title: 'Envía un mensaje masivo',
    description:
      'Manda un mismo aviso a un grupo de gestantes, filtrando por trimestre y por nivel de riesgo.',
  },

  // ── NOTIFICACIONES ──────────────────────────────────────────────────────────
  {
    navigateTo: '/(obstetra)/notificaciones',
    label: 'Avisos',
    title: 'Tu bandeja de notificaciones',
    description:
      'Aquí llegan tus alertas. Filtra por no leídas o urgentes, márcalas como leídas y toca cada una para ir al detalle.',
  },

  // ── CIERRE ──────────────────────────────────────────────────────────────────
  {
    navigateTo: HOME,
    label: 'Listo',
    title: '¡Ya conoces toda tu app!',
    description:
      'Puedes repetir este recorrido cuando quieras desde tu perfil, en "Conoce tu app". Tu trabajo acompaña a cada gestante.',
  },
];
