/**
 * VITMATERNA - KpiCard
 * Tarjeta blanca flotante estilo referencia: ícono circular de color en la
 * esquina, número grande con acento, label y badge de variación opcional.
 * Barra de progreso lineal opcional al fondo.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { commonColors, semanticColors, withAlpha } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { useCountUp } from '../../hooks/useCountUp';

type DeltaTone = 'positive' | 'negative' | 'neutral';

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Badge contextual, ej. "+3 hoy". */
  badge?: string;
  badgeTone?: DeltaTone;
  icon?: LucideIcon;
  /** Color del acento (ícono + valor). */
  accentColor?: string;
  /** Progreso 0–100 para la barra inferior. */
  progress?: number;
  /**
   * 'compact' oculta la barra de progreso y reduce el ícono para filas de KPIs
   * densas. Default 'comfortable'.
   */
  variant?: 'comfortable' | 'compact';
  style?: ViewStyle;
}

const TONE: Record<DeltaTone, { bg: string; text: string }> = {
  positive: { bg: semanticColors.successMid, text: semanticColors.success },
  negative: { bg: semanticColors.dangerMid, text: semanticColors.danger },
  neutral: { bg: commonColors.surfaceAlt, text: commonColors.textSecondary },
};

export function KpiCard({
  label,
  value,
  badge,
  badgeTone = 'neutral',
  icon: Icon,
  accentColor,
  progress,
  variant = 'comfortable',
  style,
}: KpiCardProps): React.ReactElement {
  const tone = TONE[badgeTone];
  const accent = accentColor ?? commonColors.text;
  const compact = variant === 'compact';
  // Si el valor es numérico, anima con count-up; si es string, lo muestra tal cual.
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isNumeric = !Number.isNaN(numericValue);
  const animated = useCountUp(isNumeric ? numericValue : 0, 900);
  const displayValue = isNumeric ? animated : value;

  return (
    <View style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? (
          <View style={[styles.iconWrap, compact && styles.iconWrapCompact, { backgroundColor: withAlpha(accent, 0.1) }]}>
            <Icon size={compact ? 14 : 16} color={accent} />
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, { color: accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {displayValue}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {!compact && typeof progress === 'number' ? (
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              {
                width: `${Math.max(0, Math.min(100, progress))}%`,
                backgroundColor: accent,
              },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card,
  },
  cardCompact: {
    padding: spacing.sm2,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapCompact: {
    width: 24,
    height: 24,
  },
  label: { ...typography.caption, color: commonColors.textSecondary, flex: 1 },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  value: { ...typography.numericMd, flexShrink: 1 },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  badgeText: { ...typography.micro },
  track: {
    height: 4,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: borderRadius.full },
});
