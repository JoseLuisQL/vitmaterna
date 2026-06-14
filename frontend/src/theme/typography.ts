/**
 * VITMATERNA — Sistema Tipográfico (Inter)
 *
 * Una sola familia (Inter), cargada vía @expo-google-fonts/inter en el layout
 * raíz. Se referencian familias por peso porque en React Native el peso se
 * controla por familia cuando la fuente se carga así.
 *
 * Cuerpo mínimo 15px para legibilidad (población con baja alfabetización
 * digital). Se incluyen tokens numéricos para KPIs y métricas.
 *
 * Los nombres legacy (displayLg, h2, body, bodyMedium, bodyLarge, bodySmall,
 * buttonSmall) se conservan como alias para no romper pantallas existentes.
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

const { regular, medium, semibold, bold } = fontFamilies;

export const typography = {
  // Display grandes
  displayXl: make(bold, 32, 40, '700', -0.5),
  display: make(bold, 28, 36, '700', -0.4),

  // Títulos de pantalla
  h1: make(bold, 24, 32, '700', -0.3),
  h2: make(semibold, 20, 28, '600', -0.2),
  h3: make(semibold, 17, 24, '600', -0.1),
  h4: make(semibold, 15, 22, '600', 0.0),

  // Cuerpo — mínimo 15px para baja alfabetización digital
  bodyLg: make(regular, 16, 26, '400', 0),
  body: make(regular, 15, 24, '400', 0), // cuerpo estándar
  bodyMd: make(medium, 15, 24, '500', 0),
  bodySm: make(regular, 13, 20, '400', 0),

  // Apoyo
  label: make(medium, 13, 18, '500', 0.1),
  caption: make(regular, 12, 16, '400', 0.1),
  overline: make(semibold, 11, 15, '600', 0.8),
  micro: make(semibold, 9, 12, '600', 0.4),

  // Botones
  button: make(semibold, 15, 22, '600', 0.2),
  buttonSm: make(semibold, 13, 18, '600', 0.2),

  // Numérico (KPIs y métricas)
  numeric: make(bold, 32, 38, '700', -0.5),
  numericMd: make(bold, 24, 30, '700', -0.3),
  numericSm: make(semibold, 18, 24, '600', -0.2),

  // ---- Alias legacy (compatibilidad con pantallas existentes) ----
  displayLg: make(bold, 36, 42, '700', -0.5),
  bodyMedium: make(medium, 15, 24, '500', 0),
  bodyLarge: make(regular, 16, 26, '400', 0),
  bodySmall: make(regular, 13, 20, '400', 0),
  buttonSmall: make(semibold, 13, 18, '600', 0.2),
} as const;
