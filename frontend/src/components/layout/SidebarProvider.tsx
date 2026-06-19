/**
 * VITMATERNA — SidebarProvider
 *
 * Provee el sidebar por rol y un hook `useSidebar()` para abrirlo desde
 * cualquier pantalla (típicamente con el botón de menú del header). Define las
 * secciones de cada rol con jerarquía y orden lógico de uso.
 */
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AppSidebar } from './AppSidebar';
import { useAuthStore } from '../../store/authStore';
import { useNotificationRealtime } from '../../hooks/useNotificationRealtime';
import { gestanteColors, obstetraColors, adminColors } from '../../theme/colors';
import { NAVIGATION, ROLE_LABEL } from '../../navigation/menu';
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

interface SidebarProviderProps {
  role: UserRole;
  children: React.ReactNode;
}

export function SidebarProvider({ role, children }: SidebarProviderProps): React.ReactElement {
  const [visible, setVisible] = useState(false);
  const user = useAuthStore((s) => s.user);

  // Notificaciones en tiempo real: una sola suscripción por sesión de rol.
  useNotificationRealtime();

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const value = useMemo(() => ({ open, close }), [open, close]);

  const roleLabel = ROLE_LABEL[role];
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
        sections={NAVIGATION[role].sections}
      />
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  return useContext(SidebarContext);
}

export default SidebarProvider;
