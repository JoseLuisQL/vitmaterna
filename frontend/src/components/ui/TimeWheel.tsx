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

/** Rueda de números con scroll continuo (cíclico) y selección SIEMPRE en el centro. */
function CyclicWheel({
  items, selected, accentColor, onSelect,
}: { items: number[]; selected: number; accentColor: string; onSelect: (n: number) => void }): React.ReactElement {
  const ref = useRef<ScrollView>(null);
  const base = items.length;
  const selIdx = Math.max(0, items.indexOf(selected));

  // Índice de ÍTEM (0..base-1) que está ahora mismo en el centro. Resalta y se
  // mantiene sincronizado en vivo con el scroll, no solo al final.
  const [centerItem, setCenterItem] = useState(selIdx);
  const lastEmitted = useRef(selIdx);

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
    setCenterItem(selIdx);
    lastEmitted.current = selIdx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);



  const settling = useRef(false);
  const lastY = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el temporizador de inactividad al desmontar.
  useEffect(() => () => { if (idleTimer.current) clearTimeout(idleTimer.current); }, []);

  // Alinea (snap) el número EXACTO al centro del marcador, con animación.
  const alignToCenter = useCallback(
    (y: number) => {
      const centerGlobalRaw = Math.round(y / ROW_HEIGHT) + CENTER;
      const itemIdx = ((centerGlobalRaw % base) + base) % base;
      setCenterItem(itemIdx);
      if (itemIdx !== lastEmitted.current) {
        lastEmitted.current = itemIdx;
        onSelect(items[itemIdx]);
      }
      settling.current = true;
      const block = Math.floor(centerGlobalRaw / base);
      if (block <= 1 || block >= REPEAT - 2) {
        // Reposición invisible al bloque central (ya queda centrado).
        ref.current?.scrollTo({ y: yFor(MID * base + itemIdx), animated: false });
      } else {
        // Snap suave a la fila exacta.
        ref.current?.scrollTo({ y: yFor(centerGlobalRaw), animated: true });
      }
      setTimeout(() => { settling.current = false; }, 220);
    },
    [base, items, onSelect, yFor],
  );

  // En cada frame de scroll: resalta/selecciona el del centro EN VIVO y, como
  // red de seguridad universal (rueda de mouse en web, donde no hay momentum
  // ni drag-end), programa una alineación automática cuando el scroll se
  // detiene (~140 ms sin nuevos eventos).
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      lastY.current = y;
      if (settling.current) return;
      const centerGlobal = Math.round(y / ROW_HEIGHT) + CENTER;
      const itemIdx = ((centerGlobal % base) + base) % base;
      if (itemIdx !== centerItem) setCenterItem(itemIdx);
      if (itemIdx !== lastEmitted.current) {
        lastEmitted.current = itemIdx;
        onSelect(items[itemIdx]);
      }
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => { alignToCenter(lastY.current); }, 140);
    },
    [base, centerItem, items, onSelect, alignToCenter],
  );

  // Al terminar arrastre/momentum: alinear de inmediato.
  const handleSettle = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (settling.current) return;
      alignToCenter(e.nativeEvent.contentOffset.y);
    },
    [alignToCenter],
  );

  return (
    <View style={styles.wheelWrap}>
      <View pointerEvents="none" style={styles.centerBand} />
      <ScrollView
        ref={ref}
        testID="timewheel-scroll"
        style={styles.wheel}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        scrollEventThrottle={16}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleSettle}
        onScrollEndDrag={handleSettle}
      >
        {looped.map((n, i) => {
          const active = (i % base) === centerItem;
          return (
            <Pressable
              key={i}
              onPress={() => { onSelect(n); lastEmitted.current = i % base; setCenterItem(i % base); ref.current?.scrollTo({ y: yFor(MID * base + (i % base)), animated: true }); }}
              style={[styles.row, IS_WEB && ({ cursor: 'pointer' } as any)]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.rowText, active ? { color: accentColor, fontFamily: typography.label.fontFamily, fontWeight: '700' } : styles.rowTextDim]}>
                {pad(n)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {/* Velos superior/inferior para enfatizar el centro (estilo rueda iOS). */}
      <View pointerEvents="none" style={styles.fadeTop} />
      <View pointerEvents="none" style={styles.fadeBottom} />
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
  rowText: { ...typography.h3, color: commonColors.text, fontVariant: ['tabular-nums'] },
  rowTextDim: { color: commonColors.textTertiary, fontWeight: '400' },
  fadeTop: {
    position: 'absolute', left: 0, right: 0, top: 0,
    height: ROW_HEIGHT * CENTER,
    backgroundColor: commonColors.surface,
    opacity: 0.55,
    zIndex: 1,
  },
  fadeBottom: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: ROW_HEIGHT * CENTER,
    backgroundColor: commonColors.surface,
    opacity: 0.55,
    zIndex: 1,
  },
});

export default TimeWheel;
