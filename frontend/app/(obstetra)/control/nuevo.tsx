import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Activity, Baby, Stethoscope, Info } from 'lucide-react-native';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { useToast } from '../../../src/components/ui';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useCreateControl } from '../../../src/services/api-queries';
import { commonColors, obstetraColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
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
  const { webShell } = useResponsive();
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
    const optionals: Record<string, string | number> = {};
    (['temperatura', 'movimientoFetal', 'proteinuria', 'edema', 'weight', 'bloodPressure', 'fetalHeartRate', 'fundalHeight'] as const).forEach((k) => {
      const v = (data[k] || '').trim();
      if (v) optionals[k] = v;
    });
    const pulso = (data.pulsoMaterno || '').trim();
    if (pulso && !Number.isNaN(Number(pulso))) optionals.pulsoMaterno = Number(pulso);

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
          goBack(router, '/(obstetra)/(tabs)/gestantes' as any);
        },
        onError: () => toast.error('No se pudo registrar', 'Revisa los datos e inténtalo de nuevo.'),
      },
    );
  };

  return (
    <ScreenLayout
      role="obstetra"
      title="Nuevo control prenatal"
      subtitle="Registro de atención clínica"
      showBack
      onBack={() => goBack(router, '/(obstetra)/(tabs)/gestantes' as any)}
      accentColor={BRAND}
      width="full"
      contentStyle={styles.scrollContent}
    >
      <View style={styles.infoBanner}>
        <Info size={18} color={BRAND} style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.infoTitle}>Registro clínico ágil</Text>
          <Text style={styles.infoText}>
            Solo la <Text style={{ fontWeight: '700', color: commonColors.text }}>Semana Gestacional (*)</Text> es obligatoria para el cálculo del cronograma. Los signos vitales y datos fetales son opcionales y complementan la ficha física MINSA.
          </Text>
        </View>
      </View>

      <View style={webShell ? styles.twoCol : styles.singleCol}>
        {/* Columna Izquierda / Sección 1: Signos Maternos */}
        <View style={webShell ? styles.col : undefined}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Activity size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Signos Vitales Maternos</Text>
                <Text style={styles.sectionSubtitle}>Mediciones físicas generales</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppInput
                control={control}
                name="week"
                label="Semana Gestacional *"
                placeholder="Ej. 24"
                keyboardType="numeric"
                error={errors.week?.message}
              />

              <View style={styles.gridRow}>
                <AppInput
                  control={control}
                  name="weight"
                  label="Peso (kg)"
                  placeholder="Ej. 65.5"
                  keyboardType="numeric"
                  error={errors.weight?.message}
                  containerStyle={styles.gridCol}
                />
                <AppInput
                  control={control}
                  name="bloodPressure"
                  label="Presión Arterial (mmHg)"
                  placeholder="Ej. 120/80"
                  error={errors.bloodPressure?.message}
                  containerStyle={styles.gridCol}
                />
              </View>

              <View style={styles.gridRow}>
                <AppInput
                  control={control}
                  name="temperatura"
                  label="Temperatura (°C)"
                  placeholder="Ej. 36.5"
                  keyboardType="numeric"
                  error={errors.temperatura?.message}
                  containerStyle={styles.gridCol}
                />
                <AppInput
                  control={control}
                  name="pulsoMaterno"
                  label="Pulso materno (lpm)"
                  placeholder="Ej. 78"
                  keyboardType="numeric"
                  error={errors.pulsoMaterno?.message}
                  containerStyle={styles.gridCol}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Columna Derecha / Sección 2 y 3: Datos Fetales e Indicaciones */}
        <View style={webShell ? styles.col : undefined}>
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Baby size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Evaluación Fetal</Text>
                <Text style={styles.sectionSubtitle}>Latidos y biometría obstétrica</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.gridRow}>
                <AppInput
                  control={control}
                  name="fetalHeartRate"
                  label="FCF (lpm)"
                  placeholder="Ej. 140"
                  keyboardType="numeric"
                  error={errors.fetalHeartRate?.message}
                  containerStyle={styles.gridCol}
                />
                <AppInput
                  control={control}
                  name="fundalHeight"
                  label="Altura Uterina (cm)"
                  placeholder="Ej. 22"
                  keyboardType="numeric"
                  error={errors.fundalHeight?.message}
                  containerStyle={styles.gridCol}
                />
              </View>

              <AppInput
                control={control}
                name="movimientoFetal"
                label="Movimiento fetal"
                placeholder="Ej. Normal / Activo / Disminuido"
                error={errors.movimientoFetal?.message}
              />
            </View>
          </View>

          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Stethoscope size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Plan e Indicaciones</Text>
                <Text style={styles.sectionSubtitle}>Recomendaciones para la paciente</Text>
              </View>
            </View>

            <View style={styles.formGroup}>
              <AppInput
                control={control}
                name="indications"
                label="Indicaciones y Tratamiento"
                placeholder="Escribe recomendaciones dietéticas, sulfato ferroso recetado o laboratorios pendientes..."
                multiline
                numberOfLines={4}
                error={errors.indications?.message}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Footer de Acciones Estructurado */}
      <View style={webShell ? styles.footerBarWeb : styles.footerBarMobile}>
        <AppButton
          title="Cancelar"
          variant="outline"
          onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes' as any)}
          style={webShell ? styles.cancelBtnWeb : styles.actionBtnMobile}
          disabled={isPending}
        />
        <AppButton
          title="Guardar control"
          onPress={handleSubmit(onSubmit)}
          loading={isPending}
          disabled={isPending}
          themeColor={BRAND}
          style={webShell ? styles.submitBtnWeb : styles.actionBtnMobile}
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingTop: spacing.md2, paddingBottom: spacing.xxl },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: obstetraColors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md2,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: { ...typography.label, fontWeight: '700', color: obstetraColors.primaryDark, marginBottom: 2 },
  infoText: { ...typography.bodySm, color: commonColors.textSecondary, lineHeight: 19 },
  singleCol: { gap: spacing.md },
  twoCol: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  sectionCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md2, gap: 12 },
  sectionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { ...typography.h4, color: commonColors.text, fontWeight: '700' },
  sectionSubtitle: { ...typography.caption, color: commonColors.textSecondary, marginTop: 1 },
  formGroup: { gap: spacing.md },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  gridCol: { flex: 1, minWidth: 0 },
  footerBarMobile: {
    flexDirection: 'column-reverse',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  footerBarWeb: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    justifyContent: 'flex-end',
  },
  actionBtnMobile: { width: '100%' },
  cancelBtnWeb: { minWidth: 150 },
  submitBtnWeb: { minWidth: 220 },
});
