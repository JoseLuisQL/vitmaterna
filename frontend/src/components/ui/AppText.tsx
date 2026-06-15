/**
 * VITMATERNA - AppText
 *
 * Componente de texto central que:
 *  - Mapea una `variant` a los tokens de tipografía (consistencia).
 *  - Respeta el escalado de fuente del sistema (accesibilidad) con un tope
 *    razonable (maxFontSizeMultiplier) para no romper los layouts.
 *  - Acepta color, alineación y número de líneas como props simples.
 *
 * Es opcional y aditivo: las pantallas existentes siguen usando `typography`
 * directamente; AppText se puede ir adoptando donde se quiera texto accesible
 * y consistente sin repetir spreads de estilo.
 */
import React from 'react';
import { Text, TextProps, TextStyle, StyleProp } from 'react-native';
import { typography } from '../../theme/typography';
import { commonColors } from '../../theme/colors';

type Variant = keyof typeof typography;

interface AppTextProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  /** Tope del escalado del sistema (default 1.4; los títulos usan 1.25). */
  maxScale?: number;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
}

// Variantes "grandes" se escalan menos para no desbordar encabezados/KPIs.
const LARGE_VARIANTS = new Set<Variant>([
  'displayXl', 'display', 'displayLg', 'h1', 'h2', 'numeric', 'numericMd',
]);

export const AppText: React.FC<AppTextProps> = ({
  variant = 'body',
  color = commonColors.text,
  align,
  maxScale,
  style,
  children,
  ...rest
}) => {
  const token = typography[variant] as TextStyle;
  const cap = maxScale ?? (LARGE_VARIANTS.has(variant) ? 1.25 : 1.4);

  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={cap}
      style={[token, { color }, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
};

export default AppText;
