/**
 * VITMATERNA — Gráfica de Altura Uterina vs Edad Gestacional (RF-5.03).
 * Muestra los valores medidos junto a las bandas de referencia P10/P90
 * (CLAP/MINSA) para detectar restricción o exceso de crecimiento.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LineChartSvg } from '../ui/LineChartSvg';
import { commonColors, obstetraColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { interpolateAU, classifyAlturaUterina } from '../../utils/clinicalReferences';

interface ControlPoint {
  week?: number | null;
  alturaUterina?: number | null;
}

interface Props {
  controls: ControlPoint[];
  themeColor?: string;
}

export function AlturaUterinaChart({ controls, themeColor = obstetraColors.primary }: Props): React.ReactElement | null {
  const points = useMemo(
    () =>
      controls
        .map((c) => ({ semana: Number(c.week), au: Number(c.alturaUterina) }))
        .filter((p) => Number.isFinite(p.semana) && Number.isFinite(p.au) && p.au > 0)
        .sort((a, b) => a.semana - b.semana),
    [controls],
  );

  if (points.length < 2) return null;

  const labels = points.map((p) => `S${p.semana}`);
  const auData = points.map((p) => p.au);
  const refs = points.map((p) => interpolateAU(p.semana));
  const p10Data = refs.map((r, i) => r?.p10 ?? auData[i]);
  const p90Data = refs.map((r, i) => r?.p90 ?? auData[i]);

  // Estado del último control respecto a la referencia.
  const last = points[points.length - 1];
  const estado = classifyAlturaUterina(last.semana, last.au);
  const estadoMeta = {
    baja: { label: 'Por debajo de P10', color: semanticColors.warning },
    alta: { label: 'Por encima de P90', color: semanticColors.warning },
    normal: { label: 'Dentro de lo normal', color: semanticColors.success },
    sin_referencia: { label: 'Sin referencia', color: commonColors.textSecondary },
  }[estado];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Altura Uterina vs Edad Gestacional</Text>

      <LineChartSvg
        labels={labels}
        height={200}
        decimals={1}
        series={[
          { data: p10Data, color: commonColors.textTertiary, strokeWidth: 1.5, withDots: false, dashed: true },
          { data: p90Data, color: commonColors.textTertiary, strokeWidth: 1.5, withDots: false, dashed: true },
          { data: auData, color: themeColor, strokeWidth: 3 },
        ]}
        legend={[
          { label: 'P10', color: commonColors.textTertiary },
          { label: 'P90', color: commonColors.textTertiary },
          { label: 'AU (cm)', color: themeColor },
        ]}
        style={{ marginTop: spacing.sm }}
      />

      <View style={[styles.statusPill, { backgroundColor: estadoMeta.color + '20' }]}>
        <View style={[styles.dot, { backgroundColor: estadoMeta.color }]} />
        <Text style={[styles.statusText, { color: estadoMeta.color }]}>
          Último control (S{last.semana}): {estadoMeta.label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  title: { ...typography.h3, color: commonColors.text, marginBottom: spacing.sm },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    marginTop: spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...typography.caption, fontWeight: '700' },
});
