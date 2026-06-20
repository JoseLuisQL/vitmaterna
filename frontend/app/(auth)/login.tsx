import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CreditCard, Lock } from 'lucide-react-native';

import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { LinkButton } from '../../src/components/ui/LinkButton';
import { useToast } from '../../src/components/ui';
import { VitMaternaLogo } from '../../src/components/ui/VitMaternaLogo';
import { useAuthStore } from '../../src/store/authStore';
import { gestanteColors, obstetraColors, commonColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { shadows } from '../../src/theme/shadows';
import { useResponsive } from '../../src/theme/responsive';

const BRAND = obstetraColors.primary;

const loginSchema = z.object({
  dni: z
    .string()
    .min(1, 'El DNI es obligatorio')
    .length(8, 'El DNI debe tener 8 dígitos')
    .regex(/^\d{8}$/, 'El DNI solo debe contener números'),
  password: z
    .string()
    .min(1, 'La contraseña es obligatoria')
    .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginScreen(): React.ReactElement {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const { isWeb } = useResponsive();
  const toast = useToast();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { dni: '', password: '' },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        await login(data.dni, data.password);

        const user = useAuthStore.getState().user;
        if (user) {
          if (user.role === 'gestante') router.replace('/(gestante)/(tabs)');
          else if (user.role === 'admin') router.replace('/(admin)/(tabs)' as any);
          else router.replace('/(obstetra)/(tabs)');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Revisa tu DNI y contraseña e inténtalo de nuevo.';
        toast.error('No se pudo iniciar sesión', message);
      }
    },
    [login, router, toast],
  );

  return (
    <View style={styles.container}>
      {/* Blobs de color decorativos */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={isWeb ? styles.webAuthCard : undefined}>
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <VitMaternaLogo size={150} color="pink" />
              </View>
              <Text style={styles.title}>
                <Text style={styles.titleBrand}>Vit</Text>
                <Text style={styles.titleRest}>Materna</Text>
              </Text>
              <Text style={styles.tagline}>Tu salud prenatal, siempre contigo</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.formTitle}>Bienvenida</Text>

              <AppInput<LoginFormData>
                name="dni"
                control={control}
                label="DNI"
                placeholder="Ingresa tu DNI"
                leftIcon={CreditCard}
                keyboardType="number-pad"
                maxLength={8}
                error={errors.dni?.message}
                themeColor={BRAND}
                autoCapitalize="none"
              />

              <AppInput<LoginFormData>
                name="password"
                control={control}
                label="Contraseña"
                placeholder="Ingresa tu contraseña"
                leftIcon={Lock}
                secureTextEntry
                error={errors.password?.message}
                themeColor={BRAND}
                autoCapitalize="none"
              />

              <LinkButton
                label="¿Olvidaste tu contraseña?"
                onPress={() => router.push('/(auth)/forgot-password')}
                color={BRAND}
                size="md"
                style={styles.forgotButton}
              />

              <AppButton
                title="Iniciar Sesión"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                fullWidth
                size="lg"
                rounded
                gradient
                themeGradient={obstetraColors.gradient}
                style={{ marginTop: spacing.xs }}
              />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
              <LinkButton label="Regístrate" onPress={() => router.push('/(auth)/register')} color={BRAND} size="md" />
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background, overflow: 'hidden' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  blobTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: obstetraColors.primaryLight,
    opacity: 0.7,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -140,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: gestanteColors.primaryLight,
    opacity: 0.8,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  webAuthCard: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.displayXl,
    marginBottom: spacing.xs,
  },
  titleBrand: { color: BRAND },
  titleRest: { color: commonColors.text },
  tagline: {
    ...typography.bodySm,
    color: commonColors.textSecondary,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.modal,
  },
  formTitle: {
    ...typography.h2,
    color: commonColors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
    marginTop: -spacing.sm,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.body,
    color: commonColors.textSecondary,
  },
});
