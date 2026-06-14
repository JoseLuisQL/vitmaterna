/**
 * VITMATERNA - DateSelector
 * Selector de fecha horizontal: scroll de días con el día activo en círculo de
 * acento. Muestra DOW abreviado + número.
 */
import React, { useMemo, useRef, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface DateSelectorProps {
  /** Fecha seleccionada. */
  value: Date;
  onChange: (date: Date) => void;
  /** Cantidad de días a mostrar (default 14). */
  days?: number;
  /** Fecha de inicio del rango (default hoy). */
  startDate?: Date;
  accentColor?: string;
  style?: ViewStyle;
}

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DateSelector({
  value,
  onChange,
  days = 14,
  startDate,
  accentColor = gestanteColors.primary,
  style,
}: DateSelectorProps): React.ReactElement {
  const scrollRef = useRef<ScrollView>(null);

  const dates = useMemo(() => {
    const base = startDate ? new Date(startDate) : new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: days }).map((_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, [days, startDate]);

  const ITEM = 56 + spacing.sm; // ancho aprox + gap
  useEffect(() => {
    const idx = dates.findIndex((d) => sameDay(d, value));
    if (idx > 1 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: (idx - 1) * ITEM, animated: true });
    }
  }, [value, dates, ITEM]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.content, style]}
    >
      {dates.map((d, i) => {
        const active = sameDay(d, value);
        return (
          <TouchableOpacity
            key={i}
            onPress={() => onChange(d)}
            style={[styles.item, active && { backgroundColor: accentColor }]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${DOW[d.getDay()]} ${d.getDate()}`}
          >
            <Text style={[styles.dow, active && styles.activeText]}>{DOW[d.getDay()]}</Text>
            <Text style={[styles.num, active && styles.activeText]}>{d.getDate()}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  item: {
    width: 56,
    paddingVertical: spacing.sm2,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    gap: 2,
  },
  dow: { ...typography.caption, color: commonColors.textSecondary },
  num: { ...typography.numericSm, color: commonColors.text },
  activeText: { color: commonColors.white },
});
