/**
 * VITMATERNA - ThemeToggle
 * Selector de apariencia: Sistema · Claro · Oscuro. Persiste vía ThemeContext.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Smartphone, Sun, Moon, type LucideIcon } from 'lucide-react-native';
import { useTheme, type ThemeMode } from '../../theme/ThemeContext';
import { commonColors, obstetraColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const OPTIONS: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: 'system', label: 'Sistema', icon: Smartphone },
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'dark', label: 'Oscuro', icon: Moon },
];

/**
 * Modos disponibles actualmente. El modo oscuro/sistema está en desarrollo, así
 * que solo se ofrece 'light'. En vez de mostrar opciones deshabilitadas (ruido),
 * se ocultan; cuando se reactive el dark mode, basta ampliar esta lista.
 */
const AVAILABLE_MODES: ThemeMode[] = ['light'];

/** ¿Tiene sentido mostrar el selector de tema? (≥2 modos disponibles). */
export const isThemeToggleAvailable = AVAILABLE_MODES.length >= 2;

export function ThemeToggle({ accentColor = obstetraColors.primary }: { accentColor?: string }): React.ReactElement | null {
  const { mode, setMode, colors } = useTheme();
  const options = OPTIONS.filter((o) => AVAILABLE_MODES.includes(o.mode));

  // Con un solo modo disponible, el selector no aporta nada → no se muestra.
  if (options.length < 2) return null;

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt }]}>
      {options.map((opt) => {
        const active = mode === opt.mode;
        const disabled = false;
        const Icon = opt.icon;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => {
              if (!disabled) setMode(opt.mode);
            }}
            disabled={disabled}
            style={[
              styles.seg,
              active && { backgroundColor: accentColor },
              disabled && { opacity: 0.4 },
              { cursor: disabled ? 'not-allowed' : 'pointer', outlineStyle: 'none' } as any
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled }}
            accessibilityLabel={`Apariencia ${opt.label}${disabled ? ' (No disponible)' : ''}`}
          >
            <Icon size={16} color={active ? commonColors.white : colors.textSecondary} />
            <Text style={[styles.label, { color: active ? commonColors.white : colors.textSecondary }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: borderRadius.full, padding: 4, gap: 4 },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: borderRadius.full },
  label: { ...typography.caption, fontWeight: '700' },
});

export default ThemeToggle;
