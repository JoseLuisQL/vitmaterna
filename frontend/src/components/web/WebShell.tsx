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
import { useSegments } from 'expo-router';
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
  const segments = useSegments();
  // La pantalla de carga inicial (app/index.tsx) siempre va a pantalla completa,
  // incluso con sesión activa: si no, el splash quedaría encajonado dentro del
  // cuerpo del portal (sidebar + topbar) al recargar la web ya autenticado.
  //
  // Importante: usamos useSegments() (no usePathname), porque los grupos de ruta
  // de Expo Router — p. ej. (admin)/(tabs)/index — NO añaden segmento a la URL,
  // así que el dashboard de "Inicio" también reporta pathname "/". Con segmentos,
  // el splash real es el único con la lista vacía.
  const isSplashRoute = (segments as string[]).length === 0;
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

  // Web ancho pero sin sesión (login, registro) o en la pantalla de carga
  // inicial → contenido a pantalla completa, sin portal.
  if (!isAuthenticated || !role || isSplashRoute) {
    return <View style={styles.full}>{children}</View>;
  }

  // Portal web completo.
  return (
    <View style={[styles.shell, { backgroundColor: colors.background }]}>
      <WebSidebar role={role} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <View style={styles.main}>
        <WebTopBar role={role} collapsed={collapsed} />
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
