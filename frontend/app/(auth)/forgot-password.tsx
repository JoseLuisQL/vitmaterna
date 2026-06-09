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
import { LinearGradient } from 'expo-linear-gradient';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import api from '../../src/services/api';
import { typography } from '../../src/theme/typography';

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
              <ArrowLeft size={24} color="#0F172A" />
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
                    <CheckCircle size={48} color="#10B981" />
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
                    themeColor="#BE185D"
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
                  themeColor="#BE185D"
                  containerStyle={{ marginBottom: 24 }}
                />

                <AppButton
                  title="Enviar enlace"
                  onPress={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                  fullWidth
                  size="lg"
                  themeColor="#BE185D"
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 32,
    gap: 8,
  },
  backText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '600',
  },
  headerSection: {
    marginBottom: 32,
  },
  title: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 16,
    color: '#64748B',
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center',
  },
  successDescription: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
});
