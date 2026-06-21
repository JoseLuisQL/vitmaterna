/**
 * VITMATERNA — CalendarPicker (calendario mensual de marca)
 *
 * Calendario propio (no el <input type="date"> del navegador) para una
 * experiencia idéntica y profesional en web y móvil. Navegación por mes,
 * cuadrícula de 7 columnas, día de hoy marcado, selección con acento de rol,
 * y respeto de min/max. Solo tokens del tema.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';

interface CalendarPickerProps {
  /** Fecha seleccionada (o null). */
  value: Date | null;
  onSelect: (date: Date) => void;
  accentColor: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function CalendarPicker({
  value,
  onSelect,
  accentColor,
  minimumDate,
  maximumDate,
}: CalendarPickerProps): React.ReactElement {
  const today = startOfDay(new Date());
  const initial = value ?? today;
  const [cursor, setCursor] = useState(new Date(initial.getFullYear(), initial.getMonth(), 1));

  const min = minimumDate ? startOfDay(minimumDate) : null;
  const max = maximumDate ? startOfDay(maximumDate) : null;

  // Celdas del mes: huecos iniciales (lunes-first) + días.
  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = lunes
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < firstDow; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [cursor]);

  const canPrev = !min || new Date(cursor.getFullYear(), cursor.getMonth(), 1) > new Date(min.getFullYear(), min.getMonth(), 1);
  const canNext = !max || new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) <= new Date(max.getFullYear(), max.getMonth(), 1);

  const isDisabled = (d: Date) => (min && d < min) || (max && d > max);

  return (
    <View style={styles.wrap}>
      {/* Cabecera de navegación */}
      <View style={styles.navRow}>
        <Pressable
          onPress={() => canPrev && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={!canPrev}
          hitSlop={8}
          style={[styles.navBtn, !canPrev && styles.navBtnDisabled, IS_WEB && ({ cursor: canPrev ? 'pointer' : 'default' } as any)]}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <ChevronLeft size={20} color={canPrev ? commonColors.text : commonColors.disabled} />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
        </Text>
        <Pressable
          onPress={() => canNext && setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={!canNext}
          hitSlop={8}
          style={[styles.navBtn, !canNext && styles.navBtnDisabled, IS_WEB && ({ cursor: canNext ? 'pointer' : 'default' } as any)]}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <ChevronRight size={20} color={canNext ? commonColors.text : commonColors.disabled} />
        </Pressable>
      </View>

      {/* Cabecera de días de la semana */}
      <View style={styles.dowRow}>
        {DOW.map((d, i) => (
          <View key={i} style={styles.cell}>
            <Text style={styles.dowText}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Cuadrícula de días */}
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const selected = value && sameDay(d, value);
          const isToday = sameDay(d, today);
          const disabled = isDisabled(d);
          return (
            <View key={i} style={styles.cell}>
              <Pressable
                onPress={() => !disabled && onSelect(d)}
                disabled={!!disabled}
                style={[
                  styles.day,
                  selected && { backgroundColor: accentColor },
                  !selected && isToday && { borderWidth: 1.5, borderColor: accentColor },
                  IS_WEB && !disabled && ({ cursor: 'pointer' } as any),
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: !!selected, disabled: !!disabled }}
                accessibilityLabel={`${d.getDate()} de ${MONTHS[d.getMonth()]}`}
              >
                <Text
                  style={[
                    styles.dayText,
                    selected && styles.dayTextSelected,
                    !selected && isToday && { color: accentColor, fontFamily: typography.label.fontFamily },
                    disabled && styles.dayTextDisabled,
                  ]}
                >
                  {d.getDate()}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  navBtn: {
    width: 40, height: 40, borderRadius: borderRadius.md,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: commonColors.surfaceAlt,
  },
  navBtnDisabled: { opacity: 0.4 },
  monthLabel: { ...typography.h4, color: commonColors.text, textTransform: 'capitalize' },
  dowRow: { flexDirection: 'row' },
  dowText: { ...typography.caption, color: commonColors.textTertiary, fontFamily: typography.label.fontFamily },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  day: {
    width: 38, height: 38, borderRadius: borderRadius.full,
    alignItems: 'center', justifyContent: 'center',
  },
  dayText: { ...typography.body, color: commonColors.text },
  dayTextSelected: { color: commonColors.white, fontFamily: typography.label.fontFamily, fontWeight: '700' },
  dayTextDisabled: { color: commonColors.disabled },
});

export default CalendarPicker;
