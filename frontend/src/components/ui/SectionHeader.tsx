/**
 * VITMATERNA - SectionHeader
 * Encabezado de sección con título y acción opcional ("Ver todo").
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  actionColor?: string;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  actionColor = gestanteColors.primary,
  style,
}: SectionHeaderProps): React.ReactElement {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.titleWrap}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? (
        <Pressable
          onPress={action.onPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={action.label}
        >
          <Text style={[styles.action, { color: actionColor }]}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm2,
  },
  titleWrap: { flex: 1, marginRight: spacing.md },
  title: { ...typography.h3, color: commonColors.text },
  subtitle: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 1 },
  action: { ...typography.label, fontWeight: '600' },
});
