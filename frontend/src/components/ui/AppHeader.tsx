/**
 * VITMATERNA - AppHeader
 * Header unificado con SafeArea automática. Variantes: flat (ice-blue/blanco),
 * gradient (LinearGradient del rol) y transparent. Soporta back, acción
 * derecha (ícono/label/nodo) y subtítulo.
 *
 * API legacy conservada: showBack, rightIcon, rightLabel, onRightPress.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

type HeaderVariant = 'flat' | 'gradient' | 'transparent';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: LucideIcon;
  rightLabel?: string;
  onRightPress?: () => void;
  /** Nodo custom a la derecha (campana, avatar...). Prioritario sobre icon/label. */
  rightNode?: React.ReactNode;
  variant?: HeaderVariant;
  /** Colores del gradient (variant='gradient'). */
  gradientColors?: readonly [string, string, ...string[]];
  /** Color de acento (texto/íconos sobre flat/transparent). */
  themeColor?: string;
  /** Alinea el título a la izquierda (default centrado en flat). */
  align?: 'center' | 'left';
  style?: ViewStyle;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBackPress,
  rightIcon: RightIcon,
  rightLabel,
  onRightPress,
  rightNode,
  variant = 'flat',
  gradientColors,
  themeColor,
  align,
  style,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isGradient = variant === 'gradient';
  const contentColor = isGradient ? commonColors.white : themeColor ?? commonColors.text;
  const titleAlign = align ?? (isGradient ? 'left' : 'center');

  const handleBack = () => {
    if (onBackPress) onBackPress();
    else if (router.canGoBack()) router.back();
  };

  const right = rightNode ?? (
    (RightIcon || rightLabel) && onRightPress ? (
      <Pressable
        onPress={onRightPress}
        style={[styles.iconButton, isGradient && styles.iconButtonOnGradient]}
        accessibilityLabel={rightLabel || 'Acción'}
        accessibilityRole="button"
        hitSlop={8}
      >
        {RightIcon ? (
          <RightIcon size={22} color={contentColor} />
        ) : (
          <Text style={[styles.rightLabel, { color: contentColor }]}>{rightLabel}</Text>
        )}
      </Pressable>
    ) : null
  );

  const inner = (
    <View style={styles.row}>
      <View style={styles.side}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={[styles.iconButton, isGradient && styles.iconButtonOnGradient]}
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={8}
          >
            <ChevronLeft size={24} color={contentColor} />
          </Pressable>
        )}
      </View>

      <View style={[styles.titleWrap, titleAlign === 'left' && styles.titleLeft]}>
        <Text
          style={[styles.title, { color: contentColor, textAlign: titleAlign }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.subtitle,
              {
                color: isGradient ? 'rgba(255,255,255,0.85)' : commonColors.textSecondary,
                textAlign: titleAlign,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );

  if (isGradient) {
    return (
      <LinearGradient
        colors={gradientColors ?? ['#5FA3E0', '#4A90D9']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradientContainer, { paddingTop: insets.top + spacing.sm }, style]}
      >
        {inner}
      </LinearGradient>
    );
  }

  return (
    <View
      style={[
        styles.flatContainer,
        variant === 'transparent' ? styles.transparent : styles.flat,
        { paddingTop: insets.top + spacing.xs },
        style,
      ]}
    >
      {inner}
    </View>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  flatContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  flat: {
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  transparent: {
    backgroundColor: commonColors.transparent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideRight: { alignItems: 'flex-end' },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  iconButtonOnGradient: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  titleWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xs },
  titleLeft: { alignItems: 'flex-start' },
  title: {
    ...typography.h3,
  },
  subtitle: {
    ...typography.bodySm,
    marginTop: 1,
  },
  rightLabel: {
    ...typography.label,
    fontWeight: '600',
  },
});
