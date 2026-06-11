import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Activity, Baby, Stethoscope } from 'lucide-react-native';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { useCreateControl } from '../../../src/services/api-queries';
import { commonColors, obstetraColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

const BRAND = obstetraColors.primary;

const controlSchema = z.object({
  week: z.string().min(1, 'La semana es obligatoria'),
  weight: z.string().min(1, 'El peso es obligatorio'),
  bloodPressure: z.string().min(1, 'La presión arterial es obligatoria'),
  fetalHeartRate: z.string().min(1, 'La FCF es obligatoria'),
  fundalHeight: z.string().min(1, 'La altura uterina es obligatoria'),
  indications: z.string().optional(),
});

type ControlFormData = z.infer<typeof controlSchema>;

export default function NuevoControlScreen(): React.ReactElement {
  const { patientId } = useLocalSearchParams<{ patientId: string }>();
  const router = useRouter();
  const { mutate: createControl, isPending } = useCreateControl();

  const { control, handleSubmit, formState: { errors } } = useForm<ControlFormData>({
    resolver: zodResolver(controlSchema),
    defaultValues: { week: '', weight: '', bloodPressure: '', fetalHeartRate: '', fundalHeight: '', indications: '' },
  });

  const onSubmit = (data: ControlFormData) => {
    if (!patientId) return Alert.alert('Error', 'Falta el ID de la paciente.');
    createControl({ patientId, ...data, date: new Date().toISOString() }, {
      onSuccess: () => Alert.alert('Éxito', 'Control registrado correctamente.', [{ text: 'OK', onPress: () => router.back() }]),
      onError: () => Alert.alert('Error', 'No se pudo registrar el control. Intenta de nuevo.')
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={commonColors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Nuevo Control</Text>
            <Text style={styles.headerSubtitle}>Registro de control prenatal</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Activity size={20} color={BRAND} /></View>
            <Text style={styles.sectionTitle}>Signos Vitales y Medidas</Text>
          </View>
          <View style={styles.formGroup}>
            <AppInput control={control} name="week" label="Semana Gestacional" placeholder="Ej. 24" keyboardType="numeric" error={errors.week?.message} />
            <AppInput control={control} name="weight" label="Peso (kg)" placeholder="Ej. 65.5" keyboardType="numeric" error={errors.weight?.message} />
            <AppInput control={control} name="bloodPressure" label="Presión Arterial (mmHg)" placeholder="Ej. 120/80" error={errors.bloodPressure?.message} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Baby size={20} color={BRAND} /></View>
            <Text style={styles.sectionTitle}>Datos Fetales</Text>
          </View>
          <View style={styles.formGroup}>
            <AppInput control={control} name="fetalHeartRate" label="Frecuencia Cardíaca Fetal (lpm)" placeholder="Ej. 140" keyboardType="numeric" error={errors.fetalHeartRate?.message} />
            <AppInput control={control} name="fundalHeight" label="Altura Uterina (cm)" placeholder="Ej. 22" keyboardType="numeric" error={errors.fundalHeight?.message} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Stethoscope size={20} color={BRAND} /></View>
            <Text style={styles.sectionTitle}>Indicaciones</Text>
          </View>
          <View style={styles.formGroup}>
            <AppInput control={control} name="indications" label="Observaciones y Recomendaciones" placeholder="Escribe las indicaciones aquí..." multiline numberOfLines={4} error={errors.indications?.message} />
          </View>
        </View>

        <AppButton title="Guardar Control" onPress={handleSubmit(onSubmit)} loading={isPending} disabled={isPending} style={styles.submitBtn} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerContainer: { 
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 8 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h3, color: commonColors.text },
  headerSubtitle: { ...typography.caption, color: commonColors.textSecondary },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  sectionCard: { backgroundColor: commonColors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: commonColors.border },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.bodyMedium, color: commonColors.text },
  formGroup: { gap: 16 },
  submitBtn: { backgroundColor: BRAND, borderRadius: 99, paddingVertical: 16, marginTop: 12 },
});
