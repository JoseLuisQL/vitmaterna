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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Lock, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { useToast } from '../../src/components/ui';
import api from '../../src/services/api';
import { getApiErrorMessage } from '../../src/utils/apiError';
import { obstetraColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const BRAND = obstetraColors.primary;

// Paso 1: solicitar código
const dniSchema = z.object({
  dni: z
    .string()
    .min(1, 'El DNI es obligatorio')
    .length(8, 'El DNI debe tener 8 dígitos')
    .regex(/^\d{8}$/, 'El DNI solo debe contener números'),
});
type DniFormData = z.infer<typeof dniSchema>;

// Paso 2: ingresar código + nueva contraseña
// La validación debe coincidir con el backend: 8+ caracteres con mayúscula,
// minúscula, número y carácter especial.
const resetSchema = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        'Debe incluir mayúscula, minúscula, número y un símbolo (@$!%*?&#)',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
type ResetFormData = z.infer<typeof resetSchema>;

type Step = 'request' | 'reset' | 'done';

export default function ForgotPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>('request');
  const [dni, setDni] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dniForm = useForm<DniFormData>({ resolver: zodResolver(dniSchema), defaultValues: { dni: '' } });
  const resetForm = useForm<ResetFormData>({ resolver: zodResolver(resetSchema), defaultValues: { code: '', newPassword: '', confirmPassword: '' } });

  const onRequest = useCallback(async (data: DniFormData) => {
    try {
      const v = dniSchema.parse(data);
      setIsSubmitting(true);
      await api.post('/auth/forgot-password', { dni: v.dni });
      setDni(v.dni);
      setStep('reset');
      toast.info('Código enviado', 'Si el DNI está registrado, recibirás un código por SMS/WhatsApp.');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error('Revisa el campo', error.issues[0]?.message || 'DNI inválido');
        return;
      }
      // Anti-enumeración: avanzar igual
      setDni(data.dni);
      setStep('reset');
    } finally {
      setIsSubmitting(false);
    }
  }, [toast]);

  const onReset = useCallback(async (data: ResetFormData) => {
    try {
      setIsSubmitting(true);
      await api.post('/auth/reset-password', {
        dni,
        code: data.code,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      setStep('done');
      toast.success('Contraseña actualizada', 'Ya puedes iniciar sesión con tu nueva contraseña.');
    } catch (error: any) {
      const msg = getApiErrorMessage(error, 'Código inválido o expirado.');
      toast.error('No se pudo restablecer', msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [dni, toast]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
              <ArrowLeft size={24} color={commonColors.text} />
              <Text style={styles.backText}>Volver</Text>
            </Pressable>

            <View style={styles.headerSection}>
              <Text style={styles.title}>Recuperar contraseña</Text>
              <Text style={styles.tagline}>
                {step === 'request'
                  ? 'Ingresa tu DNI para enviarte un código de recuperación.'
                  : step === 'reset'
                  ? 'Ingresa el código que recibiste y tu nueva contraseña.'
                  : 'Tu contraseña fue restablecida.'}
              </Text>
            </View>

            {step === 'request' && (
              <View style={styles.card}>
                <AppInput<DniFormData>
                  name="dni"
                  control={dniForm.control}
                  label="DNI"
                  placeholder="Ingresa tu DNI"
                  leftIcon={CreditCard}
                  keyboardType="number-pad"
                  maxLength={8}
                  error={dniForm.formState.errors.dni?.message}
                  themeColor={BRAND}
                  containerStyle={{ marginBottom: spacing.lg }}
                />
                <AppButton
                  title="Enviar código"
                  onPress={dniForm.handleSubmit(onRequest)}
                  loading={isSubmitting}
                  fullWidth
                  size="lg"
                  themeColor={BRAND}
                />
              </View>
            )}

            {step === 'reset' && (
              <View style={styles.card}>
                <AppInput<ResetFormData>
                  name="code"
                  control={resetForm.control}
                  label="Código (6 dígitos)"
                  placeholder="000000"
                  leftIcon={KeyRound}
                  keyboardType="number-pad"
                  maxLength={6}
                  error={resetForm.formState.errors.code?.message}
                  themeColor={BRAND}
                  containerStyle={{ marginBottom: spacing.md }}
                />
                <AppInput<ResetFormData>
                  name="newPassword"
                  control={resetForm.control}
                  label="Nueva contraseña"
                  placeholder="Mínimo 6 caracteres"
                  leftIcon={Lock}
                  secureTextEntry
                  error={resetForm.formState.errors.newPassword?.message}
                  themeColor={BRAND}
                  containerStyle={{ marginBottom: spacing.md }}
                />
                <AppInput<ResetFormData>
                  name="confirmPassword"
                  control={resetForm.control}
                  label="Confirmar contraseña"
                  placeholder="Repite la contraseña"
                  leftIcon={Lock}
                  secureTextEntry
                  error={resetForm.formState.errors.confirmPassword?.message}
                  themeColor={BRAND}
                  containerStyle={{ marginBottom: spacing.lg }}
                />
                <AppButton
                  title="Restablecer contraseña"
                  onPress={resetForm.handleSubmit(onReset)}
                  loading={isSubmitting}
                  fullWidth
                  size="lg"
                  themeColor={BRAND}
                />
                <Pressable onPress={dniForm.handleSubmit(onRequest)} hitSlop={8} style={{ marginTop: spacing.md, alignItems: 'center' }}>
                  <Text style={styles.resendText}>Reenviar código</Text>
                </Pressable>
              </View>
            )}

            {step === 'done' && (
              <View style={styles.card}>
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <CheckCircle size={48} color={semanticColors.success} />
                  </View>
                  <Text style={styles.successTitle}>Contraseña restablecida</Text>
                  <Text style={styles.successDescription}>
                    Tu contraseña se actualizó correctamente. Inicia sesión con tu nueva contraseña.
                  </Text>
                  <AppButton
                    title="Ir a iniciar sesión"
                    onPress={() => router.replace('/(auth)/login')}
                    fullWidth
                    size="lg"
                    themeColor={BRAND}
                  />
                </View>
              </View>
            )}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
    gap: spacing.sm,
  },
  backText: {
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  headerSection: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.display,
    color: commonColors.text,
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.bodyMedium,
    color: commonColors.textSecondary,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: semanticColors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: commonColors.text,
    marginBottom: spacing.sm + 4,
    textAlign: 'center',
  },
  successDescription: {
    ...typography.bodyMedium,
    color: commonColors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  resendText: {
    ...typography.bodySmall,
    color: BRAND,
    fontFamily: typography.label.fontFamily,
  },
});
