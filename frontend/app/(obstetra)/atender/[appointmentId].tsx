/**
 * VITMATERNA - Atender Cita (flujo encadenado del obstetra)
 *
 * Centraliza el acto de atención de una cita: desde aquí el obstetra registra,
 * en orden, los datos clínicos de la consulta (control prenatal, laboratorios,
 * tamizajes, tratamiento) sin tener que buscar entre vistas sueltas. Cada paso
 * reutiliza los formularios existentes pasando patientId + appointmentId, de
 * modo que los registros quedan ligados a la cita. Al finalizar, marca la cita
 * como asistida.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import {
  ArrowLeft, Stethoscope, FlaskConical, ClipboardList, Pill,
  CheckCircle2, Circle, ChevronRight, CalendarCheck,
} from 'lucide-react-native';
import { AppButton } from '../../../src/components/ui/AppButton';
import { useToast } from '../../../src/components/ui';
import { confirmAction } from '../../../src/utils/confirm';
import { useAppointments, useUpdateAppointmentStatus } from '../../../src/services/api-queries';
import { useFeatureFlags } from '../../../src/hooks/useFeatureFlags';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { WebMaxWidth } from '../../../src/components/web';
import { useResponsive } from '../../../src/theme/responsive';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

type StepKey = 'control' | 'laboratorio' | 'tamizajes' | 'tratamiento';

interface StepDef {
  key: StepKey;
  label: string;
  desc: string;
  icon: React.ComponentType<any>;
}

const STEPS: StepDef[] = [
  { key: 'control', label: 'Control prenatal', desc: 'Signos vitales, medidas y datos fetales', icon: Stethoscope },
  { key: 'laboratorio', label: 'Laboratorios', desc: 'Hemoglobina, glucemia, VDRL, VIH y más', icon: FlaskConical },
  { key: 'tamizajes', label: 'Tamizajes', desc: 'SRQ-18, violencia, patologías, peso y nutrición', icon: ClipboardList },
  { key: 'tratamiento', label: 'Tratamiento', desc: 'Recetar o ajustar suplementos', icon: Pill },
];

export default function AtenderCitaScreen(): React.ReactElement {
  const router = useRouter();
  const { webShell } = useResponsive();
  const toast = useToast();
  const { appointmentId, gestanteId, patientName } = useLocalSearchParams<{
    appointmentId: string;
    gestanteId?: string;
    patientName?: string;
  }>();

  const { data: appointments } = useAppointments();
  const { mutate: updateStatus, isPending: isFinishing } = useUpdateAppointmentStatus();
  const flags = useFeatureFlags();

  // El paso "Tamizajes" agrupa los módulos opcionales; solo se muestra si el
  // administrador activó al menos uno de ellos.
  const tamizajesEnabled =
    flags.ecografias || flags.pesoRegistros || flags.tamizajeViolencia ||
    flags.tamizajeSaludMental || flags.patologias || flags.odontograma ||
    flags.consejeriaNutricional;
  const visibleSteps = STEPS.filter((s) => (s.key === 'tamizajes' ? tamizajesEnabled : true));

  // Resuelve la cita desde la caché para tener el contexto (paciente, motivo).
  const cita = useMemo(
    () => (appointments || []).find((a: any) => a.id === appointmentId),
    [appointments, appointmentId],
  );
  const gid = (gestanteId as string) || cita?.gestanteId || '';
  const nombre = (patientName as string) || cita?.patientName || 'Paciente';
  const motivo = cita?.type || 'Control Prenatal';

  // Pasos completados en esta sesión de atención (marca local visual).
  const [done, setDone] = useState<Record<StepKey, boolean>>({
    control: false,
    laboratorio: false,
    tamizajes: false,
    tratamiento: false,
  });

  // Al volver de un formulario, marcamos como visitado el último paso abierto.
  const [lastOpened, setLastOpened] = useState<StepKey | null>(null);
  useFocusEffect(
    React.useCallback(() => {
      if (lastOpened) {
        setDone((prev) => ({ ...prev, [lastOpened]: true }));
        setLastOpened(null);
      }
    }, [lastOpened]),
  );

  const openStep = (key: StepKey) => {
    if (!gid) {
      toast.error('Falta la paciente', 'No se pudo identificar a la gestante de esta cita.');
      return;
    }
    setLastOpened(key);
    if (key === 'control') {
      router.push({ pathname: '/(obstetra)/control/nuevo', params: { patientId: gid, appointmentId } } as any);
    } else if (key === 'tamizajes') {
      router.push({ pathname: '/(obstetra)/gestante/tamizajes', params: { id: gid, nombre } } as any);
    } else {
      // Laboratorios y Tratamiento se registran desde la ficha clínica, en su
      // pestaña correspondiente (reutiliza los formularios existentes).
      const tab = key === 'laboratorio' ? 'laboratorio' : 'tratamiento';
      router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: gid, tab } } as any);
    }
  };

  // Cuenta solo los pasos visibles (excluye tamizajes si está deshabilitado).
  const completedCount = visibleSteps.filter((s) => done[s.key]).length;

  const handleFinish = async () => {
    if (!appointmentId) return;

    // Si quedan registros sin completar, pedir confirmación explícita.
    if (completedCount < visibleSteps.length) {
      const faltan = visibleSteps.length - completedCount;
      const ok = await confirmAction({
        title: 'Finalizar con registros pendientes',
        message: `Aún ${faltan === 1 ? 'queda 1 registro' : `quedan ${faltan} registros`} sin completar. ¿Marcar la cita como asistida de todas formas?`,
        confirmText: 'Sí, finalizar',
      });
      if (!ok) return;
    }

    updateStatus(
      { id: appointmentId, status: 'asistida' },
      {
        onSuccess: () => {
          toast.success('Atención finalizada', `${nombre} fue marcada como asistida.`);
          router.replace('/(obstetra)/(tabs)/cronograma');
        },
        onError: () => toast.error('No se pudo finalizar', 'Inténtalo nuevamente.'),
      },
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(obstetra)/(tabs)/cronograma'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Atender cita</Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>{nombre} · {motivo}</Text>
            </View>
          </View>
          <View style={styles.progressPill}>
            <Text style={styles.progressText}>{completedCount} de {visibleSteps.length} registros</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(completedCount / visibleSteps.length) * 100}%` }]} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="full">
          <View style={webShell ? styles.twoCol : undefined}>
            <View style={webShell ? styles.col : undefined}>
              <Text style={styles.intro}>
                Registra los datos de esta consulta en orden. Puedes abrir y completar cada
                sección; lo registrado queda ligado a esta cita.
              </Text>

              <View style={styles.finishWrap}>
                <View style={styles.finishHint}>
                  <CalendarCheck size={18} color={BRAND} />
                  <Text style={styles.finishHintText}>
                    Al finalizar, la cita se marcará como asistida y la gestante será notificada.
                  </Text>
                </View>
                <AppButton
                  title="Finalizar atención"
                  onPress={handleFinish}
                  loading={isFinishing}
                  disabled={isFinishing}
                  themeColor={BRAND}
                  style={styles.finishBtn}
                />
              </View>
            </View>

            <View style={webShell ? styles.col : undefined}>
              {visibleSteps.map((step, idx) => {
                const Icon = step.icon;
                const isDone = done[step.key];
                return (
                  <TouchableOpacity
                    key={step.key}
                    style={[styles.stepCard, isDone && styles.stepCardDone]}
                    activeOpacity={0.7}
                    onPress={() => openStep(step.key)}
                    accessibilityRole="button"
                    accessibilityLabel={`${step.label}. ${isDone ? 'Registrado' : 'Pendiente'}`}
                    accessibilityHint={step.desc}
                  >
                    <View style={[styles.stepIconWrap, isDone && styles.stepIconWrapDone]}>
                      <Icon size={22} color={isDone ? semanticColors.success : BRAND} />
                    </View>
                    <View style={styles.stepInfo}>
                      <View style={styles.stepTitleRow}>
                        <Text style={styles.stepNum}>{idx + 1}.</Text>
                        <Text style={styles.stepLabel}>{step.label}</Text>
                      </View>
                      <Text style={styles.stepDesc}>{step.desc}</Text>
                    </View>
                    {isDone ? (
                      <CheckCircle2 size={22} color={semanticColors.success} />
                    ) : (
                      <View style={styles.stepRight}>
                        <Circle size={20} color={commonColors.borderStrong} />
                        <ChevronRight size={18} color={commonColors.textTertiary} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </WebMaxWidth>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl, paddingBottom: spacing.lg },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface },
  headerTitle: { ...typography.h1, color: commonColors.white },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },
  progressPill: { alignSelf: 'flex-start', backgroundColor: commonColors.onColorSurfaceStrong, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 5, marginTop: spacing.md },
  progressText: { ...typography.caption, color: commonColors.white, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: borderRadius.full, backgroundColor: commonColors.onColorTrack, overflow: 'hidden', marginTop: spacing.sm },
  progressFill: { height: '100%', borderRadius: borderRadius.full, backgroundColor: commonColors.white },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  intro: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.lg, lineHeight: 20 },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  stepCardDone: { borderColor: semanticColors.success, backgroundColor: semanticColors.successLight },
  stepIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  stepIconWrapDone: { backgroundColor: commonColors.surface },
  stepInfo: { flex: 1 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stepNum: { ...typography.bodyMd, color: BRAND, fontWeight: '800' },
  stepLabel: { ...typography.bodyMd, color: commonColors.text, fontWeight: '700' },
  stepDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  stepRight: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  finishWrap: { marginTop: spacing.lg },
  finishHint: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: obstetraColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
  finishHintText: { flex: 1, ...typography.caption, color: commonColors.text, lineHeight: 18 },
  finishBtn: { borderRadius: borderRadius.full, paddingVertical: spacing.md },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
});
