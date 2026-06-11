/**
 * VITMATERNA — Sistema Tipográfico (minimalista)
 *
 * Una sola familia (Inter), cargada vía @expo-google-fonts/inter en el layout
 * raíz. Se referencian familias por peso (Inter_400Regular, etc.) porque en
 * React Native el peso se controla por familia cuando la fuente se carga así.
 *
 * Escala con piso de 12px (RNF accesibilidad) y jerarquía clara por rol de
 * contenido. Cuerpo a 16px para legibilidad (población con baja alfabetización
 * digital).
 */
import { TextStyle } from 'react-native';

/** Nombres de familia cargados (deben coincidir con useFonts en _layout.tsx) */
export const fontFamilies = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
}

const make = (
  family: string,
  fontSize: number,
  lineHeight: number,
  weight: TextStyle['fontWeight'],
  letterSpacing = 0,
): TypographyStyle => ({
  fontFamily: family,
  fontSize,
  lineHeight,
  fontWeight: weight,
  letterSpacing,
});

export const typography = {
  // Números/títulos destacados (24–36)
  displayLg: make(fontFamilies.bold, 36, 42, '700', -0.5),
  display: make(fontFamilies.bold, 30, 38, '700', -0.4),
  h1: make(fontFamilies.bold, 24, 32, '700', -0.3),
  h2: make(fontFamilies.semibold, 22, 30, '600', -0.2),
  // Subtítulos (17)
  h3: make(fontFamilies.semibold, 17, 24, '600', -0.1),

  // Cuerpo (14)
  body: make(fontFamilies.regular, 14, 22, '400', 0),
  bodyMedium: make(fontFamilies.medium, 14, 22, '500', 0),
  bodyLarge: make(fontFamilies.regular, 16, 24, '400', 0),
  bodySmall: make(fontFamilies.regular, 13, 19, '400', 0),

  // Apoyos
  caption: make(fontFamilies.regular, 12, 16, '400', 0.1), // meta (12)
  label: make(fontFamilies.medium, 13, 18, '500', 0.1),
  overline: make(fontFamilies.semibold, 11, 15, '600', 0.6),
  micro: make(fontFamilies.semibold, 9, 12, '600', 0.4), // etiquetas mínimas (9)

  // Botones
  button: make(fontFamilies.semibold, 15, 22, '600', 0.1),
  buttonSmall: make(fontFamilies.semibold, 13, 18, '600', 0.1),
} as const;
