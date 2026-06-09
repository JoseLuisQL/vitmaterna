import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { typography } from '../../../src/theme/typography';
import { useCreatePatient } from '../../../src/services/api-queries';

const schema = z.object({
  dni: z.string().length(8, 'El DNI debe tener exactamente 8 dígitos').regex(/^\d+$/, 'Solo se permiten números'),
  firstName: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  lastName: z.string().min(2, 'Los apellidos deben tener al menos 2 caracteres'),
  phone: z.string().optional(),
  fechaNacimiento: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NuevaGestanteScreen(): React.ReactElement {
  const router = useRouter();
  const { mutateAsync: createPatient, isPending } = useCreatePatient();

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { dni: '', firstName: '', lastName: '', phone: '', fechaNacimiento: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createPatient({
        ...data,
        fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento).toISOString() : undefined,
      });
      Alert.alert('¡Registro Exitoso!', 'La paciente fue registrada. Su usuario y contraseña inicial es su propio DNI.', [{ text: 'Entendido', onPress: () => router.back() }]);
    } catch (err: any) {
      Alert.alert('Error al registrar', err.response?.data?.error?.message || 'No se pudo registrar a la paciente. Intente nuevamente.');
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={28} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nueva Gestante</Text>
            <Text style={styles.headerSubtitle}>Registro de paciente</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.iconWrapper}>
            <UserPlus size={32} color="#BE185D" />
          </View>

          <Text style={styles.instruction}>
            Ingrese los datos básicos para registrar el perfil clínico y crear la cuenta de acceso de la paciente.
          </Text>

          <View style={styles.form}>
            <AppInput name="dni" control={control} label="DNI" placeholder="Ej. 76543210" keyboardType="number-pad" maxLength={8} error={errors.dni?.message} />
            <AppInput name="firstName" control={control} label="Nombres" placeholder="Nombres completos" error={errors.firstName?.message} />
            <AppInput name="lastName" control={control} label="Apellidos" placeholder="Apellidos completos" error={errors.lastName?.message} />
            <AppInput name="phone" control={control} label="Celular (Opcional)" placeholder="Ej. 987654321" keyboardType="phone-pad" maxLength={9} error={errors.phone?.message} />
            <AppInput name="fechaNacimiento" control={control} label="Fecha de Nacimiento (Opcional)" placeholder="YYYY-MM-DD  ej. 1995-08-20" error={errors.fechaNacimiento?.message} />
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>💡 Al guardar, se creará automáticamente una cuenta donde el usuario y la contraseña de la paciente será su mismo DNI.</Text>
          </View>

          <AppButton title="Guardar y Crear Cuenta" onPress={handleSubmit(onSubmit)} loading={isPending} disabled={isPending} style={styles.submitBtn} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  headerContainer: { 
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '700', color: '#0F172A' },
  headerSubtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 13, color: '#64748B' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 },
  iconWrapper: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
  instruction: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  form: { gap: 16 },
  infoBox: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginTop: 24, borderWidth: 1, borderColor: '#E2E8F0' },
  infoText: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B', lineHeight: 20 },
  submitBtn: { backgroundColor: '#0F172A', borderRadius: 99, paddingVertical: 16, marginTop: 32 },
});
