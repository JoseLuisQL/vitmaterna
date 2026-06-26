/**
 * VITMATERNA — Contenido de la bienvenida (onboarding) por rol.
 *
 * Define el texto del panel de introducción y de las láminas que ve un usuario
 * nuevo tras iniciar sesión por primera vez. Los textos siguen la voz del
 * sistema: activa, clara, en minúscula tipo oración, sin tecnicismos.
 *
 * El contenido NO incluye colores ni estilos (eso lo resuelve WelcomeScreen con
 * los tokens del rol). Solo copy + el icono lucide sugerido por lámina.
 */
import {
  Heart, CalendarCheck, Pill, MessageCircle,
  Users, ClipboardList, BarChart3,
  ShieldCheck, FileText, Settings,
  type LucideIcon,
} from 'lucide-react-native';
import type { UserRole } from '../../types/user';

export interface WelcomeSlide {
  /** Icono lucide que representa la lámina. */
  icon: LucideIcon;
  /** Etiqueta corta (overline) encima del título. */
  label: string;
  /** Título de la lámina. */
  title: string;
  /** Cuerpo explicativo de la función. */
  description: string;
}

export interface WelcomeContent {
  /** Título del panel de introducción (saludo). Usa {nombre} como placeholder. */
  introTitle: string;
  /** Subtítulo del panel de introducción. */
  introSubtitle: string;
  /** Láminas que explican las funciones clave del rol. */
  slides: WelcomeSlide[];
}

const WELCOME: Record<UserRole, WelcomeContent> = {
  gestante: {
    introTitle: '¡Hola, {nombre}!',
    introSubtitle:
      'Bienvenida a VITMATERNA, tu acompañante durante el embarazo. Te mostramos lo esencial en un minuto.',
    slides: [
      {
        icon: Heart,
        label: 'Tu embarazo',
        title: 'Sigue tu embarazo día a día',
        description:
          'En tu inicio verás tus semanas de gestación, tu próximo control y cómo avanzas, todo en un vistazo.',
      },
      {
        icon: CalendarCheck,
        label: 'Tus citas',
        title: 'Confirma y organiza tus controles',
        description:
          'Revisa tus controles prenatales, confirma tu asistencia o pide reprogramar cuando lo necesites.',
      },
      {
        icon: Pill,
        label: 'Tu tratamiento',
        title: 'Marca tus suplementos',
        description:
          'Registra cada toma del día, cuida tu constancia y ve tu adherencia con un solo toque.',
      },
      {
        icon: MessageCircle,
        label: 'Tu obstetra',
        title: 'Conversa y reporta síntomas',
        description:
          'Escríbele a tu obstetra por el chat y, si algo te preocupa, reporta un signo de alarma de inmediato.',
      },
    ],
  },
  obstetra: {
    introTitle: '¡Hola, {nombre}!',
    introSubtitle:
      'Bienvenida a VITMATERNA. Tu panel para acompañar a tus gestantes. Te mostramos lo esencial en un minuto.',
    slides: [
      {
        icon: BarChart3,
        label: 'Tu día',
        title: 'Tu jornada de un vistazo',
        description:
          'En tu inicio ves las citas de hoy, tus pacientes y las alertas pendientes, con el semáforo de riesgo.',
      },
      {
        icon: Users,
        label: 'Tus gestantes',
        title: 'Busca, filtra y registra',
        description:
          'Encuentra a tus pacientes por nombre o DNI, fíltralas por riesgo y registra nuevas gestantes.',
      },
      {
        icon: ClipboardList,
        label: 'Atención',
        title: 'Historia clínica y agenda',
        description:
          'Abre la ficha completa de cada gestante y gestiona tu agenda: atiende, reprograma o marca inasistencia.',
      },
      {
        icon: MessageCircle,
        label: 'Comunicación',
        title: 'Chat y mensajes masivos',
        description:
          'Conversa con tus gestantes o envía un aviso a un grupo según trimestre o nivel de riesgo.',
      },
    ],
  },
  admin: {
    introTitle: '¡Hola, {nombre}!',
    introSubtitle:
      'Bienvenido a VITMATERNA. El panel de control del sistema. Te mostramos lo esencial en un minuto.',
    slides: [
      {
        icon: ShieldCheck,
        label: 'Cuentas',
        title: 'Aprueba y administra usuarios',
        description:
          'Aprueba las cuentas de obstetras pendientes y gestiona todos los usuarios del sistema.',
      },
      {
        icon: FileText,
        label: 'Contenido',
        title: 'Publica contenido educativo',
        description:
          'Crea y administra los artículos y recursos que verán las gestantes en su biblioteca.',
      },
      {
        icon: BarChart3,
        label: 'Supervisión',
        title: 'Reportes e indicadores',
        description:
          'Consulta los KPIs clínicos y los indicadores MINSA globales, con exportación a PDF y Excel.',
      },
      {
        icon: Settings,
        label: 'Sistema',
        title: 'Configura canales y parámetros',
        description:
          'Administra sedes, parámetros clínicos, canales de SMS/WhatsApp y la auditoría del sistema.',
      },
    ],
  },
};

/** Devuelve el contenido de bienvenida para un rol (gestante por defecto). */
export function welcomeContentForRole(role: UserRole | undefined): WelcomeContent {
  return WELCOME[role ?? 'gestante'] ?? WELCOME.gestante;
}
