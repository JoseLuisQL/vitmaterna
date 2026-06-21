/**
 * VITMATERNA — Field (campo de formulario desacoplado)
 *
 * Resuelve la inconsistencia de formularios: hoy `AppInput` exige `control` de
 * React Hook Form, por eso 17 pantallas usan `TextInput` crudo con estilos
 * propios. `Field` y sus variantes son CONTROLADOS (value/onChangeText), con la
 * MISMA anatomía y altura que `AppInput`, para que todos los campos de la app
 * se vean idénticos vivan o no dentro de RHF.
 *
 * Anatomía fija: label → control → (helper | error).
 * Estados: default · focus (borde acento 2px) · error (rojo + mensaje) · disabled.
 *
 * Familia:
 *   <TextField/>     texto de una línea (con icono opcional y toggle de clave)
 *   <TextAreaField/> texto multilínea
 *   <NumberField/>   numérico (teclado numérico, alineado)
 *   <SelectField/>   selección (abre opciones; presentación delega en el padre)
 *   <SearchField/>   búsqueda compacta para toolbars (sin label)
 *
 * Todos consumen solo tokens del tema. Cero literales de color.
 */
import React, { useCallback, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Eye, EyeOff, Search, X, type LucideIcon } from 'lucide-react-native';
import { AppText } from './AppText';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';

// ─── Base controlada ──────────────────────────────────────────────────────────

export interface FieldBaseProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  /** Color de acento del rol para el foco. Default: borde fuerte neutro. */
  themeColor?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  /** Acción del icono derecho (p. ej. limpiar). */
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  /** testID para pruebas. */
  testID?: string;
}

function FieldShell({
  label,
  error,
  helperText,
  children,
  containerStyle,
}: {
  label?: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
}): React.ReactElement {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <AppText variant="label" color={error ? semanticColors.danger : commonColors.text} style={styles.label}>
          {label}
        </AppText>
      ) : null}
      {children}
      {error ? (
        <AppText variant="caption" color={semanticColors.danger} style={styles.helper}>
          {error}
        </AppText>
      ) : helperText ? (
        <AppText variant="caption" color={commonColors.textSecondary} style={styles.helper}>
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

/** Campo de texto de una línea. */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  helperText,
  disabled = false,
  themeColor = commonColors.borderStrong,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry = false,
  testID,
  ...rest
}: FieldBaseProps): React.ReactElement {
  const [focused, setFocused] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  const borderColor = error
    ? semanticColors.danger
    : focused
      ? themeColor
      : commonColors.border;

  return (
    <FieldShell label={label} error={error} helperText={helperText} containerStyle={containerStyle}>
      <View
        style={[
          styles.control,
          { borderColor, borderWidth: focused && !error ? 2 : 1 },
          disabled && styles.controlDisabled,
        ]}
      >
        {LeftIcon ? (
          <LeftIcon size={20} color={error ? semanticColors.danger : commonColors.textSecondary} style={styles.iconLeft} />
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          placeholderTextColor={commonColors.textTertiary}
          secureTextEntry={secureTextEntry && !showSecret}
          accessibilityLabel={label}
          accessibilityState={{ disabled }}
          testID={testID}
          style={[styles.input, IS_WEB && ({ outlineStyle: 'none' } as any)]}
          {...rest}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setShowSecret((s) => !s)}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={showSecret ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showSecret ? <EyeOff size={20} color={commonColors.textSecondary} /> : <Eye size={20} color={commonColors.textSecondary} />}
          </Pressable>
        ) : RightIcon ? (
          <Pressable onPress={onRightIconPress} hitSlop={12} style={styles.iconBtn} disabled={!onRightIconPress} accessibilityRole={onRightIconPress ? 'button' : undefined}>
            <RightIcon size={20} color={commonColors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
    </FieldShell>
  );
}

/** Campo de texto multilínea. */
export function TextAreaField({
  numberOfLines = 4,
  ...props
}: FieldBaseProps): React.ReactElement {
  const { label, value, onChangeText, error, helperText, disabled, themeColor = commonColors.borderStrong, containerStyle, testID, ...rest } = props;
  const [focused, setFocused] = useState(false);
  const borderColor = error ? semanticColors.danger : focused ? themeColor : commonColors.border;
  return (
    <FieldShell label={label} error={error} helperText={helperText} containerStyle={containerStyle}>
      <View style={[styles.control, styles.controlMultiline, { borderColor, borderWidth: focused && !error ? 2 : 1 }, disabled && styles.controlDisabled]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!disabled}
          multiline
          numberOfLines={numberOfLines}
          textAlignVertical="top"
          placeholderTextColor={commonColors.textTertiary}
          accessibilityLabel={label}
          testID={testID}
          style={[styles.input, styles.inputMultiline, IS_WEB && ({ outlineStyle: 'none' } as any)]}
          {...rest}
        />
      </View>
    </FieldShell>
  );
}

/** Campo numérico (teclado numérico). */
export function NumberField(props: FieldBaseProps): React.ReactElement {
  return <TextField keyboardType="numeric" inputMode="numeric" {...props} />;
}

/** Campo de búsqueda compacto para toolbars (sin label, con limpiar). */
export function SearchField({
  value,
  onChangeText,
  placeholder = 'Buscar…',
  containerStyle,
  testID,
  ...rest
}: Omit<FieldBaseProps, 'label'>): React.ReactElement {
  return (
    <View style={[styles.search, containerStyle]}>
      <Search size={18} color={commonColors.textTertiary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={commonColors.textTertiary}
        accessibilityLabel={placeholder}
        testID={testID}
        style={[styles.searchInput, IS_WEB && ({ outlineStyle: 'none' } as any)]}
        {...rest}
      />
      {value?.length ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
          <X size={16} color={commonColors.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

interface SelectFieldProps {
  label?: string;
  /** Texto visible del valor seleccionado (vacío = placeholder). */
  valueLabel?: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  themeColor?: string;
  leftIcon?: LucideIcon;
  rightIcon?: LucideIcon;
  containerStyle?: ViewStyle;
  testID?: string;
}

/**
 * Campo de selección: muestra el valor y delega la apertura del selector
 * (BottomSheet/menú) en el padre vía `onPress`. Misma anatomía que TextField.
 */
export function SelectField({
  label,
  valueLabel,
  placeholder = 'Selecciona…',
  onPress,
  error,
  helperText,
  disabled = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  containerStyle,
  testID,
}: SelectFieldProps): React.ReactElement {
  const isPlaceholder = !valueLabel;
  return (
    <FieldShell label={label} error={error} helperText={helperText} containerStyle={containerStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label ? `${label}: ${valueLabel ?? placeholder}` : valueLabel ?? placeholder}
        accessibilityState={{ disabled }}
        testID={testID}
        style={({ pressed }) => [
          styles.control,
          { borderColor: error ? semanticColors.danger : commonColors.border },
          pressed && !disabled && { backgroundColor: commonColors.surfaceHover },
          disabled && styles.controlDisabled,
          IS_WEB && ({ cursor: 'pointer', outlineStyle: 'none' } as any),
        ]}
      >
        {LeftIcon ? <LeftIcon size={20} color={commonColors.textSecondary} style={styles.iconLeft} /> : null}
        <AppText
          variant="body"
          color={isPlaceholder ? commonColors.textTertiary : commonColors.text}
          style={styles.selectText}
          numberOfLines={1}
        >
          {valueLabel ?? placeholder}
        </AppText>
        {RightIcon ? <RightIcon size={20} color={commonColors.textSecondary} style={styles.iconRight} /> : null}
      </Pressable>
    </FieldShell>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs },
  helper: { marginTop: spacing.xs },
  control: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  controlMultiline: { alignItems: 'stretch', minHeight: 96, paddingVertical: spacing.sm },
  controlDisabled: { backgroundColor: commonColors.borderLight },
  input: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.text,
    paddingVertical: spacing.sm + 2,
    minHeight: 48,
  },
  inputMultiline: { minHeight: 80, paddingTop: spacing.xs },
  selectText: { flex: 1, paddingVertical: spacing.sm + 4 },
  iconLeft: { marginRight: spacing.sm },
  iconRight: { marginLeft: spacing.sm },
  iconBtn: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
    // Pill (radio completo) y altura 46: mismo lenguaje que el buscador de la
    // gestante (educación/citas), para que TODO buscador del sistema sea igual.
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.text,
  },
});
