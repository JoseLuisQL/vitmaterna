/**
 * VITMATERNA — TimeWheel (selector de hora de marca)
 *
 * Selección de hora consistente en web y móvil: dos columnas desplazables
 * (horas / minutos) con resalte de acento, en lugar del <input type="time">
 * del navegador. Trabaja con strings 'HH:mm'.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';

interface TimeWheelProps {
  /** Valor 'HH:mm' o null. */
  value: string | null;
  onChange: (value: string) => void;
  accentColor: string;
  /** Paso de minutos (default 5). */
  minuteStep?: number;
  /** Hora mínima/máxima en formato 'HH:mm' (opcional). */
  minTime?: string;
  maxTime?: string;
  /** Atajos de horas frecuentes (chips). Vacío = sin atajos. */
  presets?: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const ROW_HEIGHT = 44;

export function TimeWheel({
  value,
  onChange,
  accentColor,
  minuteStep = 5,
  minTime,
  maxTime,
  presets = ['06:00', '08:00', '12:00', '18:00', '20:00'],
}: TimeWheelProps): React.ReactElement {
  const [selH, selM] = useMemo(() => {
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    return m ? [Number(m[1]), Number(m[2])] : [null, null];
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  const hourRef = useRef<ScrollView>(null);
  const minRef = useRef<ScrollView>(null);

  // Auto-scroll a la selección al abrir.
  useEffect(() => {
    if (selH != null) hourRef.current?.scrollTo({ y: Math.max(0, hours.indexOf(selH) * ROW_HEIGHT - ROW_HEIGHT), animated: false });
    if (selM != null) minRef.current?.scrollTo({ y: Math.max(0, minutes.indexOf(selM) * ROW_HEIGHT - ROW_HEIGHT), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const limit = (h: number, m: number): boolean => {
    const t = h * 60 + m;
    if (minTime) { const mm = /^(\d{2}):(\d{2})$/.exec(minTime); if (mm && t < Number(mm[1]) * 60 + Number(mm[2])) return true; }
    if (maxTime) { const mm = /^(\d{2}):(\d{2})$/.exec(maxTime); if (mm && t > Number(mm[1]) * 60 + Number(mm[2])) return true; }
    return false;
  };

  const pick = (h: number, m: number) => onChange(`${pad(h)}:${pad(m)}`);

  const renderCol = (
    items: number[],
    selected: number | null,
    ref: React.RefObject<ScrollView | null>,
    onPick: (n: number) => void,
    isHour: boolean,
  ) => (
    <ScrollView
      ref={ref}
      style={styles.col}
      contentContainerStyle={styles.colContent}
      showsVerticalScrollIndicator={false}
      nestedScrollEnabled
    >
      {items.map((n) => {
        const active = selected === n;
        const disabled = isHour ? limit(n, selM ?? 0) : limit(selH ?? 0, n);
        return (
          <Pressable
            key={n}
            onPress={() => !disabled && onPick(n)}
            disabled={disabled}
            style={[styles.row, active && { backgroundColor: accentColor }, IS_WEB && !disabled && ({ cursor: 'pointer' } as any)]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
          >
            <Text style={[styles.rowText, active && styles.rowTextActive, disabled && styles.rowTextDisabled]}>
              {pad(n)}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.wrap}>
      {/* Valor seleccionado, grande y claro */}
      <View style={styles.preview}>
        <Text style={[styles.previewText, { color: accentColor }]}>
          {value || '--:--'}
        </Text>
      </View>

      {/* Atajos de horas frecuentes */}
      {presets.length > 0 ? (
        <View style={styles.presetsRow}>
          {presets.map((p) => {
            const active = value === p;
            return (
              <Pressable
                key={p}
                onPress={() => onChange(p)}
                style={[styles.preset, active && { backgroundColor: accentColor, borderColor: accentColor }, IS_WEB && ({ cursor: 'pointer' } as any)]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.presetText, active && styles.presetTextActive]}>{p}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.cols}>
        {/* Banda central que indica la fila seleccionada */}
        <View pointerEvents="none" style={styles.centerBand} />
        {renderCol(hours, selH, hourRef, (h) => pick(h, selM ?? 0), true)}
        <Text style={styles.colon}>:</Text>
        {renderCol(minutes, selM, minRef, (m) => pick(selH ?? 8, m), false)}
      </View>
      <View style={styles.labels}>
        <Text style={styles.colLabel}>Hora</Text>
        <Text style={styles.colLabel}>Minuto</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  preview: { alignItems: 'center', paddingVertical: spacing.xs },
  previewText: { ...typography.numeric, fontVariant: ['tabular-nums'] },
  presetsRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  preset: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1, borderColor: commonColors.border,
  },
  presetText: { ...typography.caption, fontFamily: typography.label.fontFamily, color: commonColors.textSecondary },
  presetTextActive: { color: commonColors.white },
  cols: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: ROW_HEIGHT * 4,
  },
  centerBand: {
    position: 'absolute',
    left: 0, right: 0,
    top: ROW_HEIGHT * 1.5,
    height: ROW_HEIGHT,
    backgroundColor: commonColors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  col: {
    // Altura fija = altura del contenedor; sin esto el ScrollView crece a la
    // altura de su contenido (24×44px) y descuadra todo el modal.
    width: 76,
    height: ROW_HEIGHT * 4,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.md,
  },
  colContent: { paddingVertical: ROW_HEIGHT * 1.5 },
  row: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.xs, borderRadius: borderRadius.sm },
  rowText: { ...typography.numericSm, color: commonColors.text },
  rowTextActive: { color: commonColors.white },
  rowTextDisabled: { color: commonColors.disabled },
  colon: { ...typography.h2, color: commonColors.textTertiary },
  labels: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md },
  colLabel: { width: 76, textAlign: 'center', ...typography.caption, color: commonColors.textTertiary },
});

export default TimeWheel;
