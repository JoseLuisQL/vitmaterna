/**
 * VITMATERNA - AppButton Component
 * Beautiful button with variants, loading state, press animation, haptic feedback.
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { commonColors, gestanteColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  themeColor?: string;
}

const VARIANT_STYLES: Record<
  ButtonVariant,
  {
    bg: string;
    text: string;
    border: string;
    bgPressed: string;
    loadingColor: string;
  }
> = {
  primary: {
    bg: gestanteColors.primary,
    text: '#FFFFFF',
    border: 'transparent',
    bgPressed: gestanteColors.primaryDark,
    loadingColor: '#FFFFFF',
  },
  secondary: {
    bg: gestanteColors.primaryLight,
    text: gestanteColors.primaryDark,
    border: 'transparent',
    bgPressed: gestanteColors.primaryLight,
    loadingColor: gestanteColors.primaryDark,
  },
  outline: {
    bg: 'transparent',
    text: gestanteColors.primary,
    border: gestanteColors.primary,
    bgPressed: gestanteColors.primaryLight,
    loadingColor: gestanteColors.primary,
  },
  danger: {
    bg: semanticColors.danger,
    text: '#FFFFFF',
    border: 'transparent',
    bgPressed: '#B91C1C',
    loadingColor: '#FFFFFF',
  },
  ghost: {
    bg: 'transparent',
    text: commonColors.text,
    border: 'transparent',
    bgPressed: commonColors.surfaceAlt,
    loadingColor: commonColors.text,
  },
};

const SIZE_STYLES: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }
> = {
  sm: { height: 40, paddingHorizontal: 16, fontSize: 14, iconSize: 16 },
  md: { height: 52, paddingHorizontal: 24, fontSize: 16, iconSize: 20 },
  lg: { height: 60, paddingHorizontal: 32, fontSize: 18, iconSize: 22 },
};

export const AppButton: React.FC<AppButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  themeColor,
}) => {
  const scale = useSharedValue(1);

  const variantStyle = { ...VARIANT_STYLES[variant] };
  if (themeColor && variant === 'primary') {
    variantStyle.bg = themeColor;
  }
  if (themeColor && variant === 'secondary') {
    variantStyle.text = themeColor;
    variantStyle.loadingColor = themeColor;
  }
  if (themeColor && variant === 'outline') {
    variantStyle.text = themeColor;
    variantStyle.border = themeColor;
    variantStyle.loadingColor = themeColor;
  }

  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      height: sizeStyle.height,
      paddingHorizontal: sizeStyle.paddingHorizontal,
      backgroundColor: isDisabled ? commonColors.disabled : variantStyle.bg,
      borderColor: isDisabled ? commonColors.disabled : variantStyle.border,
      borderWidth: variant === 'outline' ? 1.5 : 0,
    },
    variant === 'primary' && !isDisabled && shadows.button,
    fullWidth && styles.fullWidth,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const textColor = isDisabled
    ? commonColors.textSecondary
    : variantStyle.text;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, ...containerStyle]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={isDisabled ? commonColors.textSecondary : variantStyle.loadingColor}
        />
      ) : (
        <View style={styles.content}>
          {Icon && iconPosition === 'left' && (
            <Icon
              size={sizeStyle.iconSize}
              color={textColor}
              style={styles.iconLeft as any}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                fontSize: sizeStyle.fontSize,
                color: textColor,
              },
            ]}
          >
            {title}
          </Text>
          {Icon && iconPosition === 'right' && (
            <Icon
              size={sizeStyle.iconSize}
              color={textColor}
              style={styles.iconRight as any}
            />
          )}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    minWidth: 48,
  },
  fullWidth: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: typography.button.fontFamily,
    fontWeight: typography.button.fontWeight,
    letterSpacing: typography.button.letterSpacing,
  },
  iconLeft: {
    marginRight: spacing.sm,
  },
  iconRight: {
    marginLeft: spacing.sm,
  },
});
