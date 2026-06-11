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
import { ChevronLeft, CreditCard, Mail, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import api from '../../src/services/api';
import { obstetraColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const BRAND = obstetraColors.primary;

const forgotSchema = z.object({
  dni: z
    .string()
    .min(1, 'El DNI es obligatorio')
    .length(8, 'El DNI debe tener 8 dígitos')
    .regex(/^\d{8}$/, 'El DNI solo debe contener números'),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

export default function ForgotPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormData>({
    defaultValues: { dni: '' },
  });

  const onSubmit = useCallback(async (data: ForgotFormData) => {
    try {
      const validated = forgotSchema.parse(data);
      setIsSubmitting(true);
      await api.post('/auth/forgot-password', { dni: validated.dni });
      setIsSuccess(true);
    } catch (error) {
      if (error instanceof z.ZodError) {
        Alert.alert('Error', error.issues[0]?.message || 'Revisa el campo');
        return;
      }
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  }, []);

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
              <Text style={styles.tagline}>Ingresa tu DNI para enviarte instrucciones de recuperación.</Text>
            </View>

            {isSuccess ? (
              <View style={styles.card}>
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <CheckCircle size={48} color={semanticColors.success} />
                  </View>
                  <Text style={styles.successTitle}>Solicitud enviada</Text>
                  <Text style={styles.successDescription}>
                    Si tu DNI está registrado, recibirás un enlace de recuperación en tu correo electrónico asociado.
                  </Text>
                  <AppButton
                    title="Volver al inicio"
                    onPress={() => router.back()}
                    variant="primary"
                    fullWidth
                    size="lg"
                    themeColor={BRAND}
                  />
                </View>
              </View>
            ) : (
              <View style={styles.card}>
                <AppInput<ForgotFormData>
                  name="dni"
                  control={control}
                  label="DNI"
                  placeholder="Ingresa tu DNI"
                  leftIcon={CreditCard}
                  keyboardType="number-pad"
                  maxLength={8}
                  error={errors.dni?.message}
                  themeColor={BRAND}
                  containerStyle={{ marginBottom: spacing.lg }}
                />

                <AppButton
                  title="Enviar enlace"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  fullWidth
                  size="lg"
                  themeColor={BRAND}
                />
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
});
