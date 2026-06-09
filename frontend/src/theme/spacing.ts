/**
 * VITMATERNA Spacing & Layout System
 * Based on an 8-point grid for consistent rhythm.
 */

export const spacing = {
  /** 4px - Micro spacing for tight elements */
  xs: 4,
  /** 8px - Small spacing */
  sm: 8,
  /** 16px - Default spacing */
  md: 16,
  /** 24px - Large spacing */
  lg: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 48px - Section spacing */
  xxl: 48,
  /** 64px - Major section spacing */
  xxxl: 64,
} as const;

export const borderRadius = {
  /** 8px - Subtle rounding */
  sm: 8,
  /** 12px - Default rounding */
  md: 12,
  /** 16px - Card rounding */
  lg: 16,
  /** 24px - Large rounding */
  xl: 24,
  /** 9999px - Full circle */
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
} as const;
