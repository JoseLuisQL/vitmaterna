/**
 * VITMATERNA - AppInput Component
 * Input with label, error, icon support, secure text toggle, focus animation.
 * Integrates with React Hook Form via Controller.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Pressable,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Eye, EyeOff, LucideIcon } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Control, Controller, FieldValues, Path } from 'react-hook-form';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';

const AnimatedView = Animated.createAnimatedComponent(View);

interface AppInputProps<T extends FieldValues> extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  placeholder?: string;
  error?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  secureTextEntry?: boolean;
  disabled?: boolean;
  helperText?: string;
  themeColor?: string;
  containerStyle?: ViewStyle;
}

export function AppInput<T extends FieldValues>({
  name,
  control,
  label,
  placeholder,
  error,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  secureTextEntry = false,
  disabled = false,
  helperText,
  themeColor = commonColors.borderStrong,
  containerStyle,
  onBlur: externalOnBlur,
  ...textInputProps
}: AppInputProps<T>): React.ReactElement {
  const [showPassword, setShowPassword] = useState(false);
  const focusAnim = useSharedValue(0);

  const handleFocus = useCallback(() => {
    focusAnim.value = withTiming(1, { duration: 200 });
  }, [focusAnim]);

  const handleBlur = useCallback(() => {
    focusAnim.value = withTiming(0, { duration: 200 });
  }, [focusAnim]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    const borderColor = error
      ? semanticColors.danger
      : interpolateColor(
          focusAnim.value,
          [0, 1],
          [commonColors.border, themeColor],
        );
    return {
      borderColor,
      borderWidth: focusAnim.value > 0.5 ? 2 : 1,
    };
  });

  const toggleShowPassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value } }) => (
        <View style={[styles.container, containerStyle]}>
          {/* Label */}
          <Text style={[styles.label, error && styles.labelError]}>
            {label}
          </Text>

          {/* Input Container */}
          <AnimatedView style={[styles.inputContainer, animatedBorderStyle]}>
            {/* Left Icon */}
            {LeftIcon && (
              <LeftIcon
                size={20}
                color={error ? semanticColors.danger : commonColors.textSecondary}
                style={styles.leftIcon}
              />
            )}

            {/* Text Input */}
            <TextInput
              style={[
                styles.input,
                LeftIcon && styles.inputWithLeftIcon,
                (secureTextEntry || RightIcon) && styles.inputWithRightIcon,
                disabled && styles.inputDisabled,
              ]}
              value={typeof value === 'string' ? value : ''}
              onChangeText={onChange}
              onFocus={handleFocus}
              onBlur={(e) => {
                onBlur();
                handleBlur();
                externalOnBlur?.(e);
              }}
              placeholder={placeholder}
              placeholderTextColor={commonColors.textTertiary}
              secureTextEntry={secureTextEntry && !showPassword}
              editable={!disabled}
              accessibilityLabel={label}
              accessibilityState={{ disabled }}
              {...textInputProps}
            />

            {/* Password Toggle */}
            {secureTextEntry && (
              <Pressable
                onPress={toggleShowPassword}
                style={styles.rightIconButton}
                accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                accessibilityRole="button"
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                {showPassword ? (
                  <EyeOff size={20} color={commonColors.textSecondary} />
                ) : (
                  <Eye size={20} color={commonColors.textSecondary} />
                )}
              </Pressable>
            )}

            {/* Right Icon (non-password) */}
            {!secureTextEntry && RightIcon && (
              <RightIcon
                size={20}
                color={commonColors.textSecondary}
                style={styles.rightIcon}
              />
            )}
          </AnimatedView>

          {/* Error / Helper Text */}
          {error && <Text style={styles.errorText}>{error}</Text>}
          {!error && helperText && (
            <Text style={styles.helperText}>{helperText}</Text>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.label.fontFamily,
    fontSize: typography.label.fontSize,
    fontWeight: typography.label.fontWeight,
    color: commonColors.text,
    marginBottom: spacing.xs,
  },
  labelError: {
    color: semanticColors.danger,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: commonColors.border, // visible border for contrast
    minHeight: 52, // increased height for better touch target
  },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 0,
  },
  inputDisabled: {
    color: commonColors.disabled,
    backgroundColor: commonColors.borderLight,
  },
  leftIcon: {
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  rightIcon: {
    marginRight: spacing.md,
    marginLeft: spacing.sm,
  },
  rightIconButton: {
    padding: spacing.sm + 4,
    marginRight: spacing.xs,
  },
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
