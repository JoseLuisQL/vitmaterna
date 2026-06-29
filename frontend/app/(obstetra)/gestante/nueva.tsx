import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { DateTimeField } from '../../../src/components/ui';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../../src/theme/responsive';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { WebMaxWidth } from '../../../src/components/web';
import { shadows } from '../../../src/theme/shadows';
import { useCreatePatient, useUpdatePatient, checkDniExists } from '../../../src/services/api-queries';
import { useToast } from '../../../src/components/ui';

const BRAND = obstetraColors.primary;

// Orden clínico: primero identificación, luego el EMBARAZO ACTUAL (la FUM es lo
// que dispara FPP, edad gestacional y cronograma), después medidas/antecedentes
// y por último los datos de contacto/sociales (secundarios).
const STEPS = [
  { id: 1, title: 'Identificación' },
  { id: 2, title: 'Embarazo' },
  { id: 3, title: 'Medidas' },
  { id: 4, title: 'Contacto' },
];

/** Celular peruano opcional: si se llena, debe ser válido (9 dígitos, inicia en 9). */
const optPhone = z
  .string()
  .optional()
  .refine((v) => !v || !v.trim() || /^9\d{8}$/.test(v.trim()), 'Celular inválido (9 dígitos, empieza en 9)');

/** Número opcional dentro de rango (campo de texto). */
const optNum = (label: string, min: number, max: number) =>
  z
    .string()
    .optional()
    .refine((v) => {
      if (!v || !v.trim()) return true;
      const n = Number(v.replace(',', '.'));
      return !Number.isNaN(n) && n >= min && n <= max;
    }, `${label} entre ${min} y ${max}`);

const schema = z.object({
  // Paso 1 — Identificación
  firstName: z.string().min(2, 'Ingresa los nombres'),
  lastName: z.string().min(2, 'Ingresa los apellidos'),
  dni: z.string().length(8, 'Debe tener 8 dígitos').regex(/^\d+$/, 'Solo números'),
  fechaNacimiento: z.string().min(1, 'La fecha de nacimiento es obligatoria'),
  historiaClinica: z.string().optional(),

  // Paso 2 — Embarazo actual (FUM obligatoria)
  fum: z.string().min(1, 'La FUM es obligatoria'),
  fumDudosa: z.boolean().optional(),

  // Paso 3 — Medidas y antecedentes
  pesoHabitual: optNum('Peso', 30, 200),
  talla: optNum('Talla', 1.2, 2.2),
  grupoSanguineo: z.string().optional(),
  factorRh: z.string().optional(),
  gestaciones: optNum('Gestaciones', 0, 25),
  partosVaginales: optNum('Partos', 0, 25),
  cesareas: optNum('Cesáreas', 0, 15),
  abortos: optNum('Abortos', 0, 25),

  // Paso 4 — Contacto y datos sociales
  phone: optPhone,
  acompanantePhone: optPhone,
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  codigoSis: z.string().optional(),
  ocupacion: z.string().optional(),
  nivelEstudios: z.enum(['analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario', '']).optional(),
  estadoCivil: z.enum(['casada', 'conviviente', 'soltera', 'otro', '']).optional(),
});

type FormData = z.infer<typeof schema>;

// Opciones de los datos sociales (MINSA). El valor '' representa "sin especificar".
const NIVEL_ESTUDIOS_OPTS: { value: string; label: string }[] = [
  { value: 'analfabeta', label: 'Analfabeta' },
  { value: 'primaria', label: 'Primaria' },
  { value: 'secundaria', label: 'Secundaria' },
  { value: 'no_universitario', label: 'Superior no univ.' },
  { value: 'superior', label: 'Superior' },
];
const ESTADO_CIVIL_OPTS: { value: string; label: string }[] = [
  { value: 'soltera', label: 'Soltera' },
  { value: 'conviviente', label: 'Conviviente' },
  { value: 'casada', label: 'Casada' },
  { value: 'otro', label: 'Otro' },
];

/**
 * Campo de elección por "pills" (controlado por react-hook-form). Para datos
 * sociales opcionales con pocas opciones: evita abrir un selector aparte y se ve
 * igual en web y móvil. Tocar la opción activa la deselecciona (vuelve a '').
 */
function ChoiceField({
  control, name, label, options,
}: {
  control: any; name: keyof FormData; label: string;
  options: { value: string; label: string }[];
}): React.ReactElement {
  return (
    <Controller
      control={control}
      name={name as any}
      render={({ field: { value, onChange } }) => (
        <View style={choiceStyles.wrap}>
          <Text style={choiceStyles.label}>{label}</Text>
          <View style={choiceStyles.row}>
            {options.map((opt) => {
              const active = value === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => onChange(active ? '' : opt.value)}
                  style={[choiceStyles.pill, active && choiceStyles.pillActive]}
                  activeOpacity={0.7}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${label}: ${opt.label}`}
                >
                  <Text style={[choiceStyles.pillText, active && choiceStyles.pillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    />
  );
}

const choiceStyles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { ...typography.label, color: commonColors.textSecondary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: borderRadius.full, borderWidth: 1, borderColor: commonColors.border,
    backgroundColor: commonColors.surface,
  },
  pillActive: { borderColor: BRAND, backgroundColor: obstetraColors.primaryLight },
  pillText: { ...typography.bodySm, color: commonColors.textSecondary },
  pillTextActive: { color: BRAND, fontWeight: '700' },
});

// Campos a validar en cada paso (para no avanzar con datos inválidos/incompletos).
const STEP_FIELDS: Record<number, (keyof FormData)[]> = {
  1: ['firstName', 'lastName', 'dni', 'fechaNacimiento'],
  2: ['fum'],
  3: ['pesoHabitual', 'talla', 'gestaciones', 'partosVaginales', 'cesareas', 'abortos'],
  4: ['phone', 'acompanantePhone'],
};

type DniStatus = 'idle' | 'checking' | 'available' | 'taken';

export default function NuevaGestanteScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const [currentStep, setCurrentStep] = useState(1);
  const [dniStatus, setDniStatus] = useState<DniStatus>('idle');
  const { mutateAsync: createPatient, isPending: creating } = useCreatePatient();
  const { mutateAsync: updatePatient, isPending: updating } = useUpdatePatient();

  const isPending = creating || updating;

  const { control, handleSubmit, trigger, watch, setValue, setError, clearErrors, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      dni: '', firstName: '', lastName: '', fechaNacimiento: '', fum: '',
      nivelEstudios: '', estadoCivil: '',
      fumDudosa: false,
    },
  });

  // Verifica el DNI en vivo (al perder el foco) para avisar de inmediato si ya
  // está registrado, en vez de esperar al final del formulario.
  const dniValue = watch('dni');
  const verifyDni = useCallback(async () => {
    const dni = (dniValue || '').trim();
    if (!/^\d{8}$/.test(dni)) {
      setDniStatus('idle');
      return;
    }
    setDniStatus('checking');
    try {
      const exists = await checkDniExists(dni);
      if (exists) {
        setDniStatus('taken');
        setError('dni', { type: 'manual', message: 'Este DNI ya está registrado' });
      } else {
        setDniStatus('available');
        clearErrors('dni');
      }
    } catch {
      setDniStatus('idle'); // si falla la verificación, no bloqueamos el registro
    }
  }, [dniValue, setError, clearErrors]);

  const nextStep = async () => {
    const fields = STEP_FIELDS[currentStep] ?? [];
    const isStepValid = await trigger(fields as any);
    // En el paso 1, además, el DNI no debe estar tomado.
    if (currentStep === 1 && dniStatus === 'taken') return;
    if (isStepValid && currentStep < STEPS.length) {
      setCurrentStep((c) => c + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((c) => c - 1);
  };

  const onSubmit = async (data: FormData) => {
    try {
      // 1. Crear paciente (núcleo de autenticación: DNI + nombre + nacimiento).
      const res = await createPatient({
        dni: data.dni,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        fechaNacimiento: data.fechaNacimiento || undefined,
      });

      const newGestanteId = res.data?.id;
      if (!newGestanteId) throw new Error('No se obtuvo el ID de la gestante');

      // 2. Completar los datos clínicos. La FUM dispara FPP + cronograma.
      await updatePatient({
        id: newGestanteId,
        data: {
          historiaClinica: data.historiaClinica || null,
          fechaNacimiento: data.fechaNacimiento || null,
          direccion: data.direccion || null,
          localidad: data.localidad || null,
          codigoSis: data.codigoSis || null,
          ocupacion: data.ocupacion || null,
          acompanantePhone: data.acompanantePhone || null,
          nivelEstudios: data.nivelEstudios || null,
          estadoCivil: data.estadoCivil || null,

          gestaciones: data.gestaciones && data.gestaciones !== '' ? parseInt(data.gestaciones, 10) : 0,
          partosVaginales: data.partosVaginales && data.partosVaginales !== '' ? parseInt(data.partosVaginales, 10) : 0,
          cesareas: data.cesareas && data.cesareas !== '' ? parseInt(data.cesareas, 10) : 0,
          abortos: data.abortos && data.abortos !== '' ? parseInt(data.abortos, 10) : 0,

          pesoHabitual: data.pesoHabitual ? parseFloat(data.pesoHabitual) : null,
          talla: data.talla ? parseFloat(data.talla) : null,
          grupoSanguineo: data.grupoSanguineo || null,
          factorRh: data.factorRh || null,

          fum: data.fum || null,
          fumDudosa: data.fumDudosa || false,
        },
      });

      toast.success(
        'Gestante registrada',
        'Se programaron sus citas prenatales a partir de la FUM. Su usuario inicial es su propio DNI.',
      );
      goBack(router, '/(obstetra)/(tabs)/gestantes' as any);
    } catch (err: any) {
      // Si el backend devuelve conflicto de DNI, volvemos al paso 1 y lo marcamos.
      const code = err?.response?.data?.error?.code;
      const message = err?.response?.data?.error?.message;
      if (code === 'CONFLICT') {
        setCurrentStep(1);
        setDniStatus('taken');
        setError('dni', { type: 'manual', message: 'Este DNI ya está registrado' });
        toast.warning('DNI duplicado', 'Ya existe una usuaria con este DNI. Verifica el número.');
        return;
      }
      toast.error('No se pudo registrar', message || 'Revisa los datos e inténtalo de nuevo.');
    }
  };

  const progressPct = (currentStep / STEPS.length) * 100;

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      <View style={styles.stepperTopRow}>
        <Text style={styles.stepperCounter}>Paso {currentStep} de {STEPS.length}</Text>
        <Text style={styles.stepperCurrent}>{STEPS.find((s) => s.id === currentStep)?.title}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <View style={styles.stepDotsRow}>
        {STEPS.map((step) => {
          const isActive = step.id === currentStep;
          const isCompleted = step.id < currentStep;
          return (
            <View key={step.id} style={styles.stepDotWrap}>
              <View style={[styles.stepDot, isActive && styles.stepDotActive, isCompleted && styles.stepDotCompleted]}>
                {isCompleted ? (
                  <Check size={12} color={commonColors.white} strokeWidth={3} />
                ) : (
                  <Text style={[styles.stepDotNum, isActive && styles.stepDotNumActive]}>{step.id}</Text>
                )}
              </View>
              <Text style={[styles.stepDotLabel, (isActive || isCompleted) && styles.stepDotLabelActive]} numberOfLines={1}>
                {step.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  if (webShell) {
    return (
      <View style={styles.container}>
        <ScreenLayout
          role="obstetra"
          title="Registrar nueva gestante"
          subtitle="Formulario clínico de ingreso"
          showBack
          onBack={() => goBack(router, '/(obstetra)/(tabs)/gestantes' as any)}
          width="full"
          scroll={true}
        >
          <View style={styles.twoCol}>
            {/* Stepper on the left (vertical checklist) */}
            <View style={styles.stepperWebCol}>
              {STEPS.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <TouchableOpacity
                    key={step.id}
                    disabled={isPending}
                    onPress={async () => {
                      // Validate previous steps before switching directly
                      if (step.id < currentStep) {
                        setCurrentStep(step.id);
                      } else if (step.id > currentStep) {
                        // Validate active step fields
                        const fields = STEP_FIELDS[currentStep] ?? [];
                        const isStepValid = await trigger(fields as any);
                        if (currentStep === 1 && dniStatus === 'taken') return;
                        if (isStepValid) {
                          setCurrentStep(step.id);
                        }
                      }
                    }}
                    style={[styles.stepRowWeb, isActive && styles.stepRowWebActive]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.stepDotWeb, isActive && styles.stepDotWebActive, isCompleted && styles.stepDotWebCompleted]}>
                      {isCompleted ? (
                        <Check size={12} color={commonColors.white} strokeWidth={3} />
                      ) : (
                        <Text style={[styles.stepDotNumWeb, isActive && styles.stepDotNumWebActive]}>{step.id}</Text>
                      )}
                    </View>
                    <Text style={[styles.stepLabelWeb, isActive && styles.stepLabelWebActive]}>{step.title}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Form on the right */}
            <View style={styles.col}>
              <View style={styles.card}>
                {/* Paso 1 */}
                {currentStep === 1 && (
                  <View style={styles.formGrid}>
                    <Text style={styles.sectionTitle}>Identificación</Text>
                    <Text style={styles.sectionHint}>Los campos con * son obligatorios.</Text>
                    <AppInput name="firstName" control={control} label="Nombres *" placeholder="Ej. María Elena" error={errors.firstName?.message} themeColor={BRAND} />
                    <AppInput name="lastName" control={control} label="Apellidos *" placeholder="Ej. Quispe Ramos" error={errors.lastName?.message} themeColor={BRAND} />

                    <View>
                      <AppInput
                        name="dni"
                        control={control}
                        label="DNI *"
                        keyboardType="number-pad"
                        maxLength={8}
                        placeholder="8 dígitos"
                        error={errors.dni?.message}
                        themeColor={BRAND}
                        onBlur={verifyDni}
                      />
                      {dniStatus === 'checking' && (
                        <View style={styles.dniStatusRow}>
                          <ActivityIndicator size="small" color={commonColors.textTertiary} />
                          <Text style={styles.dniStatusText}>Verificando DNI…</Text>
                        </View>
                      )}
                      {dniStatus === 'available' && !errors.dni && (
                        <View style={styles.dniStatusRow}>
                          <CheckCircle2 size={14} color={semanticColors.success} />
                          <Text style={[styles.dniStatusText, { color: semanticColors.success }]}>DNI disponible</Text>
                        </View>
                      )}
                      {dniStatus === 'taken' && (
                        <View style={styles.dniStatusRow}>
                          <AlertCircle size={14} color={semanticColors.danger} />
                          <Text style={[styles.dniStatusText, { color: semanticColors.danger }]}>Este DNI ya está registrado</Text>
                        </View>
                      )}
                    </View>

                    <Controller
                      control={control}
                      name="fechaNacimiento"
                      render={({ field: { value, onChange } }) => (
                        <DateTimeField
                          label="Fecha de nacimiento *"
                          mode="date"
                          value={value || ''}
                          onChange={onChange}
                          themeColor={BRAND}
                          maximumDate={new Date()}
                          placeholder="Seleccionar fecha"
                        />
                      )}
                    />
                    {errors.fechaNacimiento && <Text style={styles.fieldError}>{errors.fechaNacimiento.message}</Text>}

                    <AppInput name="historiaClinica" control={control} label="N° de historia clínica" placeholder="Opcional" themeColor={BRAND} />
                  </View>
                )}

                {/* Paso 2 */}
                {currentStep === 2 && (
                  <View style={styles.formGrid}>
                    <Text style={styles.sectionTitle}>Embarazo actual</Text>
                    <Text style={styles.sectionHint}>
                      La FUM es obligatoria: con ella se calcula la fecha probable de parto, la edad
                      gestacional y se programan automáticamente sus citas prenatales.
                    </Text>
                    <Controller
                      control={control}
                      name="fum"
                      render={({ field: { value, onChange } }) => (
                        <DateTimeField
                          label="Fecha de última menstruación (FUM) *"
                          mode="date"
                          value={value || ''}
                          onChange={onChange}
                          themeColor={BRAND}
                          maximumDate={new Date()}
                          placeholder="Seleccionar fecha"
                        />
                      )}
                    />
                    {errors.fum && <Text style={styles.fieldError}>{errors.fum.message}</Text>}

                    <TouchableOpacity
                      style={styles.checkboxRow}
                      onPress={() => setValue('fumDudosa', !watch('fumDudosa'))}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, watch('fumDudosa') && styles.checkboxActive]}>
                        {watch('fumDudosa') && <Check size={14} color={obstetraColors.onPrimary} />}
                      </View>
                      <Text style={styles.checkboxText}>Hay duda sobre la FUM (se confirmará por ecografía)</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Paso 3 */}
                {currentStep === 3 && (
                  <View style={styles.formGrid}>
                    <Text style={styles.sectionTitle}>Medidas y antecedentes</Text>
                    <Text style={styles.subTitle}>Antropometría y tipo de sangre</Text>
                    <AppInput name="pesoHabitual" control={control} label="Peso habitual (kg)" keyboardType="decimal-pad" placeholder="Ej. 62" error={errors.pesoHabitual?.message} themeColor={BRAND} />
                    <AppInput name="talla" control={control} label="Talla (en metros, ej. 1.58)" keyboardType="decimal-pad" placeholder="Ej. 1.58" error={errors.talla?.message} themeColor={BRAND} />
                    <View style={styles.row}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <AppInput name="grupoSanguineo" control={control} label="Grupo sanguíneo" placeholder="O, A, B, AB" autoCapitalize="characters" themeColor={BRAND} />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 8 }}>
                        <AppInput name="factorRh" control={control} label="Factor RH" placeholder="+ o −" themeColor={BRAND} />
                      </View>
                    </View>

                    <Text style={[styles.subTitle, { marginTop: 8 }]}>Antecedentes obstétricos</Text>
                    <View style={styles.row}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <AppInput name="gestaciones" control={control} label="Gestaciones (G)" keyboardType="number-pad" placeholder="0" error={errors.gestaciones?.message} themeColor={BRAND} />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 8 }}>
                        <AppInput name="partosVaginales" control={control} label="Partos (P)" keyboardType="number-pad" placeholder="0" error={errors.partosVaginales?.message} themeColor={BRAND} />
                      </View>
                    </View>
                    <View style={styles.row}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <AppInput name="cesareas" control={control} label="Cesáreas (C)" keyboardType="number-pad" placeholder="0" error={errors.cesareas?.message} themeColor={BRAND} />
                      </View>
                      <View style={{ flex: 1, paddingLeft: 8 }}>
                        <AppInput name="abortos" control={control} label="Abortos (A)" keyboardType="number-pad" placeholder="0" error={errors.abortos?.message} themeColor={BRAND} />
                      </View>
                    </View>
                  </View>
                )}

                {/* Paso 4 */}
                {currentStep === 4 && (
                  <View style={styles.formGrid}>
                    <Text style={styles.sectionTitle}>Contacto y datos sociales</Text>
                    <Text style={styles.subTitle}>Todos opcionales, pero recomendados para el seguimiento</Text>
                    <AppInput name="phone" control={control} label="Teléfono" keyboardType="phone-pad" maxLength={9} placeholder="9 dígitos" error={errors.phone?.message} themeColor={BRAND} />
                    <AppInput name="acompanantePhone" control={control} label="Teléfono del acompañante" keyboardType="phone-pad" maxLength={9} placeholder="9 dígitos" error={errors.acompanantePhone?.message} themeColor={BRAND} />
                    <AppInput name="direccion" control={control} label="Dirección" placeholder="Ej. Jr. Libertad 789" themeColor={BRAND} />
                    <AppInput name="localidad" control={control} label="Localidad" themeColor={BRAND} />
                    <AppInput name="codigoSis" control={control} label="Código SIS" themeColor={BRAND} />
                    <AppInput name="ocupacion" control={control} label="Ocupación" themeColor={BRAND} />
                    <ChoiceField control={control} name="nivelEstudios" label="Nivel de estudios" options={NIVEL_ESTUDIOS_OPTS} />
                    <ChoiceField control={control} name="estadoCivil" label="Estado civil" options={ESTADO_CIVIL_OPTS} />
                  </View>
                )}

                {/* Acciones */}
                <View style={styles.footerActions}>
                  {currentStep > 1 && (
                    <TouchableOpacity style={styles.btnSecondary} onPress={prevStep}>
                      <ChevronLeft size={18} color={commonColors.textSecondary} />
                      <Text style={styles.btnSecondaryText}>Anterior</Text>
                    </TouchableOpacity>
                  )}

                  {currentStep < STEPS.length ? (
                    <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
                      <Text style={styles.btnPrimaryText}>Siguiente</Text>
                      <ChevronRight size={18} color={obstetraColors.onPrimary} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.btnSuccess, isPending && { opacity: 0.7 }]}
                      onPress={handleSubmit(onSubmit)}
                      disabled={isPending}
                    >
                      <Check size={18} color={obstetraColors.onPrimary} style={{ marginRight: 8 }} />
                      <Text style={styles.btnSuccessText}>{isPending ? 'Guardando…' : 'Registrar gestante'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          </View>
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerContainer}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backButton} onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes' as any)} accessibilityLabel="Volver">
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Registrar nueva gestante</Text>
            </View>
          </View>
          {renderStepper()}
        </SafeAreaView>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <WebMaxWidth width="full">
          <View style={styles.card}>
            {/* ── PASO 1: Identificación ── */}
            {currentStep === 1 && (
              <View style={styles.formGrid}>
                <Text style={styles.sectionTitle}>Identificación</Text>
                <Text style={styles.sectionHint}>Los campos con * son obligatorios.</Text>
                <AppInput name="firstName" control={control} label="Nombres *" placeholder="Ej. María Elena" error={errors.firstName?.message} themeColor={BRAND} />
                <AppInput name="lastName" control={control} label="Apellidos *" placeholder="Ej. Quispe Ramos" error={errors.lastName?.message} themeColor={BRAND} />

                <View>
                  <AppInput
                    name="dni"
                    control={control}
                    label="DNI *"
                    keyboardType="number-pad"
                    maxLength={8}
                    placeholder="8 dígitos"
                    error={errors.dni?.message}
                    themeColor={BRAND}
                    onBlur={verifyDni}
                  />
                  {dniStatus === 'checking' && (
                    <View style={styles.dniStatusRow}>
                      <ActivityIndicator size="small" color={commonColors.textTertiary} />
                      <Text style={styles.dniStatusText}>Verificando DNI…</Text>
                    </View>
                  )}
                  {dniStatus === 'available' && !errors.dni && (
                    <View style={styles.dniStatusRow}>
                      <CheckCircle2 size={14} color={semanticColors.success} />
                      <Text style={[styles.dniStatusText, { color: semanticColors.success }]}>DNI disponible</Text>
                    </View>
                  )}
                  {dniStatus === 'taken' && (
                    <View style={styles.dniStatusRow}>
                      <AlertCircle size={14} color={semanticColors.danger} />
                      <Text style={[styles.dniStatusText, { color: semanticColors.danger }]}>Este DNI ya está registrado</Text>
                    </View>
                  )}
                </View>

                <Controller
                  control={control}
                  name="fechaNacimiento"
                  render={({ field: { value, onChange } }) => (
                    <DateTimeField
                      label="Fecha de nacimiento *"
                      mode="date"
                      value={value || ''}
                      onChange={onChange}
                      themeColor={BRAND}
                      maximumDate={new Date()}
                      placeholder="Seleccionar fecha"
                    />
                  )}
                />
                {errors.fechaNacimiento && <Text style={styles.fieldError}>{errors.fechaNacimiento.message}</Text>}

                <AppInput name="historiaClinica" control={control} label="N° de historia clínica" placeholder="Opcional" themeColor={BRAND} />
              </View>
            )}

            {/* ── PASO 2: Embarazo actual ── */}
            {currentStep === 2 && (
              <View style={styles.formGrid}>
                <Text style={styles.sectionTitle}>Embarazo actual</Text>
                <Text style={styles.sectionHint}>
                  La FUM es obligatoria: con ella se calcula la fecha probable de parto, la edad
                  gestacional y se programan automáticamente sus citas prenatales.
                </Text>
                <Controller
                  control={control}
                  name="fum"
                  render={({ field: { value, onChange } }) => (
                    <DateTimeField
                      label="Fecha de última menstruación (FUM) *"
                      mode="date"
                      value={value || ''}
                      onChange={onChange}
                      themeColor={BRAND}
                      maximumDate={new Date()}
                      placeholder="Seleccionar fecha"
                    />
                  )}
                />
                {errors.fum && <Text style={styles.fieldError}>{errors.fum.message}</Text>}

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setValue('fumDudosa', !watch('fumDudosa'))}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, watch('fumDudosa') && styles.checkboxActive]}>
                    {watch('fumDudosa') && <Check size={14} color={obstetraColors.onPrimary} />}
                  </View>
                  <Text style={styles.checkboxText}>Hay duda sobre la FUM (se confirmará por ecografía)</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── PASO 3: Medidas y antecedentes ── */}
            {currentStep === 3 && (
              <View style={styles.formGrid}>
                <Text style={styles.sectionTitle}>Medidas y antecedentes</Text>
                <Text style={styles.subTitle}>Antropometría y tipo de sangre</Text>
                <AppInput name="pesoHabitual" control={control} label="Peso habitual (kg)" keyboardType="decimal-pad" placeholder="Ej. 62" error={errors.pesoHabitual?.message} themeColor={BRAND} />
                <AppInput name="talla" control={control} label="Talla (en metros, ej. 1.58)" keyboardType="decimal-pad" placeholder="Ej. 1.58" error={errors.talla?.message} themeColor={BRAND} />
                <View style={styles.row}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppInput name="grupoSanguineo" control={control} label="Grupo sanguíneo" placeholder="O, A, B, AB" autoCapitalize="characters" themeColor={BRAND} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <AppInput name="factorRh" control={control} label="Factor RH" placeholder="+ o −" themeColor={BRAND} />
                  </View>
                </View>

                <Text style={[styles.subTitle, { marginTop: 8 }]}>Antecedentes obstétricos</Text>
                <View style={styles.row}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppInput name="gestaciones" control={control} label="Gestaciones (G)" keyboardType="number-pad" placeholder="0" error={errors.gestaciones?.message} themeColor={BRAND} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <AppInput name="partosVaginales" control={control} label="Partos (P)" keyboardType="number-pad" placeholder="0" error={errors.partosVaginales?.message} themeColor={BRAND} />
                  </View>
                </View>
                <View style={styles.row}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <AppInput name="cesareas" control={control} label="Cesáreas (C)" keyboardType="number-pad" placeholder="0" error={errors.cesareas?.message} themeColor={BRAND} />
                  </View>
                  <View style={{ flex: 1, paddingLeft: 8 }}>
                    <AppInput name="abortos" control={control} label="Abortos (A)" keyboardType="number-pad" placeholder="0" error={errors.abortos?.message} themeColor={BRAND} />
                  </View>
                </View>
              </View>
            )}

            {/* ── PASO 4: Contacto y datos sociales ── */}
            {currentStep === 4 && (
              <View style={styles.formGrid}>
                <Text style={styles.sectionTitle}>Contacto y datos sociales</Text>
                <Text style={styles.subTitle}>Todos opcionales, pero recomendados para el seguimiento</Text>
                <AppInput name="phone" control={control} label="Teléfono" keyboardType="phone-pad" maxLength={9} placeholder="9 dígitos" error={errors.phone?.message} themeColor={BRAND} />
                <AppInput name="acompanantePhone" control={control} label="Teléfono del acompañante" keyboardType="phone-pad" maxLength={9} placeholder="9 dígitos" error={errors.acompanantePhone?.message} themeColor={BRAND} />
                <AppInput name="direccion" control={control} label="Dirección" placeholder="Ej. Jr. Libertad 789" themeColor={BRAND} />
                <AppInput name="localidad" control={control} label="Localidad" themeColor={BRAND} />
                <AppInput name="codigoSis" control={control} label="Código SIS" themeColor={BRAND} />
                <AppInput name="ocupacion" control={control} label="Ocupación" themeColor={BRAND} />
                <ChoiceField control={control} name="nivelEstudios" label="Nivel de estudios" options={NIVEL_ESTUDIOS_OPTS} />
                <ChoiceField control={control} name="estadoCivil" label="Estado civil" options={ESTADO_CIVIL_OPTS} />
              </View>
            )}

            {/* ── Acciones ── */}
            <View style={styles.footerActions}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.btnSecondary} onPress={prevStep}>
                  <ChevronLeft size={18} color={commonColors.textSecondary} />
                  <Text style={styles.btnSecondaryText}>Anterior</Text>
                </TouchableOpacity>
              )}

              {currentStep < STEPS.length ? (
                <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
                  <Text style={styles.btnPrimaryText}>Siguiente</Text>
                  <ChevronRight size={18} color={obstetraColors.onPrimary} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.btnSuccess, isPending && { opacity: 0.7 }]}
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending}
                >
                  <Check size={18} color={obstetraColors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.btnSuccessText}>{isPending ? 'Guardando…' : 'Registrar gestante'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          </WebMaxWidth>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerContainer: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.md },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface, marginRight: spacing.sm },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h2, color: commonColors.white },

  // Stepper rediseñado: contador + barra de progreso lineal + puntos legibles.
  stepperContainer: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  stepperTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  stepperCounter: { ...typography.label, color: commonColors.onColorTextStrong, fontWeight: '700' },
  stepperCurrent: { ...typography.label, color: commonColors.white, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: commonColors.onColorTrack, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: commonColors.white },
  stepDotsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  stepDotWrap: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: commonColors.onColorTrack,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  stepDotActive: { backgroundColor: commonColors.white },
  stepDotCompleted: { backgroundColor: semanticColors.successMid },
  stepDotNum: { ...typography.caption, color: commonColors.white, fontWeight: '700' },
  stepDotNumActive: { color: BRAND },
  stepDotLabel: { ...typography.caption, fontSize: 11, color: commonColors.onColorTextFaint, textAlign: 'center' },
  stepDotLabelActive: { color: commonColors.white, fontWeight: '600' },

  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.card },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.xs },
  sectionHint: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.sm, lineHeight: 19 },
  subTitle: { ...typography.label, color: commonColors.textSecondary, fontWeight: '600', marginBottom: 4 },

  formGrid: { gap: 14 },
  row: { flexDirection: 'row' },

  dniStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -spacing.sm, marginBottom: spacing.xs },
  dniStatusText: { ...typography.caption, color: commonColors.textTertiary },
  fieldError: { ...typography.caption, color: semanticColors.danger, marginTop: -spacing.sm },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: commonColors.borderStrong, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxText: { ...typography.bodySm, color: commonColors.textSecondary, flex: 1 },

  footerActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm },
  btnSecondary: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: 14, paddingHorizontal: spacing.md2,
    borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: commonColors.borderStrong,
    backgroundColor: commonColors.surface,
  },
  btnSecondaryText: { color: commonColors.textSecondary, ...typography.button, fontSize: 15 },
  btnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: BRAND,
  },
  btnPrimaryText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
  btnSuccess: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: borderRadius.md, backgroundColor: BRAND,
  },
  btnSuccessText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  stepperWebCol: {
    width: 240,
    paddingRight: spacing.md,
    gap: spacing.sm,
  },
  stepRowWeb: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    gap: spacing.sm,
  },
  stepRowWebActive: {
    backgroundColor: obstetraColors.primaryLight,
    borderColor: BRAND,
  },
  stepDotWeb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: commonColors.disabled,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotWebActive: {
    backgroundColor: BRAND,
  },
  stepDotWebCompleted: {
    backgroundColor: semanticColors.success,
  },
  stepDotNumWeb: {
    ...typography.caption,
    fontWeight: '700',
    color: commonColors.white,
  },
  stepDotNumWebActive: {
    color: commonColors.white,
  },
  stepLabelWeb: {
    ...typography.bodySm,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  stepLabelWebActive: {
    color: BRAND,
    fontWeight: '700',
  },
});
