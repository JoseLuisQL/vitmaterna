/**
 * VITMATERNA - KpiCard
 * Tarjeta blanca flotante estilo referencia: ícono circular de color en la
 * esquina, número grande con acento, label y badge de variación opcional.
 * Barra de progreso lineal opcional al fondo.
 */
import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

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
  style,
}: KpiCardProps): React.ReactElement {
  const tone = TONE[badgeTone];
  const accent = accentColor ?? commonColors.text;

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: `${accent}1A` }]}>
            <Icon size={16} color={accent} />
          </View>
        ) : null}
      </View>
      <View style={styles.valueRow}>
        <Text
          style={[styles.value, { color: accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {typeof progress === 'number' ? (
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
