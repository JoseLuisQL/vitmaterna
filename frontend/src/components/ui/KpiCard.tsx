import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

type DeltaTone = 'positive' | 'negative' | 'neutral';

interface KpiCardProps {
  label: string;
  value: string | number;
  /** Badge contextual, ej. "+12%". */
  badge?: string;
  badgeTone?: DeltaTone;
  style?: ViewStyle;
}

const TONE: Record<DeltaTone, { bg: string; text: string }> = {
  positive: { bg: semanticColors.successLight, text: semanticColors.success },
  negative: { bg: semanticColors.dangerLight, text: semanticColors.danger },
  neutral: { bg: commonColors.surfaceAlt, text: commonColors.textSecondary },
};

/**
 * KPI card: label arriba, valor grande y badge de porcentaje con fondo contextual.
 */
export function KpiCard({ label, value, badge, badgeTone = 'neutral', style }: KpiCardProps): React.ReactElement {
  const tone = TONE[badgeTone];
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.badgeText, { color: tone.text }]}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  label: { ...typography.caption, color: commonColors.textSecondary },
  valueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  value: { ...typography.h1, color: commonColors.text, flexShrink: 1 },
  badge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { ...typography.micro },
});
