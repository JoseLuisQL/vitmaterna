/**
 * VITMATERNA — Breadcrumb (solo portal web)
 *
 * Muestra la ruta de navegación jerárquica derivada de `menu.ts` y el pathname
 * activo. Solo se monta dentro del WebTopBar cuando `webShell` es true.
 * En móvil/nativo nunca aparece.
 *
 *   Inicio  ›  Supervisión  ›  Gestantes
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, usePathname, type Href } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { NAVIGATION, type NavItem, type NavSection } from '../../navigation/menu';
import { useThemedColors } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import type { UserRole } from '../../types/user';

function stripGroups(path: string): string {
  return path.replace(/\([^)]*\)\/?/g, '').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

interface Crumb {
  label: string;
  href?: Href;
}

/**
 * Construye la cadena de migas de pan para la ruta activa. Reglas:
 *   - Siempre empieza con "Inicio" (primary[0]).
 *   - Si el pathname coincide con un ítem de una sección con title, se muestra
 *     el title de la sección como crumb intermedio (no clicable).
 *   - La última miga es el ítem activo (no es link, es texto plano).
 */
function buildBreadcrumbs(role: UserRole, pathname: string): Crumb[] {
  const current = stripGroups(pathname);
  const nav = NAVIGATION[role];
  const home = nav.primary[0];
  const homePath = stripGroups(typeof home.href === 'string' ? home.href : (home.href as any).pathname ?? '');

  // Si estamos en la raíz → solo "Inicio", sin link.
  if (current === '/' || current === homePath) {
    return [{ label: home.label }];
  }

  // Buscar el mejor match en primary.
  const crumbs: Crumb[] = [{ label: home.label, href: home.href }];

  for (const item of nav.primary.slice(1)) {
    const target = stripGroups(typeof item.href === 'string' ? item.href : (item.href as any).pathname ?? '');
    if (current === target || current.startsWith(target + '/')) {
      crumbs.push({ label: item.label });
      return crumbs;
    }
  }

  // Buscar en secciones.
  for (const section of nav.sections) {
    for (const item of section.items) {
      const target = stripGroups(typeof item.href === 'string' ? item.href : (item.href as any).pathname ?? '');
      if (current === target || current.startsWith(target + '/')) {
        if (section.title) {
          crumbs.push({ label: section.title });
        }
        crumbs.push({ label: item.label });
        return crumbs;
      }
    }
  }

  // Fallback: solo "Inicio" + ruta limpia.
  const lastSegment = current.split('/').filter(Boolean).pop() ?? '';
  if (lastSegment) {
    crumbs.push({ label: lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1) });
  }
  return crumbs;
}

interface BreadcrumbProps {
  role: UserRole;
}

export function Breadcrumb({ role }: BreadcrumbProps): React.ReactElement {
  const router = useRouter();
  const pathname = usePathname();
  const colors = useThemedColors();
  const crumbs = buildBreadcrumbs(role, pathname);

  return (
    <View style={styles.row}>
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <ChevronRight size={14} color={colors.textTertiary} style={styles.sep} />
            )}
            {crumb.href && !isLast ? (
              <Pressable
                onPress={() => router.push(crumb.href!)}
                accessibilityRole="link"
                accessibilityLabel={crumb.label}
                style={{ cursor: 'pointer', outlineStyle: 'none' } as any}
              >
                <Text style={[styles.crumb, { color: colors.textSecondary }]}>{crumb.label}</Text>
              </Pressable>
            ) : (
              <Text
                style={[styles.crumb, isLast ? { color: colors.text, fontWeight: '600' } : { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {crumb.label}
              </Text>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sep: { marginHorizontal: 2 },
  crumb: { ...typography.bodySm },
});

export default Breadcrumb;
