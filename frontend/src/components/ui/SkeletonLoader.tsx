/**
 * VITMATERNA - SkeletonLoader
 * Placeholders con animación shimmer (loop de opacidad) para reemplazar el
 * spinner global durante la carga. Incluye variantes compuestas listas para
 * usar: CardSkeleton, ListItemSkeleton, DashboardSkeleton.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { commonColors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';

type SkeletonShape = 'line' | 'circle' | 'rect' | 'card';

interface SkeletonProps {
  shape?: SkeletonShape;
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  shape = 'rect',
  width = '100%',
  height,
  radius,
  style,
}) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const resolvedHeight =
    height ?? (shape === 'line' ? 14 : shape === 'circle' ? 48 : shape === 'card' ? 120 : 48);
  const resolvedRadius =
    radius ??
    (shape === 'circle'
      ? borderRadius.full
      : shape === 'line'
        ? borderRadius.sm
        : borderRadius.lg);
  const resolvedWidth = shape === 'circle' ? resolvedHeight : width;

  return (
    <Animated.View
      style={[
        styles.base,
        { width: resolvedWidth, height: resolvedHeight, borderRadius: resolvedRadius },
        animatedStyle,
        style,
      ]}
    />
  );
};

/** Tarjeta skeleton: título + dos líneas. */
export const CardSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.row}>
      <Skeleton shape="circle" height={44} />
      <View style={styles.flex}>
        <Skeleton shape="line" width="60%" />
        <Skeleton shape="line" width="40%" style={{ marginTop: spacing.sm }} />
      </View>
    </View>
    <Skeleton shape="line" width="100%" style={{ marginTop: spacing.md }} />
    <Skeleton shape="line" width="80%" style={{ marginTop: spacing.sm }} />
  </View>
);

/** Fila de lista skeleton: avatar + dos líneas + valor. */
export const ListItemSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.listItem, style]}>
    <Skeleton shape="circle" height={40} />
    <View style={styles.flex}>
      <Skeleton shape="line" width="55%" />
      <Skeleton shape="line" width="35%" style={{ marginTop: spacing.sm }} />
    </View>
    <Skeleton shape="line" width={40} />
  </View>
);

/** Skeleton de dashboard: KPIs + tarjetas. */
export const DashboardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.dashboard}>
    <View style={styles.kpiRow}>
      <Skeleton shape="rect" height={88} style={styles.flex} />
      <Skeleton shape="rect" height={88} style={styles.flex} />
    </View>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </View>
);

/** Lista de N filas skeleton. */
export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => (
  <View style={styles.dashboard}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.card}>
        <ListItemSkeleton />
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: commonColors.surfaceHover,
  },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dashboard: {
    gap: spacing.md,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
