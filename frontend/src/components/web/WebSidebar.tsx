/**
 * VITMATERNA — WebSidebar (sidebar fijo del portal web)
 *
 * Navegación lateral PERSISTENTE para el entorno web de escritorio. Sustituye,
 * solo en web ancho, a la barra inferior de tabs + drawer del móvil. Reutiliza:
 *   - La navegación de `navigation/menu.ts` (misma fuente de verdad que el drawer).
 *   - Los tokens de color/espacio/tipografía del tema (cero colores nuevos).
 *   - El acento por rol y el patrón visual del `AppSidebar` móvil.
 *
 * Características: cabecera de marca + identidad, ítems primarios + secciones,
 * resaltado del ítem activo según la ruta (`usePathname`), modo colapsado
 * (solo iconos), toggle de tema y cierre de sesión.
 *
 * IMPORTANTE: este componente solo se monta cuando `webShell` es true. En
 * móvil/nativo nunca aparece, por lo que no altera la experiencia móvil.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { LogOut, PanelLeftClose, PanelLeftOpen, type LucideIcon } from 'lucide-react-native';
import { VitMaternaLogo } from '../ui/VitMaternaLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui/ToastProvider';
import { confirmAction } from '../../utils/confirm';
import { NAVIGATION, ROLE_LABEL, type NavItem } from '../../navigation/menu';
import { gestanteColors, obstetraColors, adminColors, commonColors, semanticColors } from '../../theme/colors';
import { useThemedColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, webLayout } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';
import type { UserRole } from '../../types/user';

const ACCENT: Record<UserRole, string> = {
  gestante: gestanteColors.primary,
  obstetra: obstetraColors.primary,
  admin: adminColors.primary,
};

interface WebSidebarProps {
  role: UserRole;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Normaliza una Href a string de ruta para comparar con el pathname. */
function hrefToPath(href: Href): string {
  if (typeof href === 'string') return href;
  // Objeto { pathname }
  const p = (href as { pathname?: string }).pathname;
  return p ?? '';
}

/**
 * ¿La ruta `href` corresponde al pathname activo?
 * expo-router resuelve los grupos `(tabs)` quitando los paréntesis, así que
 * comparamos sobre una versión "limpia" sin segmentos de grupo.
 */
function stripGroups(path: string): string {
  return path.replace(/\([^)]*\)\/?/g, '').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

function isActive(href: Href, pathname: string): boolean {
  const target = stripGroups(hrefToPath(href));
  const current = stripGroups(pathname);
  if (target === '/' ) return current === '/';
  // Activo si coincide exacto o si el pathname cuelga de la ruta (sub-rutas).
  return current === target || current.startsWith(target + '/');
}

export function WebSidebar({ role, collapsed, onToggleCollapsed }: WebSidebarProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const { logout } = useAuthStore();
  const colors = useThemedColors();

  const accent = ACCENT[role];
  const nav = NAVIGATION[role];
  const roleLabel = ROLE_LABEL[role];
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || roleLabel : roleLabel;
  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: 'Cerrar sesión',
      message: '¿Seguro que deseas salir de tu cuenta?',
      confirmText: 'Cerrar sesión',
      destructive: true,
    });
    if (!ok) return;
    await logout();
    toast.info('Sesión cerrada', 'Has salido de VITMATERNA correctamente.');
    router.replace('/(auth)/login');
  };

  const width = collapsed ? webLayout.sidebarCollapsedWidth : webLayout.sidebarWidth;

  return (
    <View style={[styles.container, { width, backgroundColor: colors.surface, borderRightColor: colors.border }]}>
      {/* Cabecera: marca + colapsar */}
      <View style={[styles.brandRow, collapsed && styles.brandRowCollapsed, { borderBottomColor: colors.borderLight }]}>
        <VitMaternaLogo size={collapsed ? 36 : 40} />
        {!collapsed && (
          <View style={styles.brandTexts}>
            <Text style={[styles.brandName, { color: colors.text }]} numberOfLines={1}>VITMATERNA</Text>
            <Text style={[styles.brandRole, { color: colors.textSecondary }]} numberOfLines={1}>{roleLabel}</Text>
          </View>
        )}
        <Pressable
          onPress={onToggleCollapsed}
          style={[styles.collapseBtn, { backgroundColor: colors.surfaceAlt }, IS_WEB && ({ cursor: 'pointer' } as any)]}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} color={colors.textSecondary} />
          ) : (
            <PanelLeftClose size={18} color={colors.textSecondary} />
          )}
        </Pressable>
      </View>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Primarios */}
        <View style={styles.group}>
          {nav.primary.map((item, i) => (
            <NavRow key={i} item={item} accent={accent} collapsed={collapsed} active={isActive(item.href, pathname)} onPress={() => router.push(item.href)} />
          ))}
        </View>

        {/* Secciones */}
        {nav.sections.map((section, si) => (
          <View key={si} style={styles.group}>
            {!collapsed && section.title ? <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text> : null}
            {collapsed && section.title ? <View style={[styles.collapsedDivider, { backgroundColor: colors.borderLight }]} /> : null}
            {section.items.map((item, ii) => (
              <NavRow key={ii} item={item} accent={accent} collapsed={collapsed} active={isActive(item.href, pathname)} onPress={() => router.push(item.href)} />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Pie: identidad + tema + logout */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        {!collapsed && (
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: accent }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.userTexts}>
              <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{userName}</Text>
              <Text style={[styles.userSub, { color: colors.textSecondary }]} numberOfLines={1}>{roleLabel}</Text>
            </View>
          </View>
        )}

        {!collapsed && (
          <View style={styles.themeWrap}>
            <ThemeToggle accentColor={accent} />
          </View>
        )}

        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, collapsed && styles.logoutBtnCollapsed, IS_WEB && ({ cursor: 'pointer', transition: 'background-color 0.2s' } as any)]}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          <LogOut size={18} color={semanticColors.danger} />
          {!collapsed && <Text style={styles.logoutText}>Cerrar sesión</Text>}
        </Pressable>
      </View>
    </View>
  );
}

interface NavRowProps {
  item: NavItem;
  accent: string;
  collapsed: boolean;
  active: boolean;
  onPress: () => void;
}

function NavRow({ item, accent, collapsed, active, onPress }: NavRowProps): React.ReactElement {
  const colors = useThemedColors();
  const Icon: LucideIcon = item.icon;
  const color = active ? accent : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        collapsed && styles.navRowCollapsed,
        active && { backgroundColor: accent + '14' },
        pressed && !active && { backgroundColor: colors.surfaceAlt },
        IS_WEB && ({ cursor: 'pointer', transition: 'background-color 0.2s' } as any),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
    >
      {active ? <View style={[styles.activeBar, { backgroundColor: accent }]} /> : null}
      <Icon size={20} color={color} />
      {!collapsed && (
        <Text style={[styles.navLabel, { color: active ? accent : colors.text }, active && styles.navLabelActive]} numberOfLines={1}>
          {item.label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    height: '100%',
    borderRightWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md,
    height: webLayout.topbarHeight,
    borderBottomWidth: 1,
  },
  brandRowCollapsed: { paddingHorizontal: spacing.sm, justifyContent: 'center' },
  brandTexts: { flex: 1, minWidth: 0 },
  brandName: { ...typography.h3, letterSpacing: 0.5 },
  brandRole: { ...typography.caption },
  collapseBtn: {
    width: 32, height: 32, borderRadius: borderRadius.sm,
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  group: { marginBottom: spacing.md, gap: 2 },
  sectionTitle: {
    ...typography.overline,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs, marginLeft: spacing.sm, marginTop: spacing.xs,
  },
  collapsedDivider: { height: 1, marginVertical: spacing.xs, marginHorizontal: spacing.xs },

  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm2,
    paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  navRowCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  navRowPressed: { },
  activeBar: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: borderRadius.full },
  navLabel: { ...typography.bodyMedium, flex: 1 },
  navLabelActive: { ...typography.bodyMedium, fontWeight: '600' },

  footer: { borderTopWidth: 1, padding: spacing.sm, gap: spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h3, color: commonColors.white },
  userTexts: { flex: 1, minWidth: 0 },
  userName: { ...typography.bodyMedium },
  userSub: { ...typography.caption },
  themeWrap: { paddingHorizontal: spacing.xs },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm2,
    paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, backgroundColor: semanticColors.dangerLight,
  },
  logoutBtnCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  logoutText: { ...typography.bodyMedium, color: semanticColors.danger, fontWeight: '600' },
});

export default WebSidebar;
