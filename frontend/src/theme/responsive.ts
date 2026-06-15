/**
 * VITMATERNA — Sistema Responsive
 *
 * Helper único para que TODAS las vistas se adapten al ancho real del
 * dispositivo (teléfono pequeño, grande, tablet, web de escritorio) sin
 * anchos fijos que descuadran.
 *
 * Filosofía: mobile-first. Se define un valor base (móvil) y, opcionalmente,
 * overrides por breakpoint mayor. `useResponsive()` reacciona a cambios de
 * tamaño (rotación, redimensionar ventana web).
 *
 *   const { bp, width, select, isTablet } = useResponsive();
 *   const cols = select({ base: 1, sm: 2, lg: 3 });        // nº de columnas
 *   const pad  = select({ base: spacing.md, md: spacing.lg });
 *
 * Breakpoints (ancho en px):
 *   xs  <  360   teléfonos pequeños
 *   sm  >= 360   teléfonos estándar
 *   md  >= 600   teléfonos grandes / phablets
 *   lg  >= 840   tablets / web angosto
 *   xl  >= 1240  web de escritorio amplio
 */
import { useWindowDimensions } from 'react-native';

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Límites inferiores (px) de cada breakpoint. */
export const BREAKPOINTS: Record<Breakpoint, number> = {
  xs: 0,
  sm: 360,
  md: 600,
  lg: 840,
  xl: 1240,
};

/** Orden ascendente para resolver "el override aplicable más alto". */
const ORDER: Breakpoint[] = ['xs', 'sm', 'md', 'lg', 'xl'];

/** Devuelve el breakpoint activo para un ancho dado. */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
}

/** Valores responsive: `base` obligatorio + overrides opcionales por breakpoint. */
export type Responsive<T> = { base: T } & Partial<Record<Breakpoint, T>>;

/**
 * Resuelve un valor responsive para un breakpoint dado: toma el override del
 * breakpoint activo o, si no existe, el más cercano hacia abajo (mobile-first).
 */
export function resolveResponsive<T>(value: Responsive<T> | T, bp: Breakpoint): T {
  if (value == null || typeof value !== 'object' || !('base' in (value as object))) {
    return value as T;
  }
  const v = value as Responsive<T>;
  const activeIdx = ORDER.indexOf(bp);
  for (let i = activeIdx; i >= 0; i--) {
    const key = ORDER[i];
    if (v[key] !== undefined) return v[key] as T;
  }
  return v.base;
}

export interface ResponsiveInfo {
  /** Ancho disponible (px). */
  width: number;
  /** Alto disponible (px). */
  height: number;
  /** Breakpoint activo. */
  bp: Breakpoint;
  /** Selecciona un valor según el breakpoint activo (mobile-first). */
  select: <T>(value: Responsive<T>) => T;
  /** Atajos booleanos. */
  isPhone: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  /** true cuando hay espacio para layouts de varias columnas (>= lg). */
  isWide: boolean;
}

/**
 * Hook responsive principal. Reacciona a cambios de tamaño de ventana/pantalla.
 */
export function useResponsive(): ResponsiveInfo {
  const { width, height } = useWindowDimensions();
  const bp = getBreakpoint(width);
  return {
    width,
    height,
    bp,
    select: <T,>(value: Responsive<T>): T => resolveResponsive(value, bp),
    isPhone: width < BREAKPOINTS.lg,
    isTablet: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isDesktop: width >= BREAKPOINTS.xl,
    isWide: width >= BREAKPOINTS.lg,
  };
}

/**
 * Calcula cuántas columnas caben dado el ancho disponible, un ancho mínimo de
 * celda y un máximo de columnas. Útil para grids de KPIs/tarjetas sin medir
 * onLayout (cuando ya se conoce el ancho).
 */
export function columnsForWidth(
  width: number,
  minColumnWidth: number,
  maxColumns: number,
  gap = 12,
): number {
  if (width <= 0) return 1;
  const cols = Math.max(1, Math.floor((width + gap) / (minColumnWidth + gap)));
  return Math.min(cols, maxColumns);
}
