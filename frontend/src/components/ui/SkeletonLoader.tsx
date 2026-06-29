/**
 * VITMATERNA - SkeletonLoader
 * Placeholders con animación shimmer de BARRIDO (linear-gradient animado
 * izquierda→derecha) para reemplazar el spinner global durante la carga.
 * Respeta `useReducedMotion`: si el usuario tiene reduce-motion activado, el
 * placeholder se muestra estático (sin barrido). Incluye variantes compuestas
 * listas para usar: CardSkeleton, ListItemSkeleton, DashboardSkeleton, etc.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle, DimensionValue, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { commonColors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { useReducedMotion } from '../../theme/motion';

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
  const reduceMotion = useReducedMotion();
  const translateX = useSharedValue(-1);
  const { width: winWidth } = useWindowDimensions();
  // Ancho estimado del bloque brillado: suficiente para cubrir cualquier celda.
  const sweepWidth = Math.max(160, winWidth);

  useEffect(() => {
    if (reduceMotion) return; // estático: no animar
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
  }, [translateX, reduceMotion]);

  const sweepStyle = useAnimatedStyle(() => {
    // t va de 0→1; mapeamos a translateX de -sweepWidth a +sweepWidth.
    const t = translateX.value;
    const x = -sweepWidth + t * (sweepWidth * 2);
    return { transform: [{ translateX: x }] };
  });

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
    <View
      style={[
        styles.base,
        { width: resolvedWidth, height: resolvedHeight, borderRadius: resolvedRadius },
        style,
      ]}
    >
      {!reduceMotion && (
        <Animated.View
          style={[styles.sweep, sweepStyle, { width: sweepWidth / 2 }]}
          pointerEvents="none"
        />
      )}
    </View>
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

/** Skeleton de chat: burbujas alternadas (izquierda/derecha). */
export const ChatSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <View style={styles.chat}>
    {Array.from({ length: count }).map((_, i) => {
      const mine = i % 2 === 1;
      const w = 55 + ((i * 13) % 30); // ancho variable 55-85%
      return (
        <Skeleton
          key={i}
          shape="rect"
          width={`${w}%` as DimensionValue}
          height={i % 3 === 0 ? 56 : 38}
          radius={borderRadius.xl}
          style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}
        />
      );
    })}
  </View>
);

/** Skeleton de tabla (web): cabecera + N filas con celdas. */
export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 8, cols = 5 }) => (
  <View style={styles.table}>
    <View style={[styles.tableRow, styles.tableHeader]}>
      {Array.from({ length: cols }).map((_, c) => (
        <View key={c} style={styles.flex}>
          <Skeleton shape="line" width="60%" height={10} />
        </View>
      ))}
    </View>
    {Array.from({ length: rows }).map((_, r) => (
      <View key={r} style={styles.tableRow}>
        {Array.from({ length: cols }).map((_, c) => (
          <View key={c} style={styles.flex}>
            <Skeleton shape="line" width={c === 0 ? '80%' : '50%'} />
          </View>
        ))}
      </View>
    ))}
  </View>
);

/** Skeleton de una fila de KPIs (3 tarjetas). */
export const KpiRowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <View style={styles.kpiRow}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton key={i} shape="rect" height={96} style={styles.flex} radius={borderRadius.xl} />
    ))}
  </View>
);

/** Skeleton de formulario: N campos (label + control). */
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <View style={styles.form}>
    {Array.from({ length: fields }).map((_, i) => (
      <View key={i} style={styles.formField}>
        <Skeleton shape="line" width="35%" height={11} />
        <Skeleton shape="rect" height={52} radius={borderRadius.lg} style={{ marginTop: spacing.sm }} />
      </View>
    ))}
    <Skeleton shape="rect" height={52} radius={borderRadius.lg} style={{ marginTop: spacing.md }} />
  </View>
);

/** Skeleton de cabecera de detalle: avatar grande + título + meta + acciones. */
export const DetailHeaderSkeleton: React.FC<{ style?: ViewStyle }> = ({ style }) => (
  <View style={[styles.card, style]}>
    <View style={styles.row}>
      <Skeleton shape="circle" height={64} />
      <View style={styles.flex}>
        <Skeleton shape="line" width="65%" height={18} />
        <Skeleton shape="line" width="45%" style={{ marginTop: spacing.sm }} />
        <Skeleton shape="line" width="30%" style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  base: {
    backgroundColor: commonColors.surfaceHover,
    overflow: 'hidden',
  },
  /** Bloque translúcido que barre la superficie para el efecto shimmer. */
  sweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    // Degradado simulado con un bloque blanco translúcido (sin expo-linear-gradient
    // para mantener el componente sin dependencias nativas extra). El barrido lo da
    // el translateX animado.
    backgroundColor: 'rgba(255,255,255,0.45)',
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
  chat: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  table: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: commonColors.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
  },
  tableHeader: { backgroundColor: commonColors.surfaceAlt, borderTopWidth: 0 },
  form: { gap: spacing.md },
  formField: {},
});
