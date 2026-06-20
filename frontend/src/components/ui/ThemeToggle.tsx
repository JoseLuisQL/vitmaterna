/**
 * VITMATERNA - ThemeToggle
 * Selector de apariencia: Sistema · Claro · Oscuro. Persiste vía ThemeContext.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Smartphone, Sun, Moon, type LucideIcon } from 'lucide-react-native';
import { useTheme, type ThemeMode } from '../../theme/ThemeContext';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const OPTIONS: { mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: 'system', label: 'Sistema', icon: Smartphone },
  { mode: 'light', label: 'Claro', icon: Sun },
  { mode: 'dark', label: 'Oscuro', icon: Moon },
];

export function ThemeToggle({ accentColor = '#4A90D9' }: { accentColor?: string }): React.ReactElement {
  const { mode, setMode, colors } = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt }]}>
      {OPTIONS.map((opt) => {
        const active = mode === opt.mode;
        const Icon = opt.icon;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => setMode(opt.mode)}
            style={[styles.seg, active && { backgroundColor: accentColor }, { cursor: 'pointer', outlineStyle: 'none' } as any]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`Apariencia ${opt.label}`}
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
