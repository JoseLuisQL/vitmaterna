/**
 * DateTimeField — selector profesional de fecha/hora compatible móvil + web.
 *
 * - Móvil (iOS/Android): usa @react-native-community/datetimepicker (rueda/calendario
 *   nativo del sistema), abierto desde un campo con estilo consistente.
 * - Web: usa <input type="date|time"> nativo del navegador (calendario/reloj real),
 *   estilizado para integrarse con el design system.
 *
 * Trabaja con valores string ISO: 'YYYY-MM-DD' (date) o 'HH:mm' (time).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ViewStyle } from 'react-native';
import { Calendar, Clock } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

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
  themeColor?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

const pad = (n: number) => String(n).padStart(2, '0');

const toDate = (value: string, mode: Mode): Date => {
  if (mode === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  } else {
    const m = /^(\d{2}):(\d{2})$/.exec(value || '');
    const d = new Date();
    if (m) { d.setHours(Number(m[1]), Number(m[2]), 0, 0); return d; }
  }
  return new Date();
};

const fromDate = (d: Date, mode: Mode): string =>
  mode === 'date'
    ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    : `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const displayValue = (value: string, mode: Mode): string => {
  if (!value) return '';
  if (mode === 'date') {
    const d = toDate(value, mode);
    return d.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
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
  themeColor = commonColors.borderStrong,
  minimumDate,
  maximumDate,
  disabled,
  containerStyle,
}: DateTimeFieldProps): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const Icon = mode === 'date' ? Calendar : Clock;

  // ── WEB: input nativo del navegador ──
  if (Platform.OS === 'web') {
    const minStr = minimumDate ? fromDate(minimumDate, 'date') : undefined;
    const maxStr = maximumDate ? fromDate(maximumDate, 'date') : undefined;
    return (
      <View style={[styles.container, containerStyle]}>
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}>
          <Icon size={18} color={error ? semanticColors.danger : commonColors.textSecondary} />
          <input
            type={mode}
            value={value}
            min={mode === 'date' ? minStr : undefined}
            max={mode === 'date' ? maxStr : undefined}
            disabled={disabled}
            onChange={(e: any) => onChange(e.target.value)}
            style={webInputStyle}
          />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      </View>
    );
  }

  // ── MÓVIL: picker nativo del sistema ──
  // Import diferido para que la web nunca cargue el módulo nativo.
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={() => !disabled && setShowPicker(true)}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? displayValue(value, mode) : placeholder}`}
      >
        <Icon size={18} color={error ? semanticColors.danger : commonColors.textSecondary} />
        <Text style={[styles.valueText, !value && styles.placeholderText]}>
          {value ? displayValue(value, mode) : placeholder}
        </Text>
      </Pressable>
      {showPicker && (
        <DateTimePicker
          value={toDate(value, mode)}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          // API moderna (datetimepicker v9): onValueChange + onDismiss en lugar
          // del onChange deprecado.
          onValueChange={(_event: any, selected: Date) => {
            // En iOS el spinner permanece abierto; en Android se cierra al elegir.
            if (selected) onChange(fromDate(selected, mode));
            if (Platform.OS !== 'ios') setShowPicker(false);
          }}
          onDismiss={() => setShowPicker(false)}
        />
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const webInputStyle: any = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 15,
  fontFamily: 'Inter_400Regular, system-ui, sans-serif',
  color: commonColors.text,
};

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.textSecondary },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
  },
  fieldError: { borderColor: semanticColors.danger },
  fieldDisabled: { opacity: 0.6 },
  valueText: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text, textTransform: 'capitalize' },
  placeholderText: { color: commonColors.textTertiary, textTransform: 'none' },
  errorText: { ...typography.caption, color: semanticColors.danger },
  helperText: { ...typography.caption, color: commonColors.textSecondary },
});

export default DateTimeField;
