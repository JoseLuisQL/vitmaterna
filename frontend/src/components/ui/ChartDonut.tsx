/**
 * VITMATERNA — ChartDonut
 *
 * Gráfico de dona (anillo) para proporciones: ideal para la distribución por
 * nivel de riesgo (bajo/medio/alto). Más legible que las barras para "partes de
 * un todo": el total va al centro y cada segmento muestra su color, conteo y %.
 *
 * Usa react-native-svg (funciona en web y nativo). Anillo dibujado con
 * `strokeDasharray` sobre círculos, sin dependencias extra.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { chartTokens } from '../../theme/charts';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutDatum[];
  /** Diámetro del anillo. */
  size?: number;
  /** Grosor del anillo. */
  thickness?: number;
  /** Etiqueta bajo el número central (p. ej. "gestantes"). */
  centerLabel?: string;
}

export function ChartDonut({
  data,
  size = 168,
  thickness = 22,
  centerLabel = 'total',
}: Props): React.ReactElement {
  const total = data.reduce((a, d) => a + (d.value || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Construye los segmentos acumulando offsets sobre la circunferencia.
  // Para empezar arriba (12 en punto) sin rotar el grupo (lo que en web genera
  // un warning de transform-origin), desplazamos el dashoffset un cuarto de
  // vuelta: así el primer segmento arranca arriba en lugar de a las 3 en punto.
  const quarter = circumference / 4;
  let acc = 0;
  const segments = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const fraction = total > 0 ? d.value / total : 0;
      const dash = fraction * circumference;
      const seg = { color: d.color, dash, offset: acc };
      acc += dash;
      return seg;
    });

  return (
    <View style={styles.row}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {/* Pista de fondo. */}
          <Circle
            cx={cx}
            cy={cy}
            r={radius}
            stroke={commonColors.surfaceAlt}
            strokeWidth={thickness}
            fill="none"
          />
          {segments.map((s, i) => (
            <Circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              stroke={s.color}
              strokeWidth={thickness}
              fill="none"
              strokeLinecap="butt"
              strokeDasharray={`${s.dash} ${circumference - s.dash}`}
              // +quarter desplaza el inicio al tope (12 en punto) sin rotar el grupo.
              strokeDashoffset={quarter - s.offset}
            />
          ))}
        </Svg>
        {/* Total al centro (superpuesto al SVG). */}
        <View style={styles.center} pointerEvents="none">
          <Text style={styles.centerValue}>{total}</Text>
          <Text style={styles.centerLabel}>{centerLabel}</Text>
        </View>
      </View>

      {/* Leyenda: color · etiqueta · conteo (porcentaje). */}
      <View style={styles.legend}>
        {data.map((d, i) => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <View key={i} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: d.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
              <Text style={styles.legendValue}>
                {d.value} <Text style={styles.legendPct}>({pct}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: chartTokens.legendGap },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerValue: { ...typography.h1, color: commonColors.text },
  centerLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  legend: { flex: 1, minWidth: 0, gap: spacing.sm2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendLabel: { ...typography.bodySm, color: commonColors.text, flex: 1, minWidth: 0 },
  legendValue: { ...typography.bodySm, fontWeight: '700', color: commonColors.text },
  legendPct: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },
});

export default ChartDonut;
