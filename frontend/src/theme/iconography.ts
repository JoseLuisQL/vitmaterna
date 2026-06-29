/**
 * VITMATERNA — Iconografía
 *
 * Escala única de tamaños y pesos de trazo para TODOS los iconos (Lucide).
 * Acaba con la proliferación de `<Icon size={18} />`, `<Icon size={22} />`,
 * overrides manuales de `strokeWidth`, y la consiguiente deriva visual entre
 * pantallas.
 *
 * Uso (a través del wrapper `AppIcon`):
 *   <AppIcon name={Plus} size="md" />          // tamaño semántico
 *   <AppIcon name={Plus} size="md" emphasis />  // trazo más grueso (estado activo)
 *
 * O directamente, para los pocos sitios que no puedan usar el wrapper:
 *   import { iconSizes, iconStroke } from '@/theme';
 *   <Plus size={iconSizes.md} strokeWidth={iconStroke.regular} />
 *
 * Diseño:
 *   - 6 tamaños alineados a la escala tipográfica (xs→xxl).
 *   - 2 pesos: `regular` (1.75, más limpio que el default 2 de Lucide) y
 *     `emphasis` (2.25) para el icono activo/seleccionado.
 *   - `strokeLinecap/join="round"` es el default de Lucide; no se overridea.
 */
export const iconSizes = {
  /** 14px — iconos inline en texto/caption */
  xs: 14,
  /** 16px — iconos de chip/badge/label */
  sm: 16,
  /** 20px — icono por defecto en UI (botones, filas) */
  md: 20,
  /** 24px — icono de cabecera/acción destacada */
  lg: 24,
  /** 32px — icono hero de tarjeta vacía / KPI */
  xl: 32,
  /** 48px — icono de pantalla vacía / onboarding */
  xxl: 48,
} as const;

export const iconStroke = {
  /** Trazo fino para reposo (más limpio que el default 2 de Lucide). */
  regular: 1.75,
  /** Trazo grueso para el icono activo/seleccionado. */
  emphasis: 2.25,
} as const;

export type IconSize = keyof typeof iconSizes; // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
