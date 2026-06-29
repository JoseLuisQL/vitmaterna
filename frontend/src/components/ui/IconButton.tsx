/**
 * VITMATERNA — IconButton
 *
 * Botón circular de un solo icono, para acciones de cabecera, toolbars y filas
 * (menú, campana, cerrar, atrás, editar…). Unifica los `TouchableOpacity`
 * redondos sueltos: misma área táctil (≥44), mismos estados y foco visible web.
 *
 * Variantes de superficie:
 *   plain   → sin fondo (sobre superficies claras)
 *   surface → fondo neutro (surfaceAlt)
 *   onColor → translúcido blanco (sobre headers de gradiente)
 *   tinted  → fondo del color de acento al 12% (acción destacada)
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { borderRadius } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';
import { haptics } from '../../utils/haptics';

type IconButtonVariant = 'plain' | 'surface' | 'onColor' | 'tinted';
type IconButtonSize = 'sm' | 'md' | 'lg';

interface IconButtonProps {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Color del icono. Si se omite, se deriva de la variante. */
  color?: string;
  /** Color de acento para la variante tinted. */
  accentColor?: string;
  disabled?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SIZES: Record<IconButtonSize, { box: number; icon: number }> = {
  sm: { box: 36, icon: 18 },
  md: { box: 40, icon: 22 },
  lg: { box: 48, icon: 26 },
};

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  variant = 'surface',
  size = 'md',
  color,
  accentColor = commonColors.text,
  disabled = false,
  haptic = false,
  style,
  testID,
}: IconButtonProps): React.ReactElement {
  const dims = SIZES[size];

  const bg =
    variant === 'surface'
      ? commonColors.surfaceAlt
      : variant === 'onColor'
        ? 'rgba(255,255,255,0.18)'
        : variant === 'tinted'
          ? accentColor + '1F'
          : commonColors.transparent;

  const iconColor = color ?? (variant === 'onColor' ? commonColors.white : variant === 'tinted' ? accentColor : commonColors.text);

  const handlePress = useCallback(() => {
    if (haptic) haptics.light();
    onPress();
  }, [haptic, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed, hovered }: any) => [
        styles.base,
        { width: dims.box, height: dims.box, borderRadius: borderRadius.full, backgroundColor: bg },
        hovered && variant !== 'plain' && { opacity: 0.9 },
        pressed && { opacity: 0.7 },
        disabled && { opacity: 0.4 },
        IS_WEB && ({ cursor: disabled ? 'default' : 'pointer', transition: 'opacity 0.15s' } as any),
        style,
      ]}
    >
      <Icon size={dims.icon} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});

export default IconButton;
