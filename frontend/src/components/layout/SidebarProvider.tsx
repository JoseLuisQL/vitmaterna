/**
 * VITMATERNA — SidebarProvider
 *
 * Provee el sidebar por rol y un hook `useSidebar()` para abrirlo desde
 * cualquier pantalla (típicamente con el botón de menú del header). Define las
 * secciones de cada rol con jerarquía y orden lógico de uso.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  BookOpen, MapPin, Bell, AlertTriangle, BarChart3, User, Send,
  Building2, Settings, ShieldAlert, Baby, Calendar, Users,
} from 'lucide-react-native';
import { AppSidebar, type SidebarSection } from './AppSidebar';
import { useAuthStore } from '../../store/authStore';
import { gestanteColors, obstetraColors, adminColors } from '../../theme/colors';
import type { UserRole } from '../../types/user';

interface SidebarContextValue {
  open: () => void;
  close: () => void;
}

const SidebarContext = createContext<SidebarContextValue>({ open: () => {}, close: () => {} });

const ACCENT: Record<UserRole, string> = {
  gestante: gestanteColors.primary,
  obstetra: obstetraColors.primary,
  admin: adminColors.primary,
};

/** Secciones de navegación secundaria por rol (lo que NO está en los tabs). */
const SECTIONS: Record<UserRole, SidebarSection[]> = {
  gestante: [
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
        { icon: Bell, label: 'Notificaciones', description: 'Avisos y recordatorios', href: '/(gestante)/notificaciones' },
      ],
    },
  ],
  obstetra: [
    {
      title: 'Análisis',
      items: [
        { icon: BarChart3, label: 'Reportes', description: 'KPIs clínicos y MINSA', href: '/(obstetra)/(tabs)/reportes' },
      ],
    },
    {
      title: 'Comunicación',
      items: [
        { icon: Send, label: 'Mensaje masivo', description: 'Enviar a varias gestantes', href: '/(obstetra)/mensaje-masivo' },
        { icon: Bell, label: 'Notificaciones', description: 'Avisos del sistema', href: '/(obstetra)/notificaciones' },
      ],
    },
    {
      title: 'Cuenta',
      items: [
        { icon: User, label: 'Mi perfil', description: 'Datos y ajustes', href: '/(obstetra)/(tabs)/perfil' },
      ],
    },
  ],
  admin: [
    {
      title: 'Supervisión',
      items: [
        { icon: BarChart3, label: 'Reportes e indicadores', description: 'KPIs clínicos y MINSA', href: '/(admin)/supervision/reportes' },
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
  ],
};

interface SidebarProviderProps {
  role: UserRole;
  children: React.ReactNode;
}

export function SidebarProvider({ role, children }: SidebarProviderProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const user = useAuthStore((s) => s.user);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  const roleLabel = role === 'gestante' ? 'Gestante' : role === 'obstetra' ? 'Obstetra' : 'Administrador';
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || roleLabel : roleLabel;

  return (
    <SidebarContext.Provider value={value}>
      {children}
      <AppSidebar
        visible={visible}
        onClose={close}
        accentColor={ACCENT[role]}
        userName={userName}
        userSubtitle={roleLabel}
        sections={SECTIONS[role]}
      />
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export default SidebarProvider;
