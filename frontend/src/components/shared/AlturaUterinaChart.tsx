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

  const labels = points.map((p) => `Sem ${p.semana}`);
  const auData = points.map((p) => p.au);
  const refs = points.map((p) => interpolateAU(p.semana));
  const p10Data = refs.map((r, i) => r?.p10 ?? auData[i]);
  const p90Data = refs.map((r, i) => r?.p90 ?? auData[i]);

  // Estado del último control respecto a la referencia, con explicación en
  // lenguaje claro y la acción sugerida (no solo "P90").
  const last = points[points.length - 1];
  const estado = classifyAlturaUterina(last.semana, last.au);
  const estadoMeta = {
    baja: {
      label: 'Crecimiento por debajo de lo esperado',
      detail: 'La altura uterina es menor a lo normal para las semanas. Descarta restricción del crecimiento (considera ecografía).',
      color: semanticColors.warning,
    },
    alta: {
      label: 'Crecimiento por encima de lo esperado',
      detail: 'La altura uterina es mayor a lo normal para las semanas. Puede indicar bebé grande, exceso de líquido o error en las fechas (considera ecografía).',
      color: semanticColors.warning,
    },
    normal: {
      label: 'El bebé crece dentro de lo normal',
      detail: 'La altura uterina está dentro del rango esperado para las semanas de embarazo.',
      color: semanticColors.success,
    },
    sin_referencia: {
      label: 'Sin referencia para estas semanas',
      detail: 'Aún no hay rango de referencia para esta edad gestacional.',
      color: commonColors.textSecondary,
    },
  }[estado];

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Crecimiento del bebé (altura uterina)</Text>
      <Text style={styles.subtitle}>
        La línea morada es tu paciente. La franja verde es lo normal: mientras el punto esté dentro, el crecimiento va bien.
      </Text>

      <LineChartSvg
        labels={labels}
        height={210}
        decimals={1}
        yAxisLabel="Altura uterina (cm)"
        xAxisLabel="Semanas de embarazo"
        band={{ lower: p10Data, upper: p90Data, color: semanticColors.successLight }}
        series={[
          { data: p10Data, color: commonColors.borderStrong, strokeWidth: 1, withDots: false, dashed: true },
          { data: p90Data, color: commonColors.borderStrong, strokeWidth: 1, withDots: false, dashed: true },
          { data: auData, color: themeColor, strokeWidth: 3, highlightLast: true },
        ]}
        legend={[
          { label: 'Zona normal', color: semanticColors.success },
          { label: 'Altura de tu paciente', color: themeColor },
        ]}
        style={{ marginTop: spacing.sm }}
      />

      {/* Estado del último control: titular + explicación accionable */}
      <View style={[styles.statusBox, { backgroundColor: estadoMeta.color + '14', borderColor: estadoMeta.color + '40' }]}>
        <View style={styles.statusHeader}>
          <View style={[styles.dot, { backgroundColor: estadoMeta.color }]} />
          <Text style={[styles.statusText, { color: estadoMeta.color }]}>
            {estadoMeta.label}
          </Text>
        </View>
        <Text style={styles.statusDetail}>
          Último control (semana {last.semana}, {last.au} cm): {estadoMeta.detail}
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
  title: { ...typography.h3, color: commonColors.text, marginBottom: 4 },
  subtitle: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },
  statusBox: {
    marginTop: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 6,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  statusText: { ...typography.bodySm, fontWeight: '700' },
  statusDetail: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 18 },
});
