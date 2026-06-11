/**
 * VITMATERNA — Gráfica de Altura Uterina vs Edad Gestacional (RF-5.03).
 * Muestra los valores medidos junto a las bandas de referencia P10/P90
 * (CLAP/MINSA) para detectar restricción o exceso de crecimiento.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { commonColors, obstetraColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { interpolateAU, classifyAlturaUterina } from '../../utils/clinicalReferences';

interface ControlPoint {
  week?: number | null;
  alturaUterina?: number | null;
}

interface Props {
  controls: ControlPoint[];
  themeColor?: string;
}

const hexToRgba = (hex: string, opacity = 1): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export function AlturaUterinaChart({ controls, themeColor = obstetraColors.primary }: Props): React.ReactElement | null {
  const points = useMemo(
    () =>
      controls
        .filter((c) => c.week != null && c.alturaUterina != null && Number(c.alturaUterina) > 0)
        .map((c) => ({ semana: Number(c.week), au: Number(c.alturaUterina) }))
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

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Altura Uterina vs Edad Gestacional</Text>

      <LineChart
        data={{
          labels,
          datasets: [
            { data: p10Data, color: (o = 1) => hexToRgba(commonColors.textTertiary, o * 0.7), strokeWidth: 1, withDots: false },
            { data: p90Data, color: (o = 1) => hexToRgba(commonColors.textTertiary, o * 0.7), strokeWidth: 1, withDots: false },
            { data: auData, color: (o = 1) => hexToRgba(themeColor, o), strokeWidth: 3 },
          ],
          legend: ['P10', 'P90', 'AU (cm)'],
        }}
        width={screenWidth - 72}
        height={200}
        chartConfig={{
          backgroundColor: commonColors.surface,
          backgroundGradientFrom: commonColors.surface,
          backgroundGradientTo: commonColors.surface,
          decimalPlaces: 1,
          color: (o = 1) => hexToRgba(themeColor, o),
          labelColor: (o = 1) => hexToRgba(commonColors.textSecondary, o),
          propsForDots: { r: '4', strokeWidth: '2', stroke: themeColor },
        }}
        style={{ marginLeft: -10, marginTop: 10, borderRadius: borderRadius.lg }}
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
    borderWidth: 1,
    borderColor: commonColors.border,
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
