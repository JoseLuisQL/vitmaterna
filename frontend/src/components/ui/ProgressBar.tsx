/**
 * VITMATERNA - ProgressBar Component
 * Animated progress bar with percentage and color changes based on value.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { commonColors, riskColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface ProgressBarProps {
  progress: number; // 0-100
  showPercentage?: boolean;
  height?: number;
  label?: string;
  style?: ViewStyle;
}

const getProgressColor = (progress: number): string => {
  if (progress >= 80) return riskColors.riskGreen;
  if (progress >= 50) return riskColors.riskYellow;
  return riskColors.riskRed;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showPercentage = true,
  height = 8,
  label,
  style,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress));
  const animatedWidth = useSharedValue(0);
  const color = getProgressColor(clampedProgress);

  useEffect(() => {
    animatedWidth.value = withTiming(clampedProgress, { duration: 600 });
  }, [clampedProgress, animatedWidth]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%` as unknown as number,
  }));

  return (
    <View style={[styles.container, style]}>
      {(label || showPercentage) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercentage && (
            <Text style={[styles.percentage, { color }]}>
              {Math.round(clampedProgress)}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: color, height },
            animatedBarStyle,
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '500',
    color: commonColors.text,
  },
  percentage: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
  },
  track: {
    width: '100%',
    backgroundColor: commonColors.borderLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: borderRadius.full,
  },
});
