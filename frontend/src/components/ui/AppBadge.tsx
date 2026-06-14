/**
 * VITMATERNA - AppBadge
 * Pill con variantes semánticas. Fondo MID + texto MAIN. Soporta modo punto
 * (dot) y variante outline.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'outline'
  | 'default';
type BadgeSize = 'sm' | 'md';

interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Muestra un punto de color a la izquierda del texto. */
  dot?: boolean;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; border?: string }> = {
  success: { bg: semanticColors.successMid, text: semanticColors.success },
  warning: { bg: semanticColors.warningMid, text: semanticColors.warning },
  danger: { bg: semanticColors.dangerMid, text: semanticColors.danger },
  info: { bg: semanticColors.infoMid, text: semanticColors.info },
  neutral: { bg: commonColors.surfaceAlt, text: commonColors.textSecondary },
  default: { bg: commonColors.surfaceAlt, text: commonColors.textSecondary },
  outline: {
    bg: commonColors.transparent,
    text: commonColors.textSecondary,
    border: commonColors.borderStrong,
  },
};

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  dot = false,
  style,
}) => {
  const c = VARIANT_COLORS[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: c.bg,
          borderWidth: c.border ? 1 : 0,
          borderColor: c.border,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.sm2,
          paddingVertical: size === 'sm' ? spacing.xs2 : spacing.xs,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      {dot && <View style={[styles.dot, { backgroundColor: c.text }]} />}
      <Text
        style={[
          styles.label,
          {
            color: c.text,
            fontSize: size === 'sm' ? 10 : typography.caption.fontSize,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs + 2,
  },
  label: {
    fontFamily: typography.overline.fontFamily,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
