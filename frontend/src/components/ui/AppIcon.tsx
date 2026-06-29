/**
 * AppIcon — wrapper de iconos Lucide con escala semántica y peso de trazo
 * estandarizado. Reemplaza los `<Icon size={18} />` sueltos y los overrides
 * manuales de `strokeWidth`.
 *
 *   <AppIcon icon={Plus} size="md" color={commonColors.white} />
 *   <AppIcon icon={Home} size="lg" emphasis />            // trazo grueso (activo)
 *
 * No añade estilos propios: solo normaliza `size` y `strokeWidth` y reenvía
 * el resto de props al icono Lucide subyacente (accessibilityLabel, etc.).
 */
import React from 'react';
import { iconSizes, iconStroke } from '../../theme/iconography';
import type { IconSize } from '../../theme/iconography';

export interface AppIconProps {
  /** Componente de icono Lucide (p. ej. `Plus`, `Home`). */
  icon: React.ComponentType<{
    size?: number;
    color?: string;
    strokeWidth?: number;
    strokeLinecap?: 'round' | 'butt' | 'square';
    strokeLinejoin?: 'round' | 'miter' | 'bevel';
    [key: string]: unknown;
  }>;
  /** Tamaño semántico. Default 'md' (20px). */
  size?: IconSize;
  /** Trazo grueso (2.25) para el icono activo/seleccionado. Default false. */
  emphasis?: boolean;
  /** Color del icono. */
  color?: string;
  /** Accesibilidad. Lucide reenvía `accessibilityLabel` al SVG. */
  accessibilityLabel?: string;
  accessibilityRole?: 'image' | 'button' | 'link';
}

export function AppIcon({
  icon: Icon,
  size = 'md',
  emphasis = false,
  color,
  accessibilityLabel,
  accessibilityRole,
}: AppIconProps): React.ReactElement {
  return (
    <Icon
      size={iconSizes[size]}
      color={color}
      strokeWidth={emphasis ? iconStroke.emphasis : iconStroke.regular}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    />
  );
}
