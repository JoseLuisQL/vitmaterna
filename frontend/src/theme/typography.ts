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
  // Títulos
  display: make(fontFamilies.bold, 32, 40, '700', -0.4),
  h1: make(fontFamilies.bold, 26, 34, '700', -0.3),
  h2: make(fontFamilies.semibold, 22, 30, '600', -0.2),
  h3: make(fontFamilies.semibold, 18, 26, '600', -0.1),

  // Cuerpo
  body: make(fontFamilies.regular, 16, 24, '400', 0),
  bodyMedium: make(fontFamilies.medium, 16, 24, '500', 0),
  bodySmall: make(fontFamilies.regular, 14, 20, '400', 0),

  // Apoyos
  caption: make(fontFamilies.regular, 13, 18, '400', 0.1),
  label: make(fontFamilies.medium, 14, 20, '500', 0.1),
  overline: make(fontFamilies.semibold, 12, 16, '600', 0.6),

  // Botones
  button: make(fontFamilies.semibold, 16, 22, '600', 0.1),
  buttonSmall: make(fontFamilies.semibold, 14, 20, '600', 0.1),
} as const;
