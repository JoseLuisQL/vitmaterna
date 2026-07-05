/**
 * DateTimeField — selector profesional de fecha/hora, idéntico en web y móvil.
 *
 * En vez del <input type="date|time"> del navegador (inconsistente entre
 * navegadores) y del picker nativo del SO, usa componentes de marca dentro de
 * un Overlay (BottomSheet en móvil · modal centrado en web):
 *   - mode="date" → CalendarPicker (calendario mensual).
 *   - mode="time" → TimeWheel (columnas hora/minuto).
 *
 * Trabaja con valores string ISO: 'YYYY-MM-DD' (date) o 'HH:mm' (time).
 * Mantiene la misma API que la versión anterior (cero cambios en las pantallas).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Calendar, Clock, ChevronDown } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';
import { Overlay } from '../patterns/Overlay';
import { AppButton } from './AppButton';
import { CalendarPicker } from './CalendarPicker';
import { TimeWheel } from './TimeWheel';

type Mode = 'date' | 'time';

interface DateTimeFieldProps {
  label: string;
  /** Valor: 'YYYY-MM-DD' para date, 'HH:mm' para time. */
  value: string;
  onChange: (value: string) => void;
  mode?: Mode;
  placeholder?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  themeColor?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Para mode="time": límites 'HH:mm'. */
  minTime?: string;
  maxTime?: string;
  minuteStep?: number;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const pad = (n: number) => String(n).padStart(2, '0');

const parseDate = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

const fromDate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const displayValue = (value: string, mode: Mode): string => {
  if (!value) return '';
  if (mode === 'date') {
    const d = parseDate(value);
    return d ? d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }) : value;
  }
  return value; // HH:mm ya es legible
};

export function DateTimeField({
  label,
  value,
  onChange,
  mode = 'date',
  placeholder = 'Seleccionar…',
  error,
  helperText,
  required,
  themeColor = commonColors.borderStrong,
  minimumDate,
  maximumDate,
  minTime,
  maxTime,
  minuteStep = 5,
  disabled,
  containerStyle,
}: DateTimeFieldProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  // Borrador: el usuario confirma antes de aplicar (evita cierres accidentales).
  const [draftDate, setDraftDate] = useState<Date | null>(null);
  const [draftTime, setDraftTime] = useState<string | null>(null);
  const Icon = mode === 'date' ? Calendar : Clock;
  const accent = themeColor === commonColors.borderStrong ? commonColors.text : themeColor;

  const openPicker = () => {
    if (disabled) return;
    setDraftDate(mode === 'date' ? parseDate(value) : null);
    setDraftTime(mode === 'time' ? (value || null) : null);
    setOpen(true);
  };

  const confirm = () => {
    if (mode === 'date' && draftDate) onChange(fromDate(draftDate));
    if (mode === 'time' && draftTime) onChange(draftTime);
    setOpen(false);
  };

  const canConfirm = mode === 'date' ? !!draftDate : !!draftTime;

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[styles.label, !!error && { color: semanticColors.danger }]}>
          {label}{required ? <Text style={{ color: semanticColors.danger }}> *</Text> : null}
        </Text>
      ) : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled, IS_WEB && !disabled && ({ cursor: 'pointer' } as any)]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? displayValue(value, mode) : placeholder}`}
        accessibilityState={{ disabled: !!disabled }}
      >
        <Icon size={18} color={error ? semanticColors.danger : commonColors.textSecondary} />
        <Text style={[styles.valueText, !value && styles.placeholderText]} numberOfLines={1}>
          {value ? displayValue(value, mode) : placeholder}
        </Text>
        <ChevronDown size={18} color={commonColors.textTertiary} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}

      <Overlay
        visible={open}
        onClose={() => setOpen(false)}
        title={mode === 'date' ? 'Selecciona la fecha' : 'Selecciona la hora'}
        scroll={false}
        footer={
          <>
            <AppButton title="Cancelar" variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }} />
            <AppButton title="Confirmar" onPress={confirm} disabled={!canConfirm} themeColor={accent} style={{ flex: 1 }} />
          </>
        }
      >
        {mode === 'date' ? (
          <CalendarPicker
            value={draftDate}
            onSelect={setDraftDate}
            accentColor={accent}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        ) : (
          <TimeWheel
            value={draftTime}
            onChange={setDraftTime}
            accentColor={accent}
            minuteStep={minuteStep}
          />
        )}
      </Overlay>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { ...typography.label, color: commonColors.textSecondary, marginBottom: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  fieldError: { borderColor: semanticColors.danger },
  fieldDisabled: { backgroundColor: commonColors.borderLight, opacity: 0.7 },
  valueText: { flex: 1, ...typography.body, color: commonColors.text, textTransform: 'capitalize' },
  placeholderText: { color: commonColors.textTertiary, textTransform: 'none' },
  errorText: { ...typography.caption, color: semanticColors.danger, marginTop: spacing.xs },
  helperText: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.xs },
});

export default DateTimeField;
