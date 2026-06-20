/**
 * VITMATERNA - PressableScale
 *
 * Envoltorio táctil reutilizable que aplica una micro-interacción de "pressed"
 * (escala + leve atenuación) con reanimated, consistente con AppCard. Úsalo en
 * elementos tocables personalizados (KPIs, accesos rápidos, filas de lista) que
 * no son AppCard, para un feedback uniforme en toda la app.
 */
import React from 'react';
import { Pressable, StyleProp, ViewStyle, PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { animations } from '../../theme/animations';
import { IS_WEB } from '../../theme/responsive';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressableScaleProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (default 0.97). */
  scaleTo?: number;
  /** Atenuación al presionar (default 0.9). */
  dimTo?: number;
}

export const PressableScale: React.FC<PressableScaleProps> = ({
  children,
  style,
  scaleTo = 0.97,
  dimTo = 0.9,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) {
          scale.value = withSpring(scaleTo, animations.springFast);
          opacity.value = withTiming(dimTo, { duration: animations.duration.fast });
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, animations.springFast);
        opacity.value = withTiming(1, { duration: animations.duration.fast });
        onPressOut?.(e);
      }}
      style={[
        animatedStyle,
        !disabled && IS_WEB && ({ cursor: 'pointer' } as any),
        style,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
};

export default PressableScale;
