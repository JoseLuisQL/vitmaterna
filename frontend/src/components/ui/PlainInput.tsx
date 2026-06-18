/**
 * VITMATERNA — PlainInput
 * Input controlado por value/onChangeText (sin React Hook Form), con el MISMO
 * aspecto que AppInput: label, foco animado, error inline y soporte multiline.
 * Pensado para formularios basados en useState (p. ej. los modales de la
 * historia clínica), de modo que toda la app comparta el mismo estilo de campo.
 */
import React, { useState, useCallback } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, interpolateColor,
} from 'react-native-reanimated';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

const AnimatedView = Animated.createAnimatedComponent(View);

interface PlainInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  helperText?: string;
  themeColor?: string;
  containerStyle?: ViewStyle;
}

export function PlainInput({
  label,
  error,
  helperText,
  themeColor = commonColors.borderStrong,
  containerStyle,
  multiline,
  onFocus,
  onBlur,
  ...rest
}: PlainInputProps): React.ReactElement {
  const focusAnim = useSharedValue(0);

  const handleFocus = useCallback((e: any) => { focusAnim.value = withTiming(1, { duration: 180 }); onFocus?.(e); }, [focusAnim, onFocus]);
  const handleBlur = useCallback((e: any) => { focusAnim.value = withTiming(0, { duration: 180 }); onBlur?.(e); }, [focusAnim, onBlur]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? semanticColors.danger
      : interpolateColor(focusAnim.value, [0, 1], [commonColors.border, themeColor]);
    return { borderColor, borderWidth: focusAnim.value > 0.5 ? 2 : 1 };
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {!!label && <Text style={[styles.label, error && styles.labelError]}>{label}</Text>}
      <AnimatedView style={[styles.inputContainer, multiline && styles.inputContainerMultiline, animatedBorderStyle]}>
        <TextInput
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={commonColors.textTertiary}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          {...rest}
        />
      </AnimatedView>
      {error ? <Text style={styles.errorText}>{error}</Text> : helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.xs },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight as any,
    color: commonColors.text,
    marginBottom: spacing.xs,
  },
  labelError: { color: semanticColors.danger },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
    minHeight: 52,
  },
  inputContainerMultiline: { alignItems: 'stretch' },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  inputMultiline: { minHeight: 90, textAlignVertical: 'top', paddingTop: spacing.sm + 2 },
  errorText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: semanticColors.danger,
    marginTop: spacing.xs,
  },
  helperText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: commonColors.textSecondary,
    marginTop: spacing.xs,
  },
});
