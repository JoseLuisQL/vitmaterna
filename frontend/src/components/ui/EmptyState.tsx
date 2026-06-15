/**
 * VITMATERNA - EmptyState Component
 * Empty state with Lucide icon, title, description, optional action button.
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LucideIcon, Inbox } from 'lucide-react-native';
import { AppButton } from './AppButton';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionTitle?: string;
  onAction?: () => void;
  style?: ViewStyle;
  themeColor?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionTitle,
  onAction,
  style,
  themeColor,
}) => {
  // Si se pasa themeColor, el icono usa un halo con el color de acento (más
  // cálido); si no, cae al gris neutro por defecto.
  const accent = themeColor;
  return (
    <View style={[styles.container, style]}>
      <View style={[styles.halo, accent ? { backgroundColor: accent + '14' } : null]}>
        <View
          style={[
            styles.iconContainer,
            accent ? { backgroundColor: accent + '1F' } : null,
          ]}
        >
          <Icon size={40} color={accent || commonColors.disabled} strokeWidth={1.6} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionTitle && onAction && (
        <View style={styles.actionContainer}>
          <AppButton
            title={actionTitle}
            onPress={onAction}
            variant="outline"
            size="sm"
            themeColor={themeColor}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  halo: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: commonColors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: commonColors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.textSecondary,
    textAlign: 'center',
    lineHeight: typography.body.lineHeight,
    maxWidth: 300,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
});
