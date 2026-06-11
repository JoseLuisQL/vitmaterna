import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

export interface ToggleTab {
  key: string;
  label: string;
}

interface ToggleTabsProps {
  tabs: ToggleTab[];
  value: string;
  onChange: (key: string) => void;
  /** Color del texto/acento de la pestaña activa. Por defecto texto principal. */
  activeColor?: string;
  style?: ViewStyle;
}

/**
 * Toggle tabs estilo SaaS: track gris con pastilla blanca activa y sombra sutil.
 */
export function ToggleTabs({ tabs, value, onChange, activeColor, style }: ToggleTabsProps): React.ReactElement {
  return (
    <View style={[styles.track, style]}>
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, active && styles.tabActive, active && shadows.xs]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[
                styles.label,
                { color: active ? (activeColor ?? commonColors.text) : commonColors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.full,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
  },
  tabActive: {
    backgroundColor: commonColors.surface,
  },
  label: { ...typography.buttonSmall },
});
