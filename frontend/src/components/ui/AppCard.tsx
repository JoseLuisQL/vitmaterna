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
  /**
   * Densidad del padding interno. 'comfortable' (20px, default) para tarjetas
   * hero de dashboard; 'compact' (16px) para listas densas y filas. Se ignora
   * si se pasa `padding` explícito o `noPadding`.
   */
  density?: 'comfortable' | 'compact';
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
  density = 'comfortable',
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

  const resolvedPadding = padding ?? (density === 'compact' ? spacing.md : spacing.md2);

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    elevated ? shadows.float : shadows.card,
    highlighted && { borderWidth: 1, borderColor: accentColor },
    highlighted && coloredGlow(accentColor),
    bordered && !highlighted && styles.bordered,
    noPadding ? undefined : { padding: resolvedPadding },
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
