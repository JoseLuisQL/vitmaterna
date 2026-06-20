/**
 * VITMATERNA — LinkButton
 *
 * Acción textual de baja jerarquía: los "Ver todas", "Ver reportes",
 * "¿Olvidaste tu contraseña?" que hoy son `TouchableOpacity` + `Text` sueltos
 * con tamaños y colores distintos. Unifica tipografía (caption/label), color de
 * acento por rol, icono opcional y foco visible web.
 */
import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { commonColors, gestanteColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';

interface LinkButtonProps {
  label: string;
  onPress: () => void;
  /** Color de acento (por rol). Default: acento gestante. */
  color?: string;
  /** Icono opcional a la derecha (p. ej. ChevronRight). */
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function LinkButton({
  label,
  onPress,
  color = gestanteColors.primary,
  icon: Icon,
  size = 'sm',
  disabled = false,
  style,
  testID,
}: LinkButtonProps): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed, hovered }: any) => [
        styles.row,
        pressed && { opacity: 0.6 },
        hovered && { opacity: 0.85 },
        disabled && { opacity: 0.4 },
        IS_WEB && ({ cursor: disabled ? 'default' : 'pointer', outlineStyle: 'none' } as any),
        style,
      ]}
    >
      <AppText variant={size === 'sm' ? 'caption' : 'label'} color={disabled ? commonColors.textTertiary : color} style={styles.label}>
        {label}
      </AppText>
      {Icon ? (
        <View style={styles.icon}>
          <Icon size={size === 'sm' ? 14 : 16} color={disabled ? commonColors.textTertiary : color} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: spacing.xs },
  label: { fontWeight: '600' },
  icon: { marginTop: 1 },
});

export default LinkButton;
