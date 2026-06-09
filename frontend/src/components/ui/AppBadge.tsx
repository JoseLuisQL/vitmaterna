/**
 * VITMATERNA - AppBadge Component
 * Badge with semantic color variants.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default';
type BadgeSize = 'sm' | 'md';

interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: semanticColors.successLight, text: semanticColors.success },
  warning: { bg: semanticColors.warningLight, text: semanticColors.warning },
  danger: { bg: semanticColors.dangerLight, text: semanticColors.danger },
  info: { bg: semanticColors.infoLight, text: semanticColors.info },
  default: { bg: commonColors.borderLight, text: commonColors.textSecondary },
};

export const AppBadge: React.FC<AppBadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const colors = VARIANT_COLORS[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          paddingHorizontal: size === 'sm' ? spacing.sm : spacing.sm + 4,
          paddingVertical: size === 'sm' ? 2 : spacing.xs,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={[
          styles.label,
          {
            color: colors.text,
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
    alignSelf: 'flex-start',
    borderRadius: borderRadius.full,
  },
  label: {
    fontFamily: typography.overline.fontFamily,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
