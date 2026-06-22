/**
 * VITMATERNA — TimeWheel (selector de hora de marca)
 *
 * Selección de hora consistente en web y móvil. Patrón:
 *   1) Vista colapsada: dos cajas (Hora / Minuto) que muestran el valor actual.
 *   2) Al TOCAR una caja se despliega su rueda de números (scroller).
 *   3) La rueda es CÍCLICA: tras 23 sigue 00 (y al revés); ídem minutos.
 *
 * Trabaja con strings 'HH:mm'. Selección por toque del número o por la
 * posición central al desplazar (snap), con banda de selección central.
 */
import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
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
  /** Atajos de horas frecuentes (chips). Vacío = sin atajos. */
  presets?: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');
const ROW_HEIGHT = 44;
const VISIBLE_ROWS = 5; // filas visibles en la rueda (impar → centro real)
const CENTER = Math.floor(VISIBLE_ROWS / 2); // fila central = 2
const WHEEL_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;
// Repeticiones para simular continuidad infinita; se reposiciona al bloque
// central cuando el scroll se acerca a los extremos.
const REPEAT = 11;
const MID = Math.floor(REPEAT / 2); // bloque central = 5

type Unit = 'hour' | 'minute';

export function TimeWheel({
  value,
  onChange,
  accentColor,
  minuteStep = 5,
  presets = ['06:00', '08:00', '12:00', '18:00', '20:00'],
}: TimeWheelProps): React.ReactElement {
  const [selH, selM] = useMemo(() => {
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    return m ? [Number(m[1]), Number(m[2])] : [8, 0];
  }, [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(
    () => Array.from({ length: Math.ceil(60 / minuteStep) }, (_, i) => i * minuteStep),
    [minuteStep],
  );

  // Cuál rueda está abierta (null = ambas colapsadas).
  const [editing, setEditing] = useState<Unit | null>(null);

  const setHour = useCallback((h: number) => onChange(`${pad(h)}:${pad(selM)}`), [onChange, selM]);
  const setMinute = useCallback((m: number) => onChange(`${pad(selH)}:${pad(m)}`), [onChange, selH]);

  return (
    <View style={styles.wrap}>
      {/* Valor seleccionado, grande y claro */}
      <View style={styles.preview}>
        <Text style={[styles.previewText, { color: accentColor }]}>{value || '--:--'}</Text>
      </View>

      {/* Atajos de horas frecuentes */}
      {presets.length > 0 ? (
        <View style={styles.presetsRow}>
          {presets.map((p) => {
            const active = value === p;
            return (
              <Pressable
                key={p}
                onPress={() => { onChange(p); setEditing(null); }}
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

      {/* Cajas Hora / Minuto: al tocar una se despliega su rueda */}
      <View style={styles.boxesRow}>
        <UnitBox
          label="Hora"
          valueLabel={pad(selH)}
          open={editing === 'hour'}
          accentColor={accentColor}
          onToggle={() => setEditing((e) => (e === 'hour' ? null : 'hour'))}
        />
        <UnitBox
          label="Minuto"
          valueLabel={pad(selM)}
          open={editing === 'minute'}
          accentColor={accentColor}
          onToggle={() => setEditing((e) => (e === 'minute' ? null : 'minute'))}
        />
      </View>

      {/* Rueda cíclica de la unidad abierta */}
      {editing === 'hour' ? (
        <CyclicWheel
          items={hours}
          selected={selH}
          accentColor={accentColor}
          onSelect={setHour}
        />
      ) : editing === 'minute' ? (
        <CyclicWheel
          items={minutes}
          selected={selM}
          accentColor={accentColor}
          onSelect={setMinute}
        />
      ) : (
        <Text style={styles.hint}>Toca «Hora» o «Minuto» para ajustar.</Text>
      )}
    </View>
  );
}

/** Caja desplegable que muestra el valor de una unidad. */
function UnitBox({
  label, valueLabel, open, accentColor, onToggle,
}: { label: string; valueLabel: string; open: boolean; accentColor: string; onToggle: () => void }): React.ReactElement {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.box, open && { borderColor: accentColor, backgroundColor: commonColors.surface }, IS_WEB && ({ cursor: 'pointer' } as any)]}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${label}: ${valueLabel}`}
    >
      <Text style={styles.boxLabel}>{label}</Text>
      <View style={styles.boxValueRow}>
        <Text style={[styles.boxValue, open && { color: accentColor }]}>{valueLabel}</Text>
        <ChevronDown size={16} color={open ? accentColor : commonColors.textTertiary} style={open ? styles.chevronOpen : undefined} />
      </View>
    </Pressable>
  );
}

/** Rueda de números con scroll continuo (cíclico) y selección central. */
function CyclicWheel({
  items, selected, accentColor, onSelect,
}: { items: number[]; selected: number; accentColor: string; onSelect: (n: number) => void }): React.ReactElement {
  const ref = useRef<ScrollView>(null);
  const base = items.length;
  const selIdx = Math.max(0, items.indexOf(selected));

  // Lista repetida para dar sensación de continuidad infinita.
  const looped = useMemo(
    () => Array.from({ length: REPEAT * base }, (_, i) => items[i % base]),
    [items, base],
  );

  // y que deja el índice global `globalIdx` en la fila central.
  const yFor = useCallback((globalIdx: number) => (globalIdx - CENTER) * ROW_HEIGHT, []);

  // Centrar en la selección (bloque central) al abrir.
  useEffect(() => {
    const target = MID * base + selIdx;
    ref.current?.scrollTo({ y: yFor(target), animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const centerGlobal = Math.round(y / ROW_HEIGHT) + CENTER;
      const itemIdx = ((centerGlobal % base) + base) % base;
      // Selecciona el número que quedó centrado.
      onSelect(items[itemIdx]);
      // Reposiciona invisiblemente al bloque central si estamos cerca del borde.
      const block = Math.floor(centerGlobal / base);
      if (block <= 1 || block >= REPEAT - 2) {
        const newGlobal = MID * base + itemIdx;
        ref.current?.scrollTo({ y: yFor(newGlobal), animated: false });
      }
    },
    [base, items, onSelect, yFor],
  );

  return (
    <View style={styles.wheelWrap}>
      <View pointerEvents="none" style={styles.centerBand} />
      <ScrollView
        ref={ref}
        style={styles.wheel}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleMomentumEnd}
        // En web el scroll no siempre dispara momentum: usamos onScrollEndDrag.
        onScrollEndDrag={IS_WEB ? handleMomentumEnd : undefined}
      >
        {looped.map((n, i) => {
          const active = (i % base) === selIdx;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(n)}
              style={[styles.row, IS_WEB && ({ cursor: 'pointer' } as any)]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.rowText, active && { color: accentColor, fontFamily: typography.label.fontFamily, fontWeight: '700' }]}>
                {pad(n)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
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

  // Cajas Hora / Minuto
  boxesRow: { flexDirection: 'row', gap: spacing.sm },
  box: {
    flex: 1,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: 2,
  },
  boxLabel: { ...typography.caption, color: commonColors.textTertiary },
  boxValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boxValue: { ...typography.numericSm, color: commonColors.text },
  chevronOpen: { transform: [{ rotate: '180deg' }] },
  hint: { ...typography.caption, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.md },

  // Rueda
  wheelWrap: { height: WHEEL_HEIGHT, justifyContent: 'center' },
  centerBand: {
    position: 'absolute',
    left: 0, right: 0,
    top: ROW_HEIGHT * CENTER,
    height: ROW_HEIGHT,
    backgroundColor: commonColors.surfaceHover,
    borderRadius: borderRadius.sm,
  },
  wheel: {
    height: WHEEL_HEIGHT,
    flexGrow: 0,
    flexShrink: 0,
  },
  row: { height: ROW_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  rowText: { ...typography.h3, color: commonColors.textSecondary, fontVariant: ['tabular-nums'] },
});

export default TimeWheel;
