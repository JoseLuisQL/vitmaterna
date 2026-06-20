/**
 * VITMATERNA — WebShell (cáscara del portal web)
 *
 * Reemplaza al antiguo `MobileFrame`. Es el SWITCH maestro entre la experiencia
 * móvil (intacta) y el portal web de escritorio:
 *
 *   - Si `webShell` es false (móvil, nativo o web angosto) → passthrough total:
 *     renderiza los children tal cual, sin encajonarlos. La app se comporta
 *     EXACTAMENTE como antes (sin la franja de 920px del MobileFrame).
 *
 *   - Si `webShell` es true (navegador con ancho >= lg) → monta el portal:
 *     sidebar fijo + barra superior + área de contenido a todo el ancho.
 *
 * El sidebar/topbar solo se muestran cuando hay un usuario autenticado con rol
 * (las pantallas de login/registro/splash se ven a pantalla completa).
 */
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../theme/responsive';
import { useAuthStore } from '../../store/authStore';
import { commonColors } from '../../theme/colors';
import { useThemedColors } from '../../theme/ThemeContext';
import { WebSidebar } from './WebSidebar';
import { WebTopBar } from './WebTopBar';
import type { UserRole } from '../../types/user';

const SIDEBAR_COLLAPSED_KEY = 'vitmaterna_sidebar_collapsed';

export function WebShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const { webShell } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const colors = useThemedColors();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof localStorage === 'undefined') return false;
    try { return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const role = user?.role as UserRole | undefined;

  // Móvil / nativo / web angosto → comportamiento original sin alteraciones.
  if (!webShell) {
    return <View style={styles.full}>{children}</View>;
  }

  // Web ancho pero sin sesión (login, registro, splash) → contenido a pantalla
  // completa, sin portal.
  if (!isAuthenticated || !role) {
    return <View style={styles.full}>{children}</View>;
  }

  // Portal web completo.
  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <WebSidebar role={role} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <View style={styles.main}>
        <WebTopBar role={role} />
        <View style={[styles.content, { backgroundColor: colors.background }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, minWidth: 0 },
  content: { flex: 1 },
});

export default WebShell;
