import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, Activity, Baby, Stethoscope } from 'lucide-react-native';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { useToast } from '../../../src/components/ui';
import { useCreateControl } from '../../../src/services/api-queries';
import { commonColors, obstetraColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

/** Valida un número dentro de un rango fisiológico (campo de texto). */
const numInRange = (label: string, min: number, max: number) =>
  z
    .string()
    .min(1, `${label} es obligatorio`)
    .refine((v) => {
      const n = Number(v.replace(',', '.'));
      return !Number.isNaN(n) && n >= min && n <= max;
    }, `${label} debe estar entre ${min} y ${max}`);

const optNumInRange = (label: string, min: number, max: number) =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (!v || !v.trim()) return true;
      const n = Number(v.replace(',', '.'));
      return !Number.isNaN(n) && n >= min && n <= max;
    }, `${label} debe estar entre ${min} y ${max}`);

// Registro LIGERO de control (alineado a la tesis): lo único obligatorio es la
// semana gestacional (necesaria para el cronograma y para contar el control como
// realizado). El detalle clínico completo queda en la ficha física MINSA, por lo
// que peso, presión, FCF y altura uterina son OPCIONALES (evita doble digitación).
const controlSchema = z.object({
  week: numInRange('La semana', 1, 42),
  weight: optNumInRange('El peso', 30, 200),
  // Presión arterial en formato sistólica/diastólica (ej. 120/80). Opcional.
  bloodPressure: z
    .string()
    .optional()
    .refine((v) => !v || !v.trim() || /^\d{2,3}\/\d{2,3}$/.test(v.trim()), 'Formato válido: 120/80'),
  temperatura: optNumInRange('La temperatura', 34, 43),
  pulsoMaterno: optNumInRange('El pulso', 30, 220),
  fetalHeartRate: optNumInRange('La FCF', 60, 220),
  fundalHeight: optNumInRange('La altura uterina', 5, 50),
  movimientoFetal: z.string().optional(),
  proteinuria: z.string().optional(),
  edema: z.string().optional(),
  indications: z.string().optional(),
});

type ControlFormData = z.infer<typeof controlSchema>;

export default function NuevoControlScreen(): React.ReactElement {
  const { patientId, appointmentId } = useLocalSearchParams<{ patientId: string; appointmentId?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { mutate: createControl, isPending } = useCreateControl();

  const { control, handleSubmit, formState: { errors } } = useForm<ControlFormData>({
    resolver: zodResolver(controlSchema),
    mode: 'onChange',
    defaultValues: {
      week: '', weight: '', bloodPressure: '', temperatura: '', pulsoMaterno: '',
      fetalHeartRate: '', fundalHeight: '', movimientoFetal: '', proteinuria: '', edema: '', indications: '',
    },
  });

  const onSubmit = (data: ControlFormData) => {
    if (!patientId) return toast.error('Falta la paciente', 'No se pudo identificar a la gestante.');
    // Solo se envían los campos opcionales con valor. pulsoMaterno es numérico
    // en el backend; el resto se envían como texto (temperatura acepta ambos).
    const optionals: Record<string, string | number> = {};
    (['temperatura', 'movimientoFetal', 'proteinuria', 'edema', 'weight', 'bloodPressure', 'fetalHeartRate', 'fundalHeight'] as const).forEach((k) => {
      const v = (data[k] || '').trim();
      if (v) optionals[k] = v;
    });
    const pulso = (data.pulsoMaterno || '').trim();
    if (pulso && !Number.isNaN(Number(pulso))) optionals.pulsoMaterno = Number(pulso);
    // Si el control nace de una cita (flujo "Atender cita"), se liga al
    // appointmentId para que la cita quede con su evidencia clínica.
    createControl(
      {
        patientId,
        ...(appointmentId ? { appointmentId } : {}),
        week: data.week,
        indications: data.indications,
        ...optionals,
        date: new Date().toISOString(),
      },
      {
        onSuccess: () => {
          toast.success('Control registrado', 'El control prenatal se guardó correctamente.');
          router.back();
        },
        onError: () => toast.error('No se pudo registrar', 'Revisa los datos e inténtalo de nuevo.'),
      },
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={obstetraColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft size={28} color={commonColors.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Nuevo Control</Text>
              <Text style={styles.headerSubtitle}>Registro de control prenatal</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.noteCard}>
          <Text style={styles.noteText}>
            Registro rápido del control. Solo la semana gestacional es obligatoria
            (para el cronograma y el conteo de controles). El detalle clínico
            completo queda en la ficha física MINSA — aquí basta lo esencial.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Activity size={20} color={BRAND} /></View>
            <Text style={styles.sectionTitle}>Datos del control</Text>
          </View>
          <View style={styles.formGroup}>
            <AppInput control={control} name="week" label="Semana Gestacional" placeholder="Ej. 24" keyboardType="numeric" error={errors.week?.message} />
            <AppInput control={control} name="weight" label="Peso (kg) — opcional" placeholder="Ej. 65.5" keyboardType="numeric" error={errors.weight?.message} />
            <AppInput control={control} name="bloodPressure" label="Presión Arterial (mmHg) — opcional" placeholder="Ej. 120/80" error={errors.bloodPressure?.message} />
            <AppInput control={control} name="temperatura" label="Temperatura (°C) — opcional" placeholder="Ej. 36.5" keyboardType="numeric" error={errors.temperatura?.message} />
            <AppInput control={control} name="pulsoMaterno" label="Pulso materno (lpm) — opcional" placeholder="Ej. 78" keyboardType="numeric" error={errors.pulsoMaterno?.message} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}><Baby size={20} color={BRAND} /></View>
            <Text style={styles.sectionTitle}>Datos Fetales — opcional</Text>
          </View>
          <View style={styles.formGroup}>
            <AppInput control={control} name="fetalHeartRate" label="Frecuencia Cardíaca Fetal (lpm) — opcional" placeholder="Ej. 140" keyboardType="numeric" error={errors.fetalHeartRate?.message} />
            <AppInput control={control} name="fundalHeight" label="Altura Uterina (cm) — opcional" placeholder="Ej. 22" keyboardType="numeric" error={errors.fundalHeight?.message} />
            <AppInput control={control} name="movimientoFetal" label="Movimiento fetal — opcional" placeholder="Ej. Presente / Ausente" error={errors.movimientoFetal?.message} />
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
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, marginTop: spacing.sm },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm2 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h3, color: commonColors.white },
  headerSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  scrollContent: { paddingHorizontal: spacing.md, paddingTop: spacing.md2, paddingBottom: 40 },
  noteCard: { backgroundColor: obstetraColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.md2, marginBottom: spacing.md },
  noteText: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 18 },
  sectionCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.md2, marginBottom: spacing.md, ...shadows.card },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { ...typography.bodyMedium, color: commonColors.text },
  formGroup: { gap: 16 },
  submitBtn: { backgroundColor: BRAND, borderRadius: 99, paddingVertical: 16, marginTop: 12 },
});
