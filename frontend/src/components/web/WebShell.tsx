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
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../theme/responsive';
import { useAuthStore } from '../../store/authStore';
import { commonColors } from '../../theme/colors';
import { WebSidebar } from './WebSidebar';
import { WebTopBar } from './WebTopBar';
import type { UserRole } from '../../types/user';

export function WebShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const { webShell } = useResponsive();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [collapsed, setCollapsed] = useState(false);

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
    <View style={styles.shell}>
      <WebSidebar role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      <View style={styles.main}>
        <WebTopBar role={role} />
        <View style={styles.content}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: commonColors.background },
  main: { flex: 1, minWidth: 0 },
  content: { flex: 1, backgroundColor: commonColors.background },
});

export default WebShell;
