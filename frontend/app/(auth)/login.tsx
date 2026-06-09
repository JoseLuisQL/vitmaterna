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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreditCard, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { useAuthStore } from '../../src/store/authStore';
import { VitMaternaLogo } from '../../src/components/ui/VitMaternaLogo';
import { gestanteColors, commonColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

const { width } = Dimensions.get('window');

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
                  <Text style={{ fontWeight: '800', color: '#BE185D' }}>Vit</Text>
                  <Text style={{ fontWeight: '300', color: '#0F172A' }}>Materna</Text>
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
                themeColor="#BE185D"
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
                themeColor="#BE185D"
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
                themeColor="#BE185D"
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
    fontSize: 42,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }),
    fontSize: 15,
    color: '#64748B',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 24,
    textAlign: 'center',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    marginTop: -8,
  },
  forgotText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 14,
    color: '#BE185D',
    fontWeight: '700',
  },
  registerSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: '#64748B',
  },
  registerLink: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: '#BE185D',
    fontWeight: '700',
  },
});
