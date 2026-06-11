import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { useCreatePatient, useUpdatePatient } from '../../../src/services/api-queries';

const BRAND = obstetraColors.primary;

const STEPS = [
  { id: 1, title: 'Datos Personales' },
  { id: 2, title: 'Antecedentes' },
  { id: 3, title: 'Medidas y Sangre' },
  { id: 4, title: 'Embarazo actual' },
];

const schema = z.object({
  // Step 1
  firstName: z.string().min(2, 'Obligatorio'),
  lastName: z.string().min(2, 'Obligatorio'),
  dni: z.string().length(8, 'Debe ser 8 dígitos').regex(/^\d+$/, 'Solo números'),
  historiaClinica: z.string().optional(),
  fechaNacimiento: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  phone: z.string().optional(),
  codigoSis: z.string().optional(),
  ocupacion: z.string().optional(),
  acompanantePhone: z.string().optional(),
  nivelEstudios: z.enum(['analfabeta', 'primaria', 'secundaria', 'superior', 'no_universitario', '']).optional(),
  estadoCivil: z.enum(['casada', 'conviviente', 'soltera', 'otro', '']).optional(),
  
  // Step 2
  gestaciones: z.string().optional(),
  partosVaginales: z.string().optional(),
  cesareas: z.string().optional(),
  abortos: z.string().optional(),
  
  // Step 3
  pesoHabitual: z.string().optional(),
  talla: z.string().optional(),
  grupoSanguineo: z.string().optional(),
  factorRh: z.string().optional(),
  
  // Step 4
  fum: z.string().optional(),
  fumDudosa: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

export default function NuevaGestanteScreen(): React.ReactElement {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const { mutateAsync: createPatient, isPending: creating } = useCreatePatient();
  const { mutateAsync: updatePatient, isPending: updating } = useUpdatePatient();

  const isPending = creating || updating;

  const { control, handleSubmit, trigger, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { 
      dni: '', firstName: '', lastName: '', 
      nivelEstudios: '', estadoCivil: '', 
      fumDudosa: false 
    },
  });

  const nextStep = async () => {
    // Validate current step
    let fieldsToValidate: any[] = [];
    if (currentStep === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'dni'];
    }
    
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid && currentStep < 4) {
      setCurrentStep(curr => curr + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(curr => curr - 1);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      // 1. Create Patient (Auth Core)
      const res = await createPatient({
        dni: data.dni,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        fechaNacimiento: data.fechaNacimiento || undefined,
      });

      const newGestanteId = res.data?.id;

      if (!newGestanteId) throw new Error('No se obtuvo el ID de la gestante');

      // 2. Patch Patient (Extended clinical fields)
      await updatePatient({
        id: newGestanteId,
        data: {
          historiaClinica: data.historiaClinica || null,
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
        }
      });

      Alert.alert(
        '¡Registro Exitoso!', 
        'La paciente fue registrada con todos sus datos clínicos. Su usuario inicial es su propio DNI.', 
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error?.message || 'No se pudo guardar la paciente completa. Verifique los datos e intente de nuevo.');
    }
  };

  const renderStepper = () => (
    <View style={styles.stepperContainer}>
      {STEPS.map((step, index) => {
        const isActive = step.id === currentStep;
        const isCompleted = step.id < currentStep;
        
        return (
          <View key={step.id} style={styles.stepWrapper}>
            <View style={[styles.stepCircle, isActive && styles.stepActive, isCompleted && styles.stepCompleted]}>
              {isCompleted ? <Check size={16} color={obstetraColors.onPrimary} /> : <Text style={[styles.stepNumber, isActive && styles.stepNumberActive]}>{step.id}</Text>}
            </View>
            <Text style={[styles.stepText, (isActive || isCompleted) && styles.stepTextActive]}>{step.title}</Text>
            {index < STEPS.length - 1 && <View style={[styles.stepLine, isCompleted && styles.stepLineCompleted]} />}
          </View>
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color={commonColors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Registrar Nueva Gestante</Text>
          </View>
        </View>
        
        {renderStepper()}
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{STEPS.find(s => s.id === currentStep)?.title}</Text>
            
            {currentStep === 1 && (
              <View style={styles.formGrid}>
                <AppInput name="firstName" control={control} label="NOMBRES *" placeholder="" />
                <AppInput name="lastName" control={control} label="APELLIDOS *" placeholder="" />
                <AppInput name="dni" control={control} label="DNI *" keyboardType="number-pad" maxLength={8} />
                <AppInput name="historiaClinica" control={control} label="N° HISTORIA CLÍNICA" />
                <AppInput name="fechaNacimiento" control={control} label="FECHA DE NACIMIENTO" placeholder="Ej. 1995-12-25" />
                <AppInput name="direccion" control={control} label="DIRECCIÓN" />
                <AppInput name="localidad" control={control} label="LOCALIDAD" />
                <AppInput name="phone" control={control} label="TELÉFONO" keyboardType="phone-pad" maxLength={9} />
                <AppInput name="acompanantePhone" control={control} label="TELÉFONO DEL ACOMPAÑANTE" keyboardType="phone-pad" maxLength={9} />
                <AppInput name="codigoSis" control={control} label="CÓDIGO SIS" />
                <AppInput name="ocupacion" control={control} label="OCUPACIÓN" />
              </View>
            )}

            {currentStep === 2 && (
              <View style={styles.formGrid}>
                 <Text style={styles.subTitle}>Antecedentes Obstétricos</Text>
                 <AppInput name="gestaciones" control={control} label="N° GESTACIONES (G)" keyboardType="number-pad" placeholder="0" />
                 <AppInput name="partosVaginales" control={control} label="PARTOS VAGINALES (P)" keyboardType="number-pad" placeholder="0" />
                 <AppInput name="cesareas" control={control} label="CESÁREAS (C)" keyboardType="number-pad" placeholder="0" />
                 <AppInput name="abortos" control={control} label="ABORTOS (A)" keyboardType="number-pad" placeholder="0" />
              </View>
            )}

            {currentStep === 3 && (
              <View style={styles.formGrid}>
                 <Text style={styles.subTitle}>Medidas Antropométricas y Tipo de Sangre</Text>
                 <AppInput name="pesoHabitual" control={control} label="PESO HABITUAL (KG)" keyboardType="decimal-pad" />
                 <AppInput name="talla" control={control} label="TALLA (CM)" keyboardType="number-pad" />
                 
                 <View style={styles.row}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                       <AppInput name="grupoSanguineo" control={control} label="GRUPO SANGUÍNEO" placeholder="O, A, B, AB" />
                    </View>
                    <View style={{ flex: 1, paddingLeft: 8 }}>
                       <AppInput name="factorRh" control={control} label="FACTOR RH" placeholder="+ o -" />
                    </View>
                 </View>
              </View>
            )}

            {currentStep === 4 && (
              <View style={styles.formGrid}>
                 <Text style={styles.subTitle}>Embarazo Actual</Text>
                 <AppInput name="fum" control={control} label="FECHA DE ÚLTIMA MENSTRUACIÓN (FUM) *" placeholder="Ej. 2026-01-15" />
                 
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

            <View style={styles.footerActions}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.btnSecondary} onPress={prevStep}>
                  <Text style={styles.btnSecondaryText}>{'<'} Anterior</Text>
                </TouchableOpacity>
              )}
              
              {currentStep < 4 ? (
                <TouchableOpacity style={styles.btnPrimary} onPress={nextStep}>
                  <Text style={styles.btnPrimaryText}>Siguiente {'>'}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={[styles.btnSuccess, isPending && { opacity: 0.7 }]} 
                  onPress={handleSubmit(onSubmit)}
                  disabled={isPending}
                >
                  <Check size={18} color={obstetraColors.onPrimary} style={{ marginRight: 8 }} />
                  <Text style={styles.btnSuccessText}>{isPending ? 'Guardando...' : 'Registrar gestante'}</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerContainer: { 
    backgroundColor: commonColors.background,
    paddingBottom: 24,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, marginTop: 16 },
  backButton: { width: 40, height: 40, alignItems: 'flex-start', justifyContent: 'center', paddingRight: 10 },
  headerTitleContainer: { flex: 1 },
  headerTitle: { ...typography.h2, color: commonColors.text },
  
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    marginTop: 32,
  },
  stepWrapper: {
    alignItems: 'center',
    width: 60,
    position: 'relative',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: commonColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    zIndex: 2,
  },
  stepActive: {
    backgroundColor: BRAND,
  },
  stepCompleted: {
    backgroundColor: semanticColors.success,
  },
  stepNumber: {
    ...typography.label,
    color: commonColors.textSecondary,
    fontWeight: '700',
  },
  stepNumberActive: {
    color: obstetraColors.onPrimary,
  },
  stepText: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 0.1,
    color: commonColors.textTertiary,
    textAlign: 'center',
  },
  stepTextActive: {
    color: commonColors.text,
    fontWeight: '500',
  },
  stepLine: {
    position: 'absolute',
    top: 15,
    left: 45,
    width: 100, // Approximate width
    height: 2,
    backgroundColor: commonColors.border,
    zIndex: 1,
  },
  stepLineCompleted: {
    backgroundColor: semanticColors.success,
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { backgroundColor: commonColors.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: commonColors.border },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: 24 },
  subTitle: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, color: commonColors.textSecondary, fontWeight: '600', marginBottom: 16 },
  
  formGrid: { gap: 16 },
  row: { flexDirection: 'row' },
  
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 1, borderColor: commonColors.borderStrong, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxActive: { backgroundColor: BRAND, borderColor: BRAND },
  checkboxText: { ...typography.bodySmall, color: commonColors.textSecondary },
  
  footerActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  btnSecondary: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: commonColors.border,
    backgroundColor: commonColors.surface,
    alignSelf: 'flex-start',
  },
  btnSecondaryText: { color: commonColors.textSecondary, ...typography.label, fontWeight: '600' },
  btnPrimary: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: BRAND,
    alignItems: 'center',
  },
  btnPrimaryText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
  btnSuccess: {
    flex: 1,
    marginLeft: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: BRAND,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSuccessText: { color: obstetraColors.onPrimary, ...typography.button, fontSize: 15 },
});

