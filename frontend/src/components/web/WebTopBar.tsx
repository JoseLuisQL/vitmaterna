/**
 * VITMATERNA — WebTopBar (barra superior del portal web)
 *
 * Cabecera fija del área de contenido en el entorno web de escritorio. Muestra
 * el título de la sección activa (derivado de la navegación), la campana de
 * notificaciones y la identidad del usuario. Solo se monta dentro del WebShell
 * (web ancho); en móvil/nativo no existe.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePathname } from 'expo-router';
import { NotificationBell } from '../shared/NotificationBell';
import { Breadcrumb } from './Breadcrumb';
import { useAuthStore } from '../../store/authStore';
import { NAVIGATION, ROLE_LABEL } from '../../navigation/menu';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { gestanteColors, obstetraColors, adminColors, commonColors } from '../../theme/colors';
import { useThemedColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, webLayout } from '../../theme/spacing';
import type { UserRole } from '../../types/user';

const ACCENT: Record<UserRole, string> = {
  gestante: gestanteColors.primary,
  obstetra: obstetraColors.primary,
  admin: adminColors.primary,
};

/** Ruta de avisos/notificaciones por rol (coincide con las del router). */
const NOTIF_HREF: Record<UserRole, string> = {
  gestante: '/(gestante)/notificaciones',
  obstetra: '/(obstetra)/notificaciones',
  admin: '/(admin)/avisos',
};

function stripGroups(path: string): string {
  return path.replace(/\([^)]*\)\/?/g, '').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/** Deriva un título legible para la sección activa a partir de la navegación. */
function useSectionTitle(role: UserRole): string {
  const pathname = usePathname();
  const current = stripGroups(pathname);
  const nav = NAVIGATION[role];
  const all = [...nav.primary, ...nav.sections.flatMap((s) => s.items)];

  let best: { label: string; len: number } | null = null;
  for (const item of all) {
    const target = stripGroups(typeof item.href === 'string' ? item.href : (item.href as { pathname?: string }).pathname ?? '');
    const match = target === '/' ? current === '/' : current === target || current.startsWith(target + '/');
    if (match && (!best || target.length > best.len)) {
      best = { label: item.label, len: target.length };
    }
  }
  return best?.label ?? 'Inicio';
}

interface WebTopBarProps {
  role: UserRole;
}

export function WebTopBar({ role }: WebTopBarProps): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const colors = useThemedColors();
  const accent = ACCENT[role];
  const title = useSectionTitle(role);
  useDocumentTitle(role);
  const roleLabel = ROLE_LABEL[role];
  const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || roleLabel : roleLabel;
  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <Breadcrumb role={role} />
      </View>

      <View style={styles.right}>
        <NotificationBell href={NOTIF_HREF[role]} color={colors.text} />
        <View style={[styles.userChip, { backgroundColor: colors.surfaceAlt }]}>
          <View style={[styles.avatar, { backgroundColor: accent }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.userTexts}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{userName}</Text>
            <Text style={[styles.userSub, { color: colors.textSecondary }]} numberOfLines={1}>{roleLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: webLayout.topbarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  left: { flex: 1, minWidth: 0 },
  title: { ...typography.h2 },
  right: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  userChip: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingLeft: spacing.sm, paddingRight: spacing.sm2, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.bodyMedium, color: commonColors.white, fontWeight: '700' },
  userTexts: { minWidth: 0 },
  userName: { ...typography.bodySm, fontWeight: '600' },
  userSub: { ...typography.micro },
});

export default WebTopBar;
