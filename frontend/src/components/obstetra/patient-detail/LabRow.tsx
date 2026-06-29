/**
 * LabRow — fila de resultado de laboratorio con interpretación clínica visible.
 * Componente presentacional puro extraído del monolito (Fase 3).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { commonColors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { borderRadius } from '../../../theme/spacing';
import { LAB_STATE_META, type LabState } from './helpers';

export function LabRow({
  label,
  hint,
  value,
  state,
  stateLabel,
  isLast = false,
}: {
  label: string;
  hint?: string;
  value?: string | null;
  state: LabState;
  stateLabel: string;
  isLast?: boolean;
}): React.ReactElement {
  const meta = LAB_STATE_META[state];
  return (
    <View style={[styles.row, !isLast && styles.border]}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <View style={styles.right}>
        {value ? <Text style={styles.value} numberOfLines={2}>{value}</Text> : null}
        <View style={[styles.pill, { backgroundColor: meta.bg }]}>
          <Text style={[styles.pillText, { color: meta.color }]} numberOfLines={1}>{stateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  left: { flex: 1.2, minWidth: 0 },
  label: { ...typography.bodySm, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.text },
  hint: { ...typography.caption, color: commonColors.textTertiary, marginTop: 1 },
  right: { flexShrink: 1, alignItems: 'flex-end', gap: 4, minWidth: 0 },
  value: { ...typography.bodySm, fontWeight: '700', color: commonColors.text, textAlign: 'right' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, alignSelf: 'flex-end' },
  pillText: { ...typography.overline, fontSize: 10, fontWeight: '700' },
});

export default LabRow;
