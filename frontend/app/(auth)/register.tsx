import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '../../src/utils/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
   Info,
   Check,
   Circle,
} from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { LinkButton } from '../../src/components/ui/LinkButton';
import { useToast } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/authStore';
import type { UserRole, RegisterRequest } from '../../src/types/user';
import { gestanteColors, obstetraColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { useResponsive } from '../../src/theme/responsive';
import { shadows } from '../../src/theme/shadows';

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
      .regex(/^9\d{8}$/, 'Debe ser un celular válido de 9 dígitos (empieza en 9)'),
    // Reglas alineadas con el backend (issue #6): 8+ caracteres con minúscula,
    // mayúscula, número y un símbolo (@$!%*?&#). Evita el rechazo del servidor
    // tras enviar el formulario.
    password: z
      .string()
      .min(1, 'La contraseña es obligatoria')
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .regex(/[a-z]/, 'Incluye al menos una minúscula')
      .regex(/[A-Z]/, 'Incluye al menos una mayúscula')
      .regex(/\d/, 'Incluye al menos un número')
      .regex(/[@$!%*?&#]/, 'Incluye al menos un símbolo (@$!%*?&#)'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    cop: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

/** Requisitos de contraseña alineados con el backend (issue #6). */
const PASSWORD_RULES: { test: (v: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 8, label: 'Al menos 8 caracteres' },
  { test: (v) => /[a-z]/.test(v), label: 'Una minúscula' },
  { test: (v) => /[A-Z]/.test(v), label: 'Una mayúscula' },
  { test: (v) => /\d/.test(v), label: 'Un número' },
  { test: (v) => /[@$!%*?&#]/.test(v), label: 'Un símbolo (@$!%*?&#)' },
];

/** Lista visual de requisitos de contraseña que se marca en vivo. */
function PasswordChecklist({ value, accent }: { value: string; accent: string }): React.ReactElement | null {
  if (!value) return null;
  return (
    <View style={styles.pwChecklist}>
      {PASSWORD_RULES.map((rule, i) => {
        const ok = rule.test(value);
        return (
          <View key={i} style={styles.pwRuleRow}>
            {ok ? (
              <Check size={14} color={semanticColors.success} />
            ) : (
              <Circle size={14} color={commonColors.textTertiary} />
            )}
            <Text style={[styles.pwRuleText, ok && { color: semanticColors.success }]}>{rule.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function RegisterScreen(): React.ReactElement {
  const router = useRouter();
  const { register: registerUser, isLoading } = useAuthStore();
  const { isWeb } = useResponsive();
  const toast = useToast();
  const [selectedRole, setSelectedRole] = useState<UserRole>('gestante');
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Dynamic Theme
  const isGestante = selectedRole === 'gestante';
  const themeColor = isGestante ? gestanteColors.primary : obstetraColors.primary;

  const {
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
    defaultValues: { dni: '', firstName: '', lastName: '', phone: '', password: '', confirmPassword: '', cop: '' },
  });

  const onSubmit = useCallback(
    async (data: RegisterFormData) => {
      // Validación de dominio condicional: el obstetra requiere COP.
      if (selectedRole === 'obstetra' && (!data.cop || data.cop.trim().length < 4)) {
        setError('cop', { type: 'manual', message: 'El número de colegiatura (COP) es obligatorio' });
        return;
      }
      if (!consentAccepted) {
        toast.warning('Falta tu consentimiento', 'Acepta los términos y la política de privacidad para continuar.');
        return;
      }
      try {
        const registerData: RegisterRequest = {
          ...data,
          role: selectedRole,
          consentAccepted,
          cop: selectedRole === 'obstetra' ? data.cop : undefined,
        };
        await registerUser(registerData);

        const { user, isAuthenticated } = useAuthStore.getState();

        // Obstetra: queda pendiente de aprobación del administrador (no entra).
        if (!isAuthenticated || !user) {
          toast.success(
            'Cuenta creada',
            'Tu cuenta quedó pendiente de aprobación del administrador. Te avisaremos cuando puedas ingresar.',
          );
          router.replace('/(auth)/login');
          return;
        }

        if (user.role === 'gestante') router.replace('/(gestante)/(tabs)');
        else if (user.role === 'admin') router.replace('/(admin)/(tabs)' as any);
        else router.replace('/(obstetra)/(tabs)');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Revisa tus datos e inténtalo de nuevo.';
        toast.error('No se pudo crear la cuenta', message);
      }
    },
    [consentAccepted, selectedRole, registerUser, setError, router, toast],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          
          <View style={styles.header}>
            <Pressable onPress={() => goBack(router, '/(auth)/login' as any)} style={styles.backButton} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
              <ChevronLeft size={28} color={commonColors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Crear Cuenta</Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={isWeb ? styles.webAuthCard : undefined}>
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

              {/* Aviso de aprobación (issue #9): toda cuenta auto-registrada queda
                  pendiente de aprobación. Para la gestante, lo más rápido es que su
                  obstetra la dé de alta (entra al instante con su DNI). */}
              <View style={styles.roleNotice}>
                <Info size={16} color={themeColor} style={{ marginTop: 1 }} />
                <Text style={styles.roleNoticeText}>
                  {isGestante
                    ? 'Si ya te atiende un obstetra, pídele que te registre: podrás entrar de inmediato con tu DNI. Si te registras aquí, tu cuenta quedará pendiente de aprobación.'
                    : 'Tu cuenta quedará pendiente de aprobación del administrador. Te avisaremos cuando puedas ingresar.'}
                </Text>
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

              {/* Checklist de requisitos en vivo (issue #6): muestra qué falta
                  ANTES de enviar, evitando el rechazo del servidor. */}
              <PasswordChecklist value={watch('password') || ''} accent={themeColor} />

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
                rounded
                gradient
                themeGradient={isGestante ? gestanteColors.gradient : obstetraColors.gradient}
                style={{ marginTop: spacing.md }}
              />
            </View>

            <View style={styles.loginSection}>
              <Text style={styles.loginText}>¿Ya tienes una cuenta? </Text>
              <LinkButton label="Inicia sesión" onPress={() => router.replace('/(auth)/login')} color={themeColor} size="md" />
            </View>
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
  webAuthCard: { width: '100%', maxWidth: 460, alignSelf: 'center' },
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
    ...typography.bodyMd,
    color: commonColors.textSecondary,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.full,
    padding: 4,
    marginBottom: spacing.lg,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
  },
  roleNotice: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  roleNoticeText: {
    ...typography.bodySm,
    color: commonColors.textSecondary,
    flex: 1,
  },
  pwChecklist: {
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
    gap: 4,
  },
  pwRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pwRuleText: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  roleOptionActive: {
    backgroundColor: commonColors.surface,
    ...shadows.card,
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
    ...typography.bodySm,
    color: commonColors.textSecondary,
  },
});
