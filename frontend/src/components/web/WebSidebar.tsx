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
import { View, Text, StyleSheet, Pressable, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { LogOut, ChevronLeft, ChevronRight, Compass, type LucideIcon } from 'lucide-react-native';
import { VitMaternaLogo } from '../ui/VitMaternaLogo';
import { ThemeToggle, isThemeToggleAvailable } from '../ui/ThemeToggle';
import { useRestartTour } from '../tour/useRestartTour';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui/ToastProvider';
import { confirmAction } from '../../utils/confirm';
import { useUnreadChatCount } from '../../services/api-queries';
import { NAVIGATION, ROLE_LABEL, type NavItem } from '../../navigation/menu';
import { gestanteColors, obstetraColors, adminColors, commonColors, semanticColors } from '../../theme/colors';
import { useThemedColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, webLayout } from '../../theme/spacing';
import { zIndex } from '../../theme/zIndex';
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
  const restartTour = useRestartTour();

  const accent = ACCENT[role];
  const nav = NAVIGATION[role];
  const roleLabel = ROLE_LABEL[role];
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || roleLabel : roleLabel;
  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  // Badges de pendientes en la navegación web (estilo WhatsApp). El chat solo
  // aplica a gestante y obstetra; el admin no participa en chats clínicos.
  const showChatBadge = role === 'gestante' || role === 'obstetra';
  const { data: unreadChat = 0 } = useUnreadChatCount(showChatBadge);

  /** Resuelve el contador de pendientes para un ítem de navegación. */
  const badgeFor = (item: NavItem): number => {
    const path = hrefToPath(item.href);
    if (showChatBadge && /\/chat$/.test(stripGroups(path))) return unreadChat;
    return 0;
  };

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
      {/* Cabecera: marca */}
      <View style={[styles.brandRow, collapsed && styles.brandRowCollapsed, { borderBottomColor: colors.borderLight }]}>
        <VitMaternaLogo size={collapsed ? 36 : 40} />
        {!collapsed && (
          <View style={styles.brandTexts}>
            <Text style={[styles.brandName, { color: colors.text }]} numberOfLines={1}>VITMATERNA</Text>
            <Text style={[styles.brandRole, { color: colors.textSecondary }]} numberOfLines={1}>{roleLabel}</Text>
          </View>
        )}
      </View>

      {/* Botón flotante para colapsar/expandir */}
      <TouchableOpacity
        style={[
          styles.collapseBtn,
          { backgroundColor: colors.surface, borderColor: colors.border, cursor: 'pointer', outlineStyle: 'none' } as any
        ]}
        onPress={onToggleCollapsed}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={collapsed ? "Expandir menú" : "Colapsar menú"}
      >
        {collapsed ? <ChevronRight size={14} color={colors.textSecondary} /> : <ChevronLeft size={14} color={colors.textSecondary} />}
      </TouchableOpacity>

      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Primarios */}
        <View style={styles.group}>
          {nav.primary.map((item, i) => (
            <NavRow key={i} item={item} accent={accent} collapsed={collapsed} active={isActive(item.href, pathname)} badge={badgeFor(item)} onPress={() => router.push(item.href)} />
          ))}
        </View>

        {/* Secciones */}
        {nav.sections.map((section, si) => (
          <View key={si} style={styles.group}>
            {!collapsed && section.title ? <Text style={[styles.sectionTitle, { color: colors.textTertiary }]}>{section.title}</Text> : null}
            {collapsed && section.title ? <View style={[styles.collapsedDivider, { backgroundColor: colors.borderLight }]} /> : null}
            {section.items.map((item, ii) => (
              <NavRow key={ii} item={item} accent={accent} collapsed={collapsed} active={isActive(item.href, pathname)} badge={badgeFor(item)} onPress={() => router.push(item.href)} />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Pie: recorrido + tema + logout */}
      <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
        {/* Re-lanzar el recorrido guiado. Acento del rol (acción positiva),
            separado visualmente del logout destructivo. */}
        <Pressable
          onPress={restartTour}
          style={({ pressed, hovered }: any) => [
            styles.tourBtn,
            collapsed && styles.tourBtnCollapsed,
            { backgroundColor: accent + '12' },
            hovered && { backgroundColor: accent + '1F' },
            pressed && { backgroundColor: accent + '26' },
            IS_WEB && ({ cursor: 'pointer', transition: 'background-color 0.15s', outlineStyle: 'none' } as any),
          ]}
          accessibilityRole="button"
          accessibilityLabel="Conoce tu app: ver el recorrido guiado"
        >
          <Compass size={18} color={accent} />
          {!collapsed && <Text style={[styles.tourText, { color: accent }]}>Conoce tu app</Text>}
        </Pressable>

        {!collapsed && isThemeToggleAvailable && (
          <View style={styles.themeWrap}>
            <ThemeToggle accentColor={accent} />
          </View>
        )}

        <Pressable
          onPress={handleLogout}
          style={[styles.logoutBtn, collapsed && styles.logoutBtnCollapsed, IS_WEB && ({ cursor: 'pointer', transition: 'background-color 0.2s', outlineStyle: 'none' } as any)]}
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
  /** Contador de pendientes (no leídos). 0 = sin badge. */
  badge?: number;
  onPress: () => void;
}

function NavRow({ item, accent, collapsed, active, badge = 0, onPress }: NavRowProps): React.ReactElement {
  const colors = useThemedColors();
  const Icon: LucideIcon = item.icon;
  const color = active ? accent : colors.textSecondary;
  const hasBadge = badge > 0;
  const badgeLabel = badge > 99 ? '99+' : String(badge);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed, hovered }: any) => [
        styles.navRow,
        collapsed && styles.navRowCollapsed,
        active && { backgroundColor: accent + '10' },
        hovered && !active && { backgroundColor: colors.surfaceAlt },
        pressed && !active && { backgroundColor: colors.borderLight },
        IS_WEB && ({ cursor: 'pointer', transition: 'all 0.15s ease-in-out', outlineStyle: 'none' } as any),
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={hasBadge ? `${item.label}, ${badge} sin leer` : item.label}
    >
      {active && !collapsed && (
        <View style={[styles.activeIndicator, { backgroundColor: accent }]} />
      )}
      <View>
        <Icon size={18} color={color} />
        {/* Colapsado: punto rojo sobre el icono (no cabe el número). */}
        {hasBadge && collapsed && <View style={[styles.badgeDot, { borderColor: colors.surface }]} />}
      </View>
      {!collapsed && (
        <>
          <Text style={[styles.navLabel, { color: active ? accent : colors.textSecondary }, active && styles.navLabelActive]} numberOfLines={1}>
            {item.label}
          </Text>
          {hasBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeLabel}</Text>
            </View>
          )}
        </>
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

  scroll: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  group: { marginBottom: spacing.md, gap: 2 },
  sectionTitle: {
    ...typography.overline,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.xs, marginLeft: spacing.sm, marginTop: spacing.xs,
  },
  collapsedDivider: { height: 1, marginVertical: spacing.xs, marginHorizontal: spacing.xs },
  
  collapseBtn: {
    position: 'absolute',
    top: webLayout.topbarHeight / 2 - 12,
    right: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: zIndex.nav,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  navRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm2,
    paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    position: 'relative',
    overflow: 'hidden',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3.5,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  navRowCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  navRowPressed: { },
  navLabel: { ...typography.bodyMd, flex: 1 },
  navLabelActive: { ...typography.bodyMd, fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: semanticColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: { ...typography.caption, fontSize: 11, fontWeight: '800', color: commonColors.white },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: semanticColors.danger,
    borderWidth: 1.5,
  },

  footer: { borderTopWidth: 1, padding: spacing.sm, gap: spacing.sm },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h3, color: commonColors.white },
  userTexts: { flex: 1, minWidth: 0 },
  userName: { ...typography.bodyMd },
  userSub: { ...typography.caption },
  themeWrap: { paddingHorizontal: spacing.xs },
  tourBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm2,
    paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  tourBtnCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  tourText: { ...typography.bodyMd, fontWeight: '600' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm2,
    paddingHorizontal: spacing.sm2, paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md, backgroundColor: semanticColors.dangerLight,
  },
  logoutBtnCollapsed: { justifyContent: 'center', paddingHorizontal: 0 },
  logoutText: { ...typography.bodyMd, color: semanticColors.danger, fontWeight: '600' },
});

export default WebSidebar;
