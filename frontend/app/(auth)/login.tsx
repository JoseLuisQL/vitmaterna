import React, { useCallback } from 'react';
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
import { CreditCard, Lock } from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { useAuthStore } from '../../src/store/authStore';
import { VitMaternaLogo } from '../../src/components/ui/VitMaternaLogo';
import { obstetraColors, commonColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

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

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: { dni: '', password: '' },
  });

  const onSubmit = useCallback(
    async (data: LoginFormData) => {
      try {
        const validated = loginSchema.parse(data);
        await login(validated.dni, validated.password);
        
        const user = useAuthStore.getState().user;
        if (user) {
          if (user.role === 'gestante') router.replace('/(gestante)/(tabs)');
          else if (user.role === 'admin') router.replace('/(admin)/(tabs)/usuarios' as any);
          else router.replace('/(obstetra)/(tabs)');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al iniciar sesión';
        Alert.alert('Error', message);
      }
    },
    [login],
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            
            <View style={styles.headerSection}>
              <View style={styles.header}>
                <View style={styles.logoContainer}>
                  <VitMaternaLogo size={160} color="pink" />
                </View>
                <Text style={styles.title}>
                  <Text style={styles.titleBrand}>Vit</Text>
                  <Text style={styles.titleRest}>Materna</Text>
                </Text>
                <Text style={styles.tagline}>Tu salud prenatal, siempre contigo</Text>
              </View>
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

              <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotButton} hitSlop={12}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </Pressable>

              <AppButton
                title="Iniciar Sesión"
                onPress={handleSubmit(onSubmit)}
                loading={isLoading}
                fullWidth
                size="lg"
                themeColor={BRAND}
                style={{ marginTop: 8 }}
              />
            </View>

            <View style={styles.registerSection}>
              <Text style={styles.registerText}>¿No tienes una cuenta? </Text>
              <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={12}>
                <Text style={styles.registerLink}>Regístrate</Text>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.display,
    fontSize: 40,
    marginBottom: 4,
  },
  titleBrand: { color: BRAND },
  titleRest: { color: commonColors.text },
  tagline: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    letterSpacing: 0.3,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
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
  forgotText: {
    ...typography.bodySmall,
    color: BRAND,
    fontFamily: typography.label.fontFamily,
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  registerLink: {
    ...typography.bodySmall,
    color: BRAND,
    fontFamily: typography.label.fontFamily,
  },
});
