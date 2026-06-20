/**
 * VITMATERNA Spacing & Layout System
 * Based on an 8-point grid for consistent rhythm, plus a few fine tokens
 * (xs2, sm2, md2) for tighter control.
 */

export const spacing = {
  /** 2px - Fine micro spacing */
  xs2: 2,
  /** 4px - Micro spacing for tight elements */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 12px - Fine spacing */
  sm2: 12,
  /** 16px - Default spacing */
  md: 16,
  /** 20px - Medium-large spacing */
  md2: 20,
  /** 24px - Large spacing */
  lg: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 48px - Section spacing */
  xxl: 48,
  /** 64px - Major section spacing */
  xxxl: 64,
} as const;

/**
 * Ritmo vertical SEMÁNTICO. Envuelve los valores de `spacing` con nombres por
 * intención para acabar con los `marginBottom: 14/18/22` arbitrarios entre
 * secciones. No introduce píxeles nuevos: reusa el grid de 8pt.
 *
 *   tight   → entre un label y su control
 *   element → entre elementos relacionados dentro de una tarjeta
 *   group   → entre grupos dentro de una sección
 *   section → entre secciones de una pantalla
 *   block   → separación mayor entre bloques temáticos
 */
export const stack = {
  /** 8px — label ↔ control */
  tight: 8,
  /** 12px — elementos relacionados */
  element: 12,
  /** 16px — grupos dentro de una sección */
  group: 16,
  /** 24px — entre secciones */
  section: 24,
  /** 32px — entre bloques temáticos */
  block: 32,
} as const;

export const borderRadius = {
  /** 4px - Minimal rounding */
  xs: 4,
  /** 8px - Subtle rounding */
  sm: 8,
  /** 12px - Default rounding */
  md: 12,
  /** 16px - Card rounding */
  lg: 16,
  /** 20px - Large card rounding (default for AppCard) */
  xl: 20,
  /** 24px - Extra large rounding */
  xxl: 24,
  /** 32px - Hero rounding */
  xxxl: 32,
  /** 9999px - Full circle / pill */
  full: 9999,
} as const;

export const layout = {
  /** Standard horizontal screen padding */
  screenPaddingHorizontal: 20,
  /** Standard vertical screen padding */
  screenPaddingVertical: 16,
  /** Maximum content width for readability */
  maxContentWidth: 428,
  /** Minimum touch target size (48dp per Material Design) */
  minTouchTarget: 48,
  /** Tab bar height */
  tabBarHeight: 64,
  /** Header height */
  headerHeight: 56,
  /** Espacio inferior para que el contenido no quede tapado por el tab bar
   *  flotante (altura del tab bar + respiro). Usar en contentContainerStyle. */
  tabBarSpace: 96,
} as const;

/**
 * Tokens del PORTAL WEB (cáscara de escritorio). Solo se usan cuando
 * `useResponsive().webShell` es true. En móvil/nativo no aplican.
 *
 * `contentMaxWidth` y `contentGutter` se indexan por breakpoint para que el
 * área de contenido respire en monitores grandes sin estirarse de borde a borde.
 */
export const webLayout = {
  /** Ancho del sidebar fijo (expandido). */
  sidebarWidth: 248,
  /** Ancho del sidebar colapsado (solo iconos). */
  sidebarCollapsedWidth: 72,
  /** Alto de la barra superior. */
  topbarHeight: 64,
  /** Ancho máximo del área de contenido por breakpoint. */
  contentMaxWidth: { lg: 1024, xl: 1280, xxl: 1440 },
  /** Padding lateral del área de contenido por breakpoint. */
  contentGutter: { lg: 32, xl: 40, xxl: 48 },
} as const;
