import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  User,
  CreditCard,
  Lock,
  Phone,
  Stethoscope,
  Baby,
  ChevronLeft,
  CheckSquare,
  Square,
} from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { useAuthStore } from '../../src/store/authStore';
import type { UserRole, RegisterRequest } from '../../src/types/user';
import { gestanteColors, obstetraColors, commonColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const registerSchema = z
  .object({
    dni: z
      .string()
      .min(1, 'El DNI es obligatorio')
      .length(8, 'El DNI debe tener 8 dígitos')
      .regex(/^\d{8}$/, 'El DNI solo debe contener números'),
    firstName: z
      .string()
      .min(1, 'El nombre es obligatorio')
      .min(2, 'El nombre debe tener al menos 2 caracteres'),
    lastName: z
      .string()
      .min(1, 'Los apellidos son obligatorios')
      .min(2, 'Los apellidos deben tener al menos 2 caracteres'),
    phone: z
      .string()
      .min(1, 'El teléfono es obligatorio')
      .min(9, 'El teléfono debe tener al menos 9 dígitos')
      .regex(/^\d+$/, 'El teléfono solo debe contener números'),
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    cop: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterScreen(): React.ReactElement {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const [selectedRole, setSelectedRole] = useState<UserRole>('gestante');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Dynamic Theme
  const isGestante = selectedRole === 'gestante';
  const themeColor = isGestante ? gestanteColors.primary : obstetraColors.primary;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    defaultValues: { dni: '', firstName: '', lastName: '', phone: '', password: '', confirmPassword: '', cop: '' },
  });

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      if (!consentAccepted) {
        Alert.alert('Consentimiento requerido', 'Debes aceptar los términos y condiciones para continuar.');
        return;
      }
      try {
        const validated = registerSchema.parse(data);
        const registerData: RegisterRequest = {
          ...validated,
          role: selectedRole,
          consentAccepted,
          cop: selectedRole === 'obstetra' ? validated.cop : undefined,
        };
        await registerUser(registerData);
        
        const user = useAuthStore.getState().user;
        if (user) {
          if (user.role === 'gestante') router.replace('/(gestante)/(tabs)');
          else if (user.role === 'admin') router.replace('/(admin)/(tabs)/usuarios' as any);
          else router.replace('/(obstetra)/(tabs)');
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          Alert.alert('Error de validación', error.issues[0]?.message || 'Revisa los campos');
          return;
        }
        const message = error instanceof Error ? error.message : 'Error al registrarse';
        Alert.alert('Error', message);
      }
    },
    [consentAccepted, selectedRole, registerUser],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
              <ChevronLeft size={28} color={commonColors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Crear Cuenta</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            <View style={styles.headerSection}>
              <Text style={styles.title}>Bienvenida</Text>
              <Text style={styles.tagline}>Crea tu cuenta para comenzar</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.roleSelector}>
                <Pressable
                  onPress={() => setSelectedRole('gestante')}
                  style={[styles.roleOption, isGestante && styles.roleOptionActive]}
                >
                  <Baby size={20} color={isGestante ? gestanteColors.primary : commonColors.textSecondary} />
                  <Text style={[styles.roleText, isGestante && styles.roleTextActive]}>Gestante</Text>
                </Pressable>
                <Pressable
                  onPress={() => setSelectedRole('obstetra')}
                  style={[styles.roleOption, !isGestante && styles.roleOptionActive]}
                >
                  <Stethoscope size={20} color={!isGestante ? obstetraColors.primary : commonColors.textSecondary} />
                  <Text style={[styles.roleText, !isGestante && styles.roleTextActive]}>Obstetra</Text>
                </Pressable>
              </View>

              <AppInput<RegisterFormData>
                name="dni" control={control} label="DNI" placeholder="8 dígitos"
                leftIcon={CreditCard} keyboardType="number-pad" maxLength={8}
                error={errors.dni?.message} themeColor={themeColor}
              />

              <View style={styles.formRow}>
                <View style={styles.halfInput}>
                  <AppInput<RegisterFormData>
                    name="firstName" control={control} label="Nombres" placeholder="Ej. María"
                    leftIcon={User} error={errors.firstName?.message} themeColor={themeColor} autoCapitalize="words"
                  />
                </View>
                <View style={styles.halfInput}>
                  <AppInput<RegisterFormData>
                    name="lastName" control={control} label="Apellidos" placeholder="Ej. Pérez"
                    leftIcon={User} error={errors.lastName?.message} themeColor={themeColor} autoCapitalize="words"
                  />
                </View>
              </View>

              <AppInput<RegisterFormData>
                name="phone" control={control} label="Teléfono celular" placeholder="9 números"
                leftIcon={Phone} keyboardType="phone-pad" maxLength={9}
                error={errors.phone?.message} themeColor={themeColor}
              />

              {!isGestante && (
                <AppInput<RegisterFormData>
                  name="cop" control={control} label="Nº Colegiatura (COP)" placeholder="Ingresa tu COP"
                  leftIcon={Stethoscope} error={errors.cop?.message} themeColor={themeColor}
                />
              )}

              <AppInput<RegisterFormData>
                name="password" control={control} label="Contraseña" placeholder="Mínimo 8 caracteres"
                leftIcon={Lock} secureTextEntry error={errors.password?.message} themeColor={themeColor} autoCapitalize="none"
              />

              <AppInput<RegisterFormData>
                name="confirmPassword" control={control} label="Confirmar Contraseña" placeholder="Repite tu contraseña"
                leftIcon={Lock} secureTextEntry error={errors.confirmPassword?.message} themeColor={themeColor} autoCapitalize="none"
              />

              <Pressable onPress={() => setConsentAccepted(!consentAccepted)} style={styles.consentRow} hitSlop={8}>
                {consentAccepted ? <CheckSquare size={24} color={themeColor} /> : <Square size={24} color={commonColors.textTertiary} />}
                <Text style={styles.consentText}>
                  Acepto los <Text style={[styles.consentLink, { color: themeColor }]}>Términos y Condiciones</Text> y la <Text style={[styles.consentLink, { color: themeColor }]}>Política de Privacidad</Text>
                </Text>
              </Pressable>

              <AppButton
                title="Completar Registro"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                fullWidth
                size="lg"
                themeColor={themeColor}
                style={{ marginTop: 16 }}
              />
            </View>

            <View style={styles.loginSection}>
              <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
              <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={12}>
                <Text style={[styles.loginLink, { color: themeColor }]}>Inicia Sesión</Text>
              </Pressable>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h3,
    color: commonColors.text,
  },
  headerSpacer: { width: 44 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: commonColors.text,
    marginBottom: 4,
  },
  tagline: {
    ...typography.bodyMedium,
    color: commonColors.textSecondary,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  roleOptionActive: {
    backgroundColor: commonColors.surface,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  roleText: {
    ...typography.label,
    color: commonColors.textSecondary,
  },
  roleTextActive: {
    color: commonColors.text,
  },
  formRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingRight: spacing.lg,
  },
  consentText: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  consentLink: {
    fontFamily: typography.label.fontFamily,
    fontWeight: typography.label.fontWeight,
  },
  loginSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  loginLink: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: typography.label.fontWeight,
  },
});
