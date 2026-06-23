/**
 * VITMATERNA — Navegación (fuente única de verdad)
 *
 * Define, por rol, TODA la navegación de la app en un solo lugar:
 *   - `primary`: los módulos más usados → barra inferior de tabs en MÓVIL y
 *     parte superior del sidebar fijo en WEB.
 *   - `sections`: navegación secundaria agrupada → drawer en MÓVIL y resto del
 *     sidebar fijo en WEB.
 *
 * Tanto el `SidebarProvider` (drawer móvil) como el futuro `WebSidebar`
 * (sidebar fijo web) consumen estos datos. Así nunca se duplican rutas ni se
 * desincroniza la navegación entre plataformas.
 */
import {
  Home, Users, FileText, Calendar, Pill, MessageCircle, Baby,
  BookOpen, MapPin, Bell, AlertTriangle, BarChart3, User,
  Building2, Settings, ShieldAlert, type LucideIcon,
} from 'lucide-react-native';
import type { Href } from 'expo-router';
import type { UserRole } from '../types/user';

/** Ítem de navegación (tab o entrada de sección). */
export interface NavItem {
  icon: LucideIcon;
  label: string;
  /** Descripción corta (se muestra en sidebar/drawer, no en tabs). */
  description?: string;
  href: Href;
}

/** Grupo de ítems de navegación secundaria. */
export interface NavSection {
  title?: string;
  items: NavItem[];
}

/** Navegación completa de un rol. */
export interface RoleNav {
  /** Módulos principales (tabs en móvil / cabecera del sidebar en web). */
  primary: NavItem[];
  /** Navegación secundaria agrupada (drawer en móvil / resto del sidebar web). */
  sections: NavSection[];
}

/**
 * Mapa de navegación por rol. Las rutas coinciden EXACTAMENTE con las del
 * router (expo-router file-based). Los `primary` reflejan los tabs actuales de
 * cada `_layout.tsx`; las `sections` reflejan el `SECTIONS` del SidebarProvider.
 */
export const NAVIGATION: Record<UserRole, RoleNav> = {
  gestante: {
    primary: [
      { icon: Home, label: 'Inicio', href: '/(gestante)/(tabs)' },
      { icon: Calendar, label: 'Citas', href: '/(gestante)/(tabs)/citas' },
      { icon: Pill, label: 'Tratamiento', href: '/(gestante)/(tabs)/tratamiento' },
      { icon: MessageCircle, label: 'Chat', href: '/(gestante)/(tabs)/chat' },
    ],
    sections: [
      {
        title: 'Mi salud',
        items: [
          { icon: BookOpen, label: 'Educación', description: 'Contenido para tu embarazo', href: '/(gestante)/(tabs)/educacion' },
          { icon: AlertTriangle, label: 'Signos de alarma', description: 'Reportar síntomas', href: '/(gestante)/alarmas' },
          { icon: MapPin, label: 'Visitas domiciliarias', description: 'Historial de visitas', href: '/(gestante)/visitas' },
        ],
      },
      {
        title: 'Cuenta',
        items: [
          { icon: User, label: 'Mi perfil', description: 'Datos personales y FUM', href: '/(gestante)/(tabs)/perfil' },
        ],
      },
    ],
  },
  obstetra: {
    primary: [
      { icon: Home, label: 'Inicio', href: '/(obstetra)/(tabs)' },
      { icon: Baby, label: 'Gestantes', href: '/(obstetra)/(tabs)/gestantes' },
      { icon: Calendar, label: 'Agenda', href: '/(obstetra)/(tabs)/cronograma' },
      { icon: MessageCircle, label: 'Chat', href: '/(obstetra)/(tabs)/chat' },
    ],
    sections: [
      {
        title: 'Análisis',
        items: [
          { icon: BarChart3, label: 'Reportes', description: 'KPIs clínicos y MINSA', href: '/(obstetra)/(tabs)/reportes' },
        ],
      },
      {
        title: 'Cuenta',
        items: [
          { icon: User, label: 'Mi perfil', description: 'Datos y ajustes', href: '/(obstetra)/(tabs)/perfil' },
        ],
      },
    ],
  },
  admin: {
    primary: [
      { icon: Home, label: 'Inicio', href: '/(admin)/(tabs)' },
      { icon: Users, label: 'Usuarios', href: '/(admin)/(tabs)/usuarios' },
      { icon: FileText, label: 'Contenido', href: '/(admin)/(tabs)/contenido' },
    ],
    sections: [
      {
        title: 'Supervisión',
        items: [
          { icon: BarChart3, label: 'Reportes', description: 'KPIs clínicos y MINSA', href: '/(admin)/supervision/reportes' },
          { icon: Baby, label: 'Gestantes', description: 'Todas las registradas', href: '/(admin)/supervision/gestantes' },
          { icon: Calendar, label: 'Citas', description: 'Agenda global', href: '/(admin)/supervision/citas' },
        ],
      },
      {
        title: 'Sistema',
        items: [
          { icon: Building2, label: 'Sedes', description: 'Establecimientos de salud', href: '/(admin)/(tabs)/sedes' },
          { icon: Settings, label: 'Configuración', description: 'Parámetros del sistema', href: '/(admin)/(tabs)/config' },
          { icon: Bell, label: 'Notificaciones', description: 'SMS y WhatsApp', href: '/(admin)/(tabs)/notificaciones' },
        ],
      },
      {
        title: 'Seguridad',
        items: [
          { icon: ShieldAlert, label: 'Auditoría y backup', description: 'Registro y respaldo', href: '/(admin)/(tabs)/auditoria' },
        ],
      },
      {
        title: 'Cuenta',
        items: [
          { icon: User, label: 'Mi perfil', description: 'Datos de tu cuenta', href: '/(admin)/perfil' },
        ],
      },
    ],
  },
};

/** Etiqueta legible del rol. */
export const ROLE_LABEL: Record<UserRole, string> = {
  gestante: 'Gestante',
  obstetra: 'Obstetra',
  admin: 'Administrador',
};
