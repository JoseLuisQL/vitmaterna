/**
 * VITMATERNA - ListItem
 * Fila de lista reutilizable: ícono circular de color a la izquierda, título +
 * subtítulo, y valor/badge/elemento a la derecha. Presionable opcional.
 */
import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { LucideIcon, ChevronRight } from 'lucide-react-native';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

interface ListItemProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  /** Valor de texto a la derecha. */
  value?: string;
  /** Elemento custom a la derecha (badge, switch, etc.). Tiene prioridad sobre value. */
  right?: React.ReactNode;
  onPress?: () => void;
  /** Muestra chevron a la derecha cuando es presionable. */
  showChevron?: boolean;
  /** Separador inferior. */
  divider?: boolean;
  style?: ViewStyle;
}

export function ListItem({
  title,
  subtitle,
  icon: Icon,
  iconColor = gestanteColors.primary,
  iconBg,
  value,
  right,
  onPress,
  showChevron = false,
  divider = false,
  style,
}: ListItemProps): React.ReactElement {
  const content = (
    <>
      {Icon && (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: iconBg ?? `${iconColor}1A` },
          ]}
        >
          <Icon size={20} color={iconColor} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? (
        <View style={styles.right}>{right}</View>
      ) : value ? (
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {showChevron && onPress ? (
        <ChevronRight size={18} color={commonColors.textTertiary} />
      ) : null}
    </>
  );

  const containerStyle = [styles.container, divider && styles.divider, style];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          containerStyle,
          pressed && { backgroundColor: commonColors.surfaceHover },
        ]}
        accessibilityRole="button"
        accessibilityLabel={title}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={containerStyle}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingVertical: spacing.sm2,
    minHeight: 56,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { ...typography.bodyMd, color: commonColors.text },
  subtitle: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 1 },
  right: { alignItems: 'flex-end' },
  value: { ...typography.numericSm, color: commonColors.text },
});
