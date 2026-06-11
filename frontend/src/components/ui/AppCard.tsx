/**
 * VITMATERNA - AppCard Component
 * Card with shadow, border radius, optional press functionality.
 */
import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { commonColors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface AppCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
  noPadding?: boolean;
  elevated?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({
  children,
  style,
  onPress,
  padding,
  noPadding = false,
  elevated = false,
}) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    }
  };

  const cardStyle: StyleProp<ViewStyle> = [
    styles.card,
    elevated ? shadows.md : shadows.sm,
    noPadding ? undefined : { padding: padding ?? spacing.md },
    style,
  ];

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, cardStyle]}
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
    overflow: 'hidden',
  },
});
