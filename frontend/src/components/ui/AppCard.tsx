/**
 * VITMATERNA - AppCard
 * Tarjeta blanca flotante con sombra suave (estilo referencia). El borde es
 * opcional (`bordered`); `highlighted` añade borde de acento + glow.
 */
import React from 'react';
import { Pressable, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { commonColors, gestanteColors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows, coloredGlow } from '../../theme/shadows';
import { animations } from '../../theme/animations';
import { IS_WEB } from '../../theme/responsive';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
  noPadding?: boolean;
  /** Sombra más marcada (float). */
  elevated?: boolean;
  /** Muestra borde suave además de la sombra. */
  bordered?: boolean;
  /** Borde de acento + glow para destacar la tarjeta. */
  highlighted?: boolean;
  /** Color de acento para el modo highlighted. */
  accentColor?: string;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  onPress,
  padding,
  noPadding = false,
  elevated = false,
  bordered = false,
  highlighted = false,
  accentColor = gestanteColors.primary,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) scale.value = withSpring(0.98, animations.springFast);
  };
  const handlePressOut = () => {
    if (onPress) scale.value = withSpring(1, animations.springFast);
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    elevated ? shadows.float : shadows.card,
    highlighted && { borderWidth: 1.5, borderColor: accentColor },
    highlighted && coloredGlow(accentColor),
    bordered && !highlighted && styles.bordered,
    noPadding ? undefined : { padding: padding ?? spacing.md },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, IS_WEB && ({ cursor: 'pointer' } as any), cardStyle]}
        accessibilityRole="button"
      >
        {children}
      </AnimatedPressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  bordered: {
    borderWidth: 1,
    borderColor: commonColors.border,
  },
});
