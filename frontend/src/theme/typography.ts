/**
 * VITMATERNA Typography System
 * Uses Inter font family with System as fallback.
 * All sizes follow an 8-point grid for visual harmony.
 */
import { TextStyle, Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: 'Inter',
  android: 'Inter',
  default: 'Inter',
});

const fontFamilyFallback = Platform.select({
  ios: 'System',
  android: 'Roboto',
  default: 'System',
});

export interface TypographyStyle {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
}

export const typography = {
  display: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.5,
  },
  h1: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
  },
  h2: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.2,
  },
  h3: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: -0.1,
  },
  body: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  bodyMedium: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  bodySmall: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  caption: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.2,
  },
  button: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.3,
  },
  label: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  overline: {
    fontFamily: fontFamily ?? fontFamilyFallback ?? 'System',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 1.0,
  },
} as const;
