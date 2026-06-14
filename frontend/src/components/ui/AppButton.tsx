/**
 * VITMATERNA - AppButton
 * Botón con variantes, tamaños, gradient opcional, animación spring,
 * haptic feedback y estados de loading/disabled.
 *
 * Variantes: primary | secondary | outline | ghost | danger
 * Tamaños:   sm (40h) | md (52h) | lg (60h)  [>=48 recomendado a11y]
 */
import React, { useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { LucideIcon } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { commonColors, gestanteColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows, coloredGlow } from '../../theme/shadows';
import { animations } from '../../theme/animations';
import { haptics } from '../../utils/haptics';

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
  rounded?: boolean;
  /** Aplica gradient en variante primary (usa themeGradient o gestante). */
  gradient?: boolean;
  themeGradient?: readonly [string, string, ...string[]];
  /** Desactiva el haptic feedback (activado por defecto en primary/danger). */
  haptic?: boolean;
  style?: ViewStyle;
  themeColor?: string;
}

interface VariantStyle {
  bg: string;
  text: string;
  border: string;
  bgPressed: string;
  loadingColor: string;
}

const VARIANT_STYLES: Record<ButtonVariant, VariantStyle> = {
  primary: {
    bg: gestanteColors.primary,
    text: commonColors.white,
    border: commonColors.transparent,
    bgPressed: gestanteColors.primaryDark,
    loadingColor: commonColors.white,
  },
  secondary: {
    bg: gestanteColors.primaryLight,
    text: gestanteColors.primary,
    border: commonColors.transparent,
    bgPressed: gestanteColors.primaryMid,
    loadingColor: gestanteColors.primary,
  },
  outline: {
    bg: commonColors.transparent,
    text: gestanteColors.primary,
    border: gestanteColors.primary,
    bgPressed: gestanteColors.primaryLight,
    loadingColor: gestanteColors.primary,
  },
  danger: {
    bg: semanticColors.danger,
    text: commonColors.white,
    border: commonColors.transparent,
    bgPressed: semanticColors.danger,
    loadingColor: commonColors.white,
  },
  ghost: {
    bg: commonColors.transparent,
    text: commonColors.text,
    border: commonColors.transparent,
    bgPressed: commonColors.surfaceAlt,
    loadingColor: commonColors.text,
  },
};

const SIZE_STYLES: Record<
  ButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number; iconSize: number }
> = {
  sm: { height: 40, paddingHorizontal: spacing.md, fontSize: 14, iconSize: 16 },
  md: { height: 52, paddingHorizontal: spacing.lg, fontSize: 16, iconSize: 20 },
  lg: { height: 60, paddingHorizontal: spacing.xl, fontSize: 18, iconSize: 22 },
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
  rounded = false,
  gradient = false,
  themeGradient,
  haptic,
  style,
  themeColor,
}) => {
  const scale = useSharedValue(1);

  const variantStyle: VariantStyle = { ...VARIANT_STYLES[variant] };
  if (themeColor && variant === 'primary') {
    variantStyle.bg = themeColor;
    variantStyle.bgPressed = themeColor;
  }
  if (themeColor && (variant === 'secondary' || variant === 'outline')) {
    variantStyle.text = themeColor;
    variantStyle.loadingColor = themeColor;
    if (variant === 'outline') variantStyle.border = themeColor;
  }

  const sizeStyle = SIZE_STYLES[size];
  const isDisabled = disabled || loading;
  const useGradient = gradient && variant === 'primary' && !isDisabled;
  const gradientColors =
    themeGradient ?? ([variantStyle.bg, variantStyle.bgPressed] as const);

  const hapticOn = haptic ?? (variant === 'primary' || variant === 'danger');

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.96, animations.springFast);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, animations.springFast);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (hapticOn) haptics.light();
    onPress();
  }, [hapticOn, onPress]);

  const radius = rounded ? borderRadius.full : borderRadius.lg;

  const containerStyle: ViewStyle[] = [
    styles.base,
    {
      height: sizeStyle.height,
      paddingHorizontal: useGradient ? 0 : sizeStyle.paddingHorizontal,
      borderRadius: radius,
      backgroundColor: isDisabled
        ? commonColors.disabled
        : useGradient
          ? commonColors.transparent
          : variantStyle.bg,
      borderColor: isDisabled ? commonColors.disabled : variantStyle.border,
      borderWidth: variant === 'outline' ? 1.5 : 0,
    },
    variant === 'primary' && !isDisabled && !useGradient && shadows.card,
    useGradient && coloredGlow(gradientColors[gradientColors.length - 1]),
    fullWidth && styles.fullWidth,
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  const textColor = isDisabled ? commonColors.textSecondary : variantStyle.text;

  const renderContent = () =>
    loading ? (
      <ActivityIndicator
        size="small"
        color={isDisabled ? commonColors.textSecondary : variantStyle.loadingColor}
      />
    ) : (
      <View style={styles.content}>
        {Icon && iconPosition === 'left' && (
          <Icon size={sizeStyle.iconSize} color={textColor} style={styles.iconLeft as any} />
        )}
        <Text style={[styles.text, { fontSize: sizeStyle.fontSize, color: textColor }]}>
          {title}
        </Text>
        {Icon && iconPosition === 'right' && (
          <Icon size={sizeStyle.iconSize} color={textColor} style={styles.iconRight as any} />
        )}
      </View>
    );

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      style={[animatedStyle, ...containerStyle]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {useGradient ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientFill,
            { borderRadius: radius, paddingHorizontal: sizeStyle.paddingHorizontal },
          ]}
        >
          {renderContent()}
        </LinearGradient>
      ) : (
        renderContent()
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    overflow: 'hidden',
  },
  gradientFill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
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
