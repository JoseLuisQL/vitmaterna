/**
 * VITMATERNA — useDocumentTitle
 *
 * Actualiza el título de la pestaña del navegador según la sección activa de
 * la navegación. Solo actúa en web; en nativo es un no-op.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { NAVIGATION } from '../navigation/menu';
import type { UserRole } from '../types/user';

function stripGroups(path: string): string {
  return path.replace(/\([^)]*\)\/?/g, '').replace(/\/+/g, '/').replace(/\/$/, '') || '/';
}

/**
 * Deriva un título legible para la sección activa.
 * Reutiliza la misma lógica que WebTopBar.useSectionTitle.
 */
function resolveSectionTitle(role: UserRole | undefined, pathname: string): string {
  if (!role) return 'VITMATERNA';
  const current = stripGroups(pathname);
  const nav = NAVIGATION[role];
  const all = [...nav.primary, ...nav.sections.flatMap((s) => s.items)];

  let best: { label: string; len: number } | null = null;
  for (const item of all) {
    const target = stripGroups(
      typeof item.href === 'string' ? item.href : (item.href as { pathname?: string }).pathname ?? '',
    );
    const match = target === '/' ? current === '/' : current === target || current.startsWith(target + '/');
    if (match && (!best || target.length > best.len)) {
      best = { label: item.label, len: target.length };
    }
  }
  return best?.label ?? 'Inicio';
}

/**
 * Actualiza document.title al navegar. Solo en web.
 */
export function useDocumentTitle(role: UserRole | undefined): void {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const section = resolveSectionTitle(role, pathname);
    document.title = `${section} — VITMATERNA`;
  }, [role, pathname]);
}
