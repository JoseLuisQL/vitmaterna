import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, User, Stethoscope, Pill, FlaskConical,
  Syringe, AlertTriangle, Activity, Plus, ClipboardList, Trash2, BookOpen, Search, Send, X,
  Phone, MessageCircle, Sparkles, CalendarClock, Baby, HeartPulse, CalendarHeart,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { HomeVisitsTab } from '../../../src/components/obstetra/HomeVisitsTab';
import { LineChartSvg } from '../../../src/components/ui/LineChartSvg';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton, useToast, DateTimeField, Accordion } from '../../../src/components/ui';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import {
  usePatientProfile, useCreateLabResult, useCreateVaccine, useCreateTreatment,
  useCreateAntecedente, useDeleteAntecedente, useUpdateTreatment, useUpdatePatient,
  useEducationCatalog, useRecommendContent,
  usePatientDangerSigns, useUpdateDangerSign,
} from '../../../src/services/api-queries';
import { categoryMeta, typeMeta } from '../../../src/utils/educationMeta';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { useFeatureFlags } from '../../../src/hooks/useFeatureFlags';
import { AlturaUterinaChart } from '../../../src/components/shared/AlturaUterinaChart';
import { confirmAction } from '../../../src/utils/confirm';
import { openWhatsApp } from '../../../src/utils/whatsapp';

const BRAND = obstetraColors.primary;

// ─── TABS (4 secciones lógicas y jerárquicas) ────────────────────────────────
// Se agrupan los contenidos en 4 grupos alineados a los objetivos de la tesis:
//   Resumen     → datos personales, obstétricos, antecedentes y embarazo
//   Seguimiento → controles prenatales + visitas domiciliarias (Objetivo 1)
//   Tratamiento → medicinas/suplementos + vacunas (Objetivo 2)
//   Clínico     → laboratorio (Hb) + signos de alarma
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: User },
  { id: 'seguimiento', label: 'Seguimiento', icon: Stethoscope },
  { id: 'tratamiento', label: 'Tratamiento', icon: Pill },
  { id: 'clinico', label: 'Clínico', icon: FlaskConical },
];

/** Mapea deep-links antiguos (tab=laboratorio, alarmas, etc.) a los 4 grupos. */
const TAB_ALIASES: Record<string, string> = {
  datos: 'resumen',
  controles: 'seguimiento',
  visitas: 'seguimiento',
  vacunas: 'tratamiento',
  laboratorio: 'clinico',
  alarmas: 'clinico',
};

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const designTokens = {
  cardShadow: shadows.card,
  glassShadow: shadows.card,
};

// ─── UTILS & SUBCOMPONENTS ────────────────────────────────────────────────────
function Fila({ label, value, isLast = false }: { label: string; value?: string | number | null; isLast?: boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={[filaStyles.row, !isLast && filaStyles.border]}>
      <Text style={filaStyles.label}>{label}</Text>
      <Text style={filaStyles.value}>{value}</Text>
    </View>
  );
}

const filaStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  label: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  value: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.text,
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 20,
  },
});

function Seccion({ titulo }: { titulo: string }) {
  return (
    <View style={seccionStyles.container}>
      <Text style={seccionStyles.title}>{titulo}</Text>
    </View>
  );
}

const seccionStyles = StyleSheet.create({
  container: {
    marginTop: 20,
    marginBottom: 6,
    paddingHorizontal: 16,
  },
  title: {
    ...typography.overline,
    color: commonColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  }
});

/** Color sólido del semáforo de riesgo. */
function riskTextColor(riskLevel?: string): string {
  if (riskLevel === 'Alto') return riskColors.riskRed;
  if (riskLevel === 'Medio') return riskColors.riskYellow;
  return riskColors.riskGreen;
}

/** Fondo suave del semáforo de riesgo (para el banner de estado). */
function riskBgColor(riskLevel?: string): string {
  if (riskLevel === 'Alto') return riskColors.riskRedLight;
  if (riskLevel === 'Medio') return riskColors.riskYellowLight;
  return riskColors.riskGreenLight;
}

/** Etiqueta legible del nivel de riesgo. */
function riskLabel(riskLevel?: string): string {
  if (riskLevel === 'Alto') return 'Riesgo alto';
  if (riskLevel === 'Medio') return 'Riesgo moderado';
  return 'Sin riesgo';
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function PatientProfileScreen(): React.ReactElement {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  // Alcance: el acceso a "Tamizajes" (módulos opcionales) solo se ofrece si el
  // administrador activó al menos uno de esos módulos.
  const flags = useFeatureFlags();
  const tamizajesEnabled =
    flags.ecografias || flags.pesoRegistros || flags.tamizajeViolencia ||
    flags.tamizajeSaludMental || flags.patologias || flags.odontograma ||
    flags.consejeriaNutricional;

  const visibleTabs = TABS;

  // Permite abrir la ficha directamente en una sección (deep-link). Acepta tanto
  // los nuevos ids (resumen/seguimiento/tratamiento/clinico) como los antiguos
  // (laboratorio, alarmas, controles…) que se traducen vía TAB_ALIASES.
  const VALID_TABS = visibleTabs.map((t) => t.id);
  const resolvedInitial = tab ? (TAB_ALIASES[tab] ?? tab) : 'resumen';
  const [activeTab, setActiveTab] = useState(VALID_TABS.includes(resolvedInitial) ? resolvedInitial : 'resumen');

  const { data: patient, isLoading } = usePatientProfile(id || '');

  // Modal and Form States
  const [isLabModalVisible, setIsLabModalVisible] = useState(false);
  const [isVaxModalVisible, setIsVaxModalVisible] = useState(false);
  const [isTreatModalVisible, setIsTreatModalVisible] = useState(false);

  // Form states for Lab Result
  const [labTipo, setLabTipo] = useState('');
  const [labToma, setLabToma] = useState('1');
  const [labValorNum, setLabValorNum] = useState('');
  const [labValorText, setLabValorText] = useState('');
  const [labUnidad, setLabUnidad] = useState('');
  const [labResultado, setLabResultado] = useState('');
  const [labObs, setLabObs] = useState('');

  // Form states for Vaccine Record
  const [vaxNombre, setVaxNombre] = useState('');
  const [vaxDosis, setVaxDosis] = useState('1');
  const [vaxSemana, setVaxSemana] = useState('');
  const [vaxEstado, setVaxEstado] = useState('aplicada');

  // Form states for Treatment
  const [treatNombre, setTreatNombre] = useState('');
  const [treatDosis, setTreatDosis] = useState('1 tableta');
  const [treatFrecuencia, setTreatFrecuencia] = useState('Diario');
  const [treatHora, setTreatHora] = useState('08:00');
  const [treatDuracion, setTreatDuracion] = useState('30');

  // Antecedentes (RF-2.03)
  const [isAntModalVisible, setIsAntModalVisible] = useState(false);
  const [antTipo, setAntTipo] = useState<'familiar' | 'personal'>('personal');
  const [antCondicion, setAntCondicion] = useState('');
  const [antDetalle, setAntDetalle] = useState('');

  // Editar datos del embarazo (FUM/FPP/antropometría) por el obstetra
  const [isEmbModalVisible, setIsEmbModalVisible] = useState(false);
  const [embFum, setEmbFum] = useState('');
  const [embFppEco, setEmbFppEco] = useState('');
  const [embPesoHabitual, setEmbPesoHabitual] = useState('');
  const [embTalla, setEmbTalla] = useState('');
  const [embGrupo, setEmbGrupo] = useState('');
  const [embFactor, setEmbFactor] = useState('');

  // Editar/suspender tratamiento (RF-4.10)
  const [editTreat, setEditTreat] = useState<any | null>(null);
  const [editDosis, setEditDosis] = useState('');
  const [editFrecuencia, setEditFrecuencia] = useState('');
  const [editIndicaciones, setEditIndicaciones] = useState('');
  const [suspendTreat, setSuspendTreat] = useState<any | null>(null);
  const [motivoSuspension, setMotivoSuspension] = useState('');

  const toast = useToast();

  // Contacto rápido con la gestante (llamada / WhatsApp).
  const handleCall = () => {
    const phone = patient?.phone;
    if (!phone) {
      toast.warning('Sin teléfono', 'Esta gestante no tiene un teléfono registrado.');
      return;
    }
    Linking.openURL(`tel:${phone.replace(/[^\d+]/g, '')}`);
  };
  const handleWhatsApp = async () => {
    const phone = patient?.phone;
    if (!phone) {
      toast.warning('Sin teléfono', 'Esta gestante no tiene un teléfono registrado.');
      return;
    }
    const ok = await openWhatsApp(phone, `Hola ${patient?.firstName || ''}, le escribe su obstetra de VITMATERNA.`);
    if (!ok) toast.error('No se pudo abrir WhatsApp', 'Verifica el número de la gestante.');
  };

  // Mutations
  const { mutate: createLabResult, isPending: isSavingLab } = useCreateLabResult();
  const { mutate: createVaccine, isPending: isSavingVax } = useCreateVaccine();
  const { mutate: createTreatment, isPending: isSavingTreat } = useCreateTreatment();
  const { mutate: createAntecedente, isPending: isSavingAnt } = useCreateAntecedente();
  const { mutate: deleteAntecedente } = useDeleteAntecedente();
  const { mutate: updateTreatment, isPending: isUpdatingTreat } = useUpdateTreatment();
  const { mutate: updatePatient, isPending: isSavingEmb } = useUpdatePatient();
  const { data: dangerSigns = [] } = usePatientDangerSigns(id || '');
  const { mutate: updateDangerSign, isPending: isUpdatingDanger } = useUpdateDangerSign();

  // Recomendar contenido educativo a esta gestante
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [recSearch, setRecSearch] = useState('');
  const { data: catalog = [], isLoading: catalogLoading } = useEducationCatalog();
  const { mutate: recommendContent, isPending: isRecommending } = useRecommendContent();

  const debouncedRecSearch = useDebouncedValue(recSearch, 400);
  const recFiltered = React.useMemo(() => {
    const q = debouncedRecSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => `${c.titulo} ${c.contenido}`.toLowerCase().includes(q));
  }, [catalog, debouncedRecSearch]);

  const handleRecommend = (contentId: string, titulo: string) => {
    if (!patient || isRecommending) return;
    recommendContent(
      { gestanteId: patient.id, contentId },
      {
        onSuccess: () => {
          toast.success('Contenido recomendado', `Se envió "${titulo}" a ${patient.firstName} por el chat.`);
          setRecommendVisible(false);
          setRecSearch('');
        },
        onError: () => toast.error('No se pudo recomendar', 'Inténtalo nuevamente.'),
      },
    );
  };

  const openEmbModal = () => {
    if (!patient) return;
    setEmbFum(patient.fumRaw || '');
    setEmbFppEco(patient.fppEcoRaw || '');
    setEmbPesoHabitual(patient.pesoHabitual ? String(patient.pesoHabitual) : '');
    setEmbTalla(patient.talla ? String(patient.talla) : '');
    setEmbGrupo(patient.grupoSanguineo || '');
    setEmbFactor(patient.factorRh || '');
    setIsEmbModalVisible(true);
  };

  const handleSaveEmbarazo = () => {
    if (!patient) return;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (embFum && !dateRegex.test(embFum)) {
      return toast.error('Formato inválido', 'La FUM debe tener el formato AAAA-MM-DD.');
    }
    if (embFppEco && !dateRegex.test(embFppEco)) {
      return toast.error('Formato inválido', 'La FPP por eco debe tener el formato AAAA-MM-DD.');
    }
    const data: any = {};
    // Solo se envían los campos con valor para no sobrescribir con null sin querer.
    data.fum = embFum ? new Date(embFum).toISOString() : null;
    if (embFppEco) data.fppEco = new Date(embFppEco).toISOString();
    if (embPesoHabitual) data.pesoHabitual = Number(embPesoHabitual);
    if (embTalla) data.talla = Number(embTalla);
    if (embGrupo) data.grupoSanguineo = embGrupo.trim();
    if (embFactor) data.factorRh = embFactor.trim();

    updatePatient(
      { id: patient.id, data },
      {
        onSuccess: () => {
          toast.success('Datos actualizados', 'La FPP se recalculó automáticamente.');
          setIsEmbModalVisible(false);
        },
        onError: (e: any) => toast.error('No se pudo guardar', e?.response?.data?.error?.message || 'Inténtalo de nuevo.'),
      },
    );
  };

  const handleSaveAntecedente = () => {
    if (!antCondicion.trim()) return toast.error('Falta la condición', 'Indica la condición del antecedente.');
    if (!patient) return;
    createAntecedente(
      { gestanteId: patient.id, tipo: antTipo, condicion: antCondicion.trim(), detalle: antDetalle || undefined },
      {
        onSuccess: () => {
          toast.success('Antecedente registrado');
          setIsAntModalVisible(false);
          setAntCondicion(''); setAntDetalle(''); setAntTipo('personal');
        },
        onError: () => toast.error('Error', 'No se pudo registrar el antecedente.'),
      },
    );
  };

  const confirmDeleteAntecedente = async (ant: any) => {
    if (!patient) return;
    const ok = await confirmAction({
      title: 'Eliminar antecedente',
      message: `¿Eliminar "${ant.condicion}"?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    deleteAntecedente(
      { id: ant.id, gestanteId: patient.id },
      { onSuccess: () => toast.success('Antecedente eliminado'), onError: () => toast.error('Error', 'No se pudo eliminar.') },
    );
  };

  const openEditTreat = (sup: any) => {
    setEditTreat(sup);
    setEditDosis(sup.dosis || '');
    setEditFrecuencia(sup.frecuencia || '');
    setEditIndicaciones(sup.indicaciones || '');
  };

  const handleSaveEditTreat = () => {
    if (!editTreat || !patient) return;
    updateTreatment(
      { treatmentId: editTreat.id, gestanteId: patient.id, data: { dosis: editDosis, frecuencia: editFrecuencia, indicaciones: editIndicaciones || undefined } },
      {
        onSuccess: () => { toast.success('Tratamiento actualizado'); setEditTreat(null); },
        onError: () => toast.error('Error', 'No se pudo actualizar el tratamiento.'),
      },
    );
  };

  const handleSuspendTreat = () => {
    if (!suspendTreat || !patient) return;
    if (!motivoSuspension.trim()) return toast.error('Falta el motivo', 'Indica la justificación clínica.');
    updateTreatment(
      { treatmentId: suspendTreat.id, gestanteId: patient.id, data: { estado: 'suspendido', motivoSuspension: motivoSuspension.trim() } },
      {
        onSuccess: () => { toast.warning('Tratamiento suspendido'); setSuspendTreat(null); setMotivoSuspension(''); },
        onError: () => toast.error('Error', 'No se pudo suspender el tratamiento.'),
      },
    );
  };

  const handleSaveLab = () => {
    if (!labTipo) return toast.error('Falta el tipo', 'El tipo de examen es requerido.');
    if (!patient) return;

    createLabResult({
      gestanteId: patient.id,
      tipoExamen: labTipo,
      numeroToma: parseInt(labToma, 10) || 1,
      valorNumerico: labValorNum ? parseFloat(labValorNum) : undefined,
      valor: labValorText || undefined,
      unidad: labUnidad || undefined,
      resultado: labResultado || undefined,
      fechaExamen: new Date().toISOString().split('T')[0],
      observaciones: labObs || undefined
    }, {
      onSuccess: () => {
        toast.success('Examen registrado', 'El resultado de laboratorio se guardó.');
        setIsLabModalVisible(false);
        setLabTipo('');
        setLabToma('1');
        setLabValorNum('');
        setLabValorText('');
        setLabUnidad('');
        setLabResultado('');
        setLabObs('');
      },
      onError: () => {
        toast.error('Error', 'No se pudo registrar el examen.');
      }
    });
  };

  const handleSaveVax = () => {
    if (!vaxNombre) return toast.error('Falta el nombre', 'El nombre de la vacuna es requerido.');
    if (!patient) return;

    createVaccine({
      gestanteId: patient.id,
      vacuna: vaxNombre,
      dosisNumero: parseInt(vaxDosis, 10) || 1,
      egSemanasAplicacion: vaxSemana ? parseInt(vaxSemana, 10) : undefined,
      fechaAplicacion: vaxEstado === 'aplicada' ? new Date().toISOString().split('T')[0] : undefined,
      estado: vaxEstado,
    }, {
      onSuccess: () => {
        toast.success('Vacuna registrada', 'El registro de vacunación se guardó.');
        setIsVaxModalVisible(false);
        setVaxNombre('');
        setVaxDosis('1');
        setVaxSemana('');
        setVaxEstado('aplicada');
      },
      onError: () => {
        toast.error('Error', 'No se pudo registrar la vacuna.');
      }
    });
  };

  const handleSaveTreat = () => {
    if (!treatNombre) return toast.error('Falta el medicamento', 'El nombre del medicamento es requerido.');
    if (!patient) return;

    createTreatment({
      gestanteId: patient.id,
      nombre: treatNombre,
      dosis: treatDosis,
      frecuencia: treatFrecuencia,
      horaToma: treatHora || undefined,
      duracionDias: parseInt(treatDuracion, 10) || 30,
      fechaInicio: new Date().toISOString().split('T')[0],
      viaAdministracion: 'oral',
    }, {
      onSuccess: () => {
        toast.success('Tratamiento asignado', 'El esquema de tratamiento se guardó.');
        setIsTreatModalVisible(false);
        setTreatNombre('');
        setTreatDosis('1 tableta');
        setTreatFrecuencia('Diario');
        setTreatHora('08:00');
        setTreatDuracion('30');
      },
      onError: () => {
        toast.error('Error', 'No se pudo asignar el tratamiento.');
      }
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={obstetraColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerContainer}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerNav}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconBtnGlass}>
                <ChevronLeft size={24} color={commonColors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Historia Clínica</Text>
              <View style={{ width: 40 }} />
            </View>
          </SafeAreaView>
        </LinearGradient>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <DashboardSkeleton count={3} />
        </View>
      </View>
    );
  }

  if (!patient) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <EmptyState
          icon={User as any}
          title="Paciente No Encontrada"
          description="No se pudo localizar el perfil de la paciente."
          actionTitle="Volver"
          onAction={() => router.back()}
          themeColor={obstetraColors.primary}
        />
      </View>
    );
  }

  // Preparar datos de gráficas
  const controls = patient.controls || [];
  // Puntos de peso válidos (número > 0), ordenados por semana de gestación.
  const weightPoints = controls
    .map((c: any) => ({ week: Number(c.week), weight: Number(c.weight) }))
    .filter((p: any) => Number.isFinite(p.weight) && p.weight > 0)
    .sort((a: any, b: any) => (Number.isFinite(a.week) ? a.week : 0) - (Number.isFinite(b.week) ? b.week : 0));
  const hasWeightChart = weightPoints.length >= 2;
  const weightData = weightPoints.map((p: any) => p.weight);
  const weekLabels = weightPoints.map((p: any) => `S${Number.isFinite(p.week) ? p.week : '—'}`);

  const lab = patient.laboratorio || {};
  const vacunas = patient.vacunas || [];
  const suplementos = patient.suplementos || [];

  const imcVal = Number(patient.imc);
  const displayImc = !isNaN(imcVal) && imcVal > 0 && imcVal < 100 ? imcVal.toFixed(1) : '—';

  // Datos para el banner de estado clínico (lo crítico de un vistazo).
  const pendingDangerCount = dangerSigns.filter((s: any) => s.estado === 'pendiente').length;
  const nextAppointment = (patient.appointments || [])
    .filter((a: any) => ['programada', 'confirmada'].includes(a.estado) && new Date(a.fecha) >= new Date())
    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ── HEADER GRADIENT ── */}
      <LinearGradient
        colors={obstetraColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.headerNav}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtnGlass}>
              <ChevronLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Historia Clínica</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs2 }}>
              <TouchableOpacity
                style={styles.iconBtnGlass}
                onPress={handleCall}
                accessibilityLabel="Llamar a la gestante"
                accessibilityRole="button"
              >
                <Phone size={20} color={commonColors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtnGlass}
                onPress={handleWhatsApp}
                accessibilityLabel="Escribir por WhatsApp"
                accessibilityRole="button"
              >
                <MessageCircle size={20} color={commonColors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconBtnGlass}
                onPress={() => setRecommendVisible(true)}
                accessibilityLabel="Recomendar contenido educativo"
                accessibilityRole="button"
              >
                <BookOpen size={22} color={commonColors.white} />
              </TouchableOpacity>
              {tamizajesEnabled && (
                <TouchableOpacity
                  style={styles.iconBtnGlass}
                  onPress={() => router.push({
                    pathname: '/(obstetra)/gestante/tamizajes',
                    params: { id: patient.id, nombre: `${patient.firstName} ${patient.lastName}` },
                  } as any)}
                >
                  <ClipboardList size={22} color={commonColors.white} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.headerContent}>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>
                {(patient.firstName?.[0] || '') + (patient.lastName?.[0] || '')}
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.patientName} numberOfLines={1}>
                {patient.firstName} {patient.lastName}
              </Text>
              <Text style={styles.patientSub}>DNI {patient.documentNumber}{patient.age ? ` • ${patient.age} años` : ''}</Text>
            </View>
            <View style={styles.riskPill}>
              <View style={[styles.riskDot, { backgroundColor: riskTextColor(patient.riskLevel) }]} />
              <Text style={styles.riskPillText}>{patient.riskLevel || 'Bajo'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── KPI HIGHLIGHTS (glass, superpuestas al header) ── */}
      <View style={styles.kpiWrapper}>
        <View style={styles.kpiGrid}>
          {[
            { label: 'Semana', value: `${patient.currentWeek || '—'}` },
            { label: 'Trimestre', value: patient.currentTrimester ? `${patient.currentTrimester}°` : '—' },
            { label: 'FPP', value: patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }) : '—' },
            { label: 'IMC', value: displayImc },
          ].map((kpi) => (
            <View key={kpi.label} style={[styles.kpiCard, designTokens.cardShadow]}>
              <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── PANTALLA PRINCIPAL CON TABS ── */}
      <View style={styles.mainContent}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScrollContent}
          style={styles.tabsWrapper}
        >
          {visibleTabs.map(({ id: tid, label, icon: Icon }) => {
            const isActive = activeTab === tid;
            return (
              <TouchableOpacity
                key={tid}
                onPress={() => setActiveTab(tid)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                activeOpacity={0.8}
              >
                <Icon size={16} color={isActive ? commonColors.white : commonColors.textSecondary} strokeWidth={isActive ? 2.5 : 2} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView 
          style={styles.scrollAreaWrapper}
          contentContainerStyle={styles.scrollArea} 
          showsVerticalScrollIndicator={false}
        >
          {/* ── SECCIÓN: RESUMEN (estado + datos + obstétricos + antecedentes + embarazo) ── */}
          {activeTab === 'resumen' && (
            <View style={styles.dataTabContainer}>
              {/* 1. BANNER DE ESTADO CLÍNICO — lo crítico siempre arriba y a la vista */}
              <View style={[styles.statusBanner, { backgroundColor: riskBgColor(patient.riskLevel) }, designTokens.cardShadow]}>
                <View style={styles.statusTopRow}>
                  <View style={[styles.statusRiskChip, { backgroundColor: riskTextColor(patient.riskLevel) }]}>
                    <View style={styles.statusRiskDot} />
                    <Text style={styles.statusRiskText}>{riskLabel(patient.riskLevel)}</Text>
                  </View>
                  {pendingDangerCount > 0 && (
                    <View style={styles.statusAlertChip}>
                      <AlertTriangle size={12} color={semanticColors.danger} />
                      <Text style={styles.statusAlertText}>
                        {pendingDangerCount} signo{pendingDangerCount > 1 ? 's' : ''} de alarma
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.statusMetricsRow}>
                  <View style={styles.statusMetric}>
                    <Baby size={15} color={obstetraColors.primary} />
                    <Text style={styles.statusMetricVal}>{patient.currentWeek ? `${patient.currentWeek} sem` : '—'}</Text>
                    <Text style={styles.statusMetricLbl}>Edad gest.</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <CalendarHeart size={15} color={obstetraColors.primary} />
                    <Text style={styles.statusMetricVal}>
                      {patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '—'}
                    </Text>
                    <Text style={styles.statusMetricLbl}>FPP</Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <CalendarClock size={15} color={obstetraColors.primary} />
                    <Text style={styles.statusMetricVal}>
                      {nextAppointment ? new Date(nextAppointment.fecha).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' }) : '—'}
                    </Text>
                    <Text style={styles.statusMetricLbl}>Próx. cita</Text>
                  </View>
                </View>
              </View>

              {/* 2. RESUMEN CLÍNICO AUTOGENERADO (protagonista) */}
              {patient.resumenClinico?.texto ? (
                <View style={[styles.resumenCard, designTokens.cardShadow]}>
                  <View style={styles.resumenHeader}>
                    <Sparkles size={16} color={obstetraColors.primary} />
                    <Text style={styles.resumenTitle}>Resumen clínico</Text>
                  </View>
                  <Text style={styles.resumenTexto}>{patient.resumenClinico.texto}</Text>
                  {patient.resumenClinico.alertas?.length > 0 && (
                    <View style={styles.resumenAlertas}>
                      {patient.resumenClinico.alertas.map((a: string, i: number) => (
                        <View key={i} style={styles.resumenAlertaRow}>
                          <AlertTriangle size={13} color={riskColors.riskRed} />
                          <Text style={styles.resumenAlertaText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}

              {/* 3. DETALLE EN ACORDEONES — Embarazo abierto, el resto plegado */}
              <Accordion title="Datos del embarazo" icon={CalendarHeart} accentColor={BRAND} defaultOpen
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={openEmbModal} hitSlop={6}>
                    <Plus size={13} color={obstetraColors.onPrimary} />
                    <Text style={styles.addChipText}>Editar</Text>
                  </TouchableOpacity>
                )}
              >
                <Fila label="FUM" value={patient.fum} />
                <Fila label="FPP" value={patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE') : undefined} />
                <Fila label="Semanas" value={patient.currentWeek ? `${patient.currentWeek} semanas` : undefined} />
                <Fila label="Peso habitual" value={patient.pesoHabitual ? `${patient.pesoHabitual} kg` : undefined} />
                <Fila label="Talla" value={patient.talla ? `${patient.talla} m` : undefined} />
                <Fila label="Grupo sanguíneo" value={patient.bloodType} isLast />
              </Accordion>

              <Accordion title="Antecedentes obstétricos" icon={Baby} accentColor={BRAND}>
                <Fila label="Gestaciones (G)" value={patient.gestaciones} />
                <Fila label="Partos (P)" value={patient.partos} />
                <Fila label="Cesáreas (C)" value={patient.cesareas} />
                <Fila label="Abortos (A)" value={patient.abortos} isLast />
              </Accordion>

              <Accordion
                title="Antecedentes familiares / personales"
                icon={HeartPulse}
                accentColor={BRAND}
                count={(patient.antecedentes || []).length}
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={() => setIsAntModalVisible(true)} hitSlop={6}>
                    <Plus size={13} color={obstetraColors.onPrimary} />
                    <Text style={styles.addChipText}>Añadir</Text>
                  </TouchableOpacity>
                )}
              >
                {(patient.antecedentes || []).length > 0 ? (
                  patient.antecedentes.map((ant: any, idx: number) => (
                    <View key={ant.id} style={[styles.antRow, idx < patient.antecedentes.length - 1 && styles.antRowBorder]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.antCondicion}>{ant.condicion}</Text>
                        <Text style={styles.antMeta}>
                          {ant.tipo === 'familiar' ? 'Familiar' : 'Personal'}{ant.detalle ? ` · ${ant.detalle}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => confirmDeleteAntecedente(ant)} hitSlop={10} style={styles.antDeleteBtn}>
                        <Trash2 size={18} color={semanticColors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.antEmpty}>Sin antecedentes registrados.</Text>
                )}
              </Accordion>

              <Accordion title="Datos personales" icon={User} accentColor={BRAND}>
                <Fila label="Nombre completo" value={`${patient.firstName} ${patient.lastName}`} />
                <Fila label="DNI" value={patient.documentNumber} />
                <Fila label="N° Historia Clínica" value={patient.historiaClinica} />
                <Fila label="Fecha de nacimiento" value={patient.fechaNacimiento} />
                <Fila label="Edad" value={patient.age ? `${patient.age} años` : undefined} />
                <Fila label="Teléfono" value={patient.phone} />
                <Fila label="Tel. acompañante" value={patient.phoneAcompanante} />
                <Fila label="Dirección" value={patient.address} />
                <Fila label="Localidad" value={patient.localidad} />
                <Fila label="Estado civil" value={patient.maritalStatus} />
                <Fila label="Ocupación" value={patient.occupation} />
                <Fila label="Estudios" value={patient.education} />
                <Fila label="Código SIS" value={patient.sisCode} isLast />
              </Accordion>
            </View>
          )}

          {/* ── SECCIÓN: SEGUIMIENTO (controles prenatales + visitas) ── */}
          {activeTab === 'seguimiento' && (
            <View style={styles.section}>
              {/* Gráfica de altura uterina con bandas de referencia P10/P90 (RF-5.03) */}
              <AlturaUterinaChart controls={controls} themeColor={BRAND} />

              {/* La curva de peso solo se muestra si el módulo de peso está activo. */}
              {flags.pesoRegistros && hasWeightChart && (
                <View style={[styles.card, designTokens.cardShadow, { padding: 20 }]}>
                  <Text style={styles.cardHeader}>Curva de Ganancia de Peso (kg)</Text>
                  <LineChartSvg
                    labels={weekLabels}
                    height={180}
                    decimals={1}
                    series={[{ data: weightData, color: BRAND, strokeWidth: 3 }]}
                    legend={[{ label: 'Peso (kg)', color: BRAND }]}
                    style={{ marginTop: spacing.sm }}
                  />
                </View>
              )}

              <View style={styles.actionHeader}>
                <Text style={styles.cardHeader}>Historial de Controles</Text>
                <TouchableOpacity 
                  style={[styles.primaryActionBtn, designTokens.glassShadow]}
                  onPress={() => router.push({ pathname: '/(obstetra)/control/nuevo', params: { patientId: patient.id } } as any)}
                >
                  <Plus size={16} color={obstetraColors.onPrimary} />
                  <Text style={styles.primaryActionText}>Nuevo Control</Text>
                </TouchableOpacity>
              </View>

              {controls.length > 0 ? (
                [...controls].reverse().map((ctrl: any) => (
                  <View key={ctrl.id || ctrl._id} style={[styles.controlCard, designTokens.cardShadow]}>
                    <View style={styles.ctrlHeader}>
                      <View style={styles.ctrlDateBox}>
                        <Text style={styles.ctrlDay}>{new Date(ctrl.date || ctrl.fecha).getDate()}</Text>
                        <Text style={styles.ctrlMonth}>
                          {new Date(ctrl.date || ctrl.fecha).toLocaleDateString('es-PE', { month: 'short' }).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.ctrlTitleWrap}>
                        <Text style={styles.ctrlTitle}>Control Prenatal</Text>
                        <Text style={styles.ctrlSubtitle}>Semana {ctrl.week || '—'}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.ctrlMetrics}>
                      {[
                        { label: 'Peso', value: ctrl.weight ? `${ctrl.weight}kg` : undefined },
                        { label: 'PA', value: ctrl.bloodPressure },
                        { label: 'FCF', value: ctrl.fetalHeartRate ? `${ctrl.fetalHeartRate} lpm` : undefined },
                        { label: 'AU', value: ctrl.alturaUterina ? `${ctrl.alturaUterina}cm` : undefined },
                      ].map(({ label, value }) => value ? (
                        <View key={label} style={styles.ctrlMetricBox}>
                          <Text style={styles.ctrlMetricVal}>{value}</Text>
                          <Text style={styles.ctrlMetricLbl}>{label}</Text>
                        </View>
                      ) : null)}
                    </View>
                  </View>
                ))
              ) : (
                <EmptyState
                  icon={Activity as any}
                  title="Sin controles"
                  description="Aún no se ha registrado ningún control para esta gestante."
                  themeColor={BRAND}
                />
              )}

              {/* Visitas domiciliarias (continuidad del cuidado, Objetivo 1) */}
              <View style={{ marginTop: spacing.lg }}>
                <Seccion titulo="Visitas domiciliarias" />
                <HomeVisitsTab
                  gestanteId={patient.id}
                  domicilioLat={patient.domicilioLat}
                  domicilioLng={patient.domicilioLng}
                  referenciaDom={patient.referenciaDom}
                />
              </View>
            </View>
          )}

          {/* ── SECCIÓN: TRATAMIENTO (medicinas/suplementos + vacunas) ── */}
          {activeTab === 'tratamiento' && (
            <View style={styles.section}>
              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={[styles.cardHeader, { marginBottom: 0 }]}>Esquema de Tratamiento</Text>
                  <TouchableOpacity 
                    style={styles.primaryActionBtn}
                    onPress={() => setIsTreatModalVisible(true)}
                  >
                    <Plus size={16} color={obstetraColors.onPrimary} />
                    <Text style={styles.primaryActionText}>Recetar</Text>
                  </TouchableOpacity>
                </View>
                
                {suplementos.length > 0 ? suplementos.map((sup: any) => {
                  const tomados = sup.diasTomados?.length || 0;
                  const total = sup.totalDias || 30;
                  const pct = total > 0 ? Math.round((tomados / total) * 100) : 0;
                  const isGood = pct >= 80;
                  
                  const suspendido = sup.estado === 'suspendido';
                  return (
                    <View key={sup.id || sup._id} style={[styles.pillCard, designTokens.glassShadow, suspendido && { opacity: 0.6 }]}>
                      <View style={styles.pillIconBox}>
                        <Pill size={24} color={BRAND} />
                      </View>
                      <View style={styles.pillInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.pillName}>{sup.nombre}</Text>
                          {suspendido && <Text style={styles.suspendBadge}>Suspendido</Text>}
                        </View>
                        <Text style={styles.pillDosis}>{sup.dosis} • {sup.frecuencia}</Text>
                        
                        <View style={styles.progressWrap}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isGood ? semanticColors.success : semanticColors.warning }]} />
                          </View>
                          <Text style={[styles.progressPct, { color: isGood ? semanticColors.success : semanticColors.warning }]}>{pct}%</Text>
                        </View>
                        <Text style={styles.progressHint}>{tomados} de {total} dosis tomadas</Text>

                        {!suspendido && (
                          <View style={styles.treatActionsRow}>
                            <TouchableOpacity style={styles.treatActionBtn} onPress={() => openEditTreat(sup)}>
                              <Text style={styles.treatActionText}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.treatActionBtn, styles.treatSuspendBtn]} onPress={() => setSuspendTreat(sup)}>
                              <Text style={[styles.treatActionText, { color: semanticColors.danger }]}>Suspender</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                }) : (
                  <EmptyState
                    icon={Pill as any}
                    title="Sin medicación"
                    description="No hay suplementos o tratamientos activos."
                    themeColor={BRAND}
                  />
                )}
              </View>

              {/* Vacunas prenatales (indicador de adherencia, Objetivo 2) */}
              <View style={[styles.card, designTokens.cardShadow, { marginTop: spacing.md }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.cardHeader, { marginBottom: 0 }]}>Esquema de Vacunación</Text>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => setIsVaxModalVisible(true)}
                  >
                    <Plus size={16} color={obstetraColors.onPrimary} />
                    <Text style={styles.primaryActionText}>Registrar</Text>
                  </TouchableOpacity>
                </View>
                {vacunas.length > 0 ? vacunas.map((v: any, i: number) => (
                  <View key={i} style={[styles.vaxRow, i < vacunas.length - 1 && styles.vaxBorder]}>
                    <View style={styles.vaxIconBox}>
                      <Syringe size={20} color={v.aplicada ? semanticColors.success : commonColors.textTertiary} />
                    </View>
                    <View style={styles.vaxInfo}>
                      <Text style={styles.vaxName}>{v.nombre}</Text>
                      <Text style={styles.vaxWeek}>Recomendada sem. {v.semana}</Text>
                    </View>
                    <View style={[styles.vaxStatus, v.aplicada ? styles.vaxStatusOk : styles.vaxStatusPending]}>
                      <Text style={[styles.vaxStatusText, v.aplicada ? styles.vaxStatusTextOk : styles.vaxStatusTextPending]}>
                        {v.aplicada ? 'Aplicada' : 'Pendiente'}
                      </Text>
                    </View>
                  </View>
                )) : (
                  <Text style={styles.emptyTextInfo}>No hay vacunas en el esquema.</Text>
                )}
              </View>
            </View>
          )}

          {/* ── SECCIÓN: CLÍNICO (laboratorio + signos de alarma) ── */}
          {activeTab === 'clinico' && (
            <View style={{ gap: spacing.sm2 }}>
              {/* Laboratorio (hemoglobina ↔ anemia/hierro) */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={[styles.cardHeader, { marginBottom: 0 }]}>Resultados Analíticos</Text>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => setIsLabModalVisible(true)}
                  >
                    <Plus size={16} color={obstetraColors.onPrimary} />
                    <Text style={styles.primaryActionText}>Registrar</Text>
                  </TouchableOpacity>
                </View>

                {lab.hemoglobina1 && lab.hemoglobina1 < 11 && (
                  <View style={styles.alertBanner}>
                    <AlertTriangle size={20} color={semanticColors.danger} />
                    <View style={styles.alertBannerTextWrap}>
                      <Text style={styles.alertBannerTitle}>Alerta de Anemia</Text>
                      <Text style={styles.alertBannerDesc}>Hemoglobina baja ({lab.hemoglobina1} g/dL). Monitorear suplementación.</Text>
                    </View>
                  </View>
                )}

                <Fila label="Hemoglobina I" value={lab.hemoglobina1 ? `${lab.hemoglobina1} g/dL` : undefined} />
                <Fila label="Hemoglobina II" value={lab.hemoglobina2 ? `${lab.hemoglobina2} g/dL` : 'Pendiente'} />
                <Fila label="Hemoglobina III" value={lab.hemoglobina3 ? `${lab.hemoglobina3} g/dL` : 'Pendiente'} />
                <Fila label="Glucemia" value={lab.glucemia} />
                <Fila label="VDRL/RPR" value={lab.vdrl} />
                <Fila label="VIH" value={lab.vih} />
                <Fila label="Hepatitis B" value={lab.hepatitisB} />
                <Fila label="Examen de orina" value={lab.examenOrina} />
                <Fila label="Prueba PAP" value={lab.pap} isLast />
              </View>

              <Seccion titulo="Signos de alarma reportados" />
              {dangerSigns.length === 0 ? (
                <View style={[styles.card, designTokens.cardShadow]}>
                  <Text style={{ ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }}>
                    Esta gestante no ha reportado signos de alarma.
                  </Text>
                </View>
              ) : (
                dangerSigns.map((s) => {
                  const grave = (s.severidad || '').toLowerCase() === 'grave';
                  const color = grave ? semanticColors.danger : semanticColors.warning;
                  const pendiente = s.estado === 'pendiente';
                  const estadoLabel = s.estado === 'atendido' ? 'Atendido' : s.estado === 'derivado' ? 'Derivado' : 'Pendiente';
                  return (
                    <View key={s.id} style={[styles.card, designTokens.cardShadow, { borderLeftWidth: 4, borderLeftColor: color }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          <AlertTriangle size={16} color={color} />
                          <Text style={{ ...typography.bodyMedium, fontWeight: '700', color: commonColors.text, flex: 1 }} numberOfLines={2}>{s.tipoSigno}</Text>
                        </View>
                        <View style={{ backgroundColor: color + '1A', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full }}>
                          <Text style={{ ...typography.overline, color, fontWeight: '700' }}>{grave ? 'GRAVE' : 'LEVE'}</Text>
                        </View>
                      </View>
                      {s.descripcion ? (
                        <Text style={{ ...typography.bodySmall, color: commonColors.textSecondary, marginBottom: 6 }}>{s.descripcion}</Text>
                      ) : null}
                      <Text style={{ ...typography.caption, color: commonColors.textTertiary, marginBottom: pendiente ? 10 : 0 }}>
                        {new Date(s.createdAt).toLocaleString('es-PE')} · {estadoLabel}
                      </Text>
                      {pendiente && (
                        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: borderRadius.lg, backgroundColor: semanticColors.warningLight }}
                            disabled={isUpdatingDanger}
                            onPress={() => updateDangerSign({ id: s.id, gestanteId: id || '', estado: 'derivado' })}
                          >
                            <Text style={{ ...typography.label, color: semanticColors.warning, fontWeight: '700' }}>Derivar</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: borderRadius.lg, backgroundColor: semanticColors.successLight }}
                            disabled={isUpdatingDanger}
                            onPress={() => updateDangerSign({ id: s.id, gestanteId: id || '', estado: 'atendido' })}
                          >
                            <Text style={{ ...typography.label, color: semanticColors.success, fontWeight: '700' }}>Atender</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}

              {/* Acceso a tamizajes/registros opcionales: solo si están habilitados. */}
              {tamizajesEnabled && (
                <TouchableOpacity
                  style={[styles.tamizajesBtn, designTokens.cardShadow, { marginTop: spacing.sm }]}
                  onPress={() => router.push({
                    pathname: '/(obstetra)/gestante/tamizajes',
                    params: { id: patient.id, nombre: `${patient.firstName} ${patient.lastName}` },
                  } as any)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tamizajesIcon}>
                    <ClipboardList size={22} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tamizajesTitle}>Tamizajes y registros adicionales</Text>
                    <Text style={styles.tamizajesDesc}>Evaluaciones clínicas opcionales</Text>
                  </View>
                  <Plus size={20} color={commonColors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* ── MODAL: REGISTRAR EXAMEN ── */}
      <AppModal
        visible={isLabModalVisible}
        onClose={() => setIsLabModalVisible(false)}
        title="Registrar Examen de Laboratorio"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsLabModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveLab} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingLab} loading={isSavingLab} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Tipo de Examen</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {['Hemoglobina', 'Glucemia', 'VIH', 'VDRL', 'Orina'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
                    backgroundColor: labTipo === t ? obstetraColors.primaryLight : commonColors.surfaceAlt,
                    borderWidth: 1, borderColor: labTipo === t ? BRAND : commonColors.border,
                  }}
                  onPress={() => setLabTipo(t)}
                >
                  <Text style={{ ...typography.caption, color: labTipo === t ? BRAND : commonColors.textSecondary, fontWeight: labTipo === t ? '700' : '500' }}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Hemoglobina, Glucemia, VIH..."
              placeholderTextColor={commonColors.textTertiary}
              value={labTipo}
              onChangeText={setLabTipo}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Número de Toma</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 1, 2, 3"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="numeric"
              value={labToma}
              onChangeText={setLabToma}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Valor Numérico (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 11.5"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="numeric"
              value={labValorNum}
              onChangeText={setLabValorNum}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Valor Texto (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Normal, Reactivo..."
              placeholderTextColor={commonColors.textTertiary}
              value={labValorText}
              onChangeText={setLabValorText}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Unidad (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. g/dL, mg/dL"
              placeholderTextColor={commonColors.textTertiary}
              value={labUnidad}
              onChangeText={setLabUnidad}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Resultado (Opcional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Normal, Anemia Leve..."
              placeholderTextColor={commonColors.textTertiary}
              value={labResultado}
              onChangeText={setLabResultado}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Observaciones</Text>
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              placeholder="Notas adicionales..."
              placeholderTextColor={commonColors.textTertiary}
              multiline
              value={labObs}
              onChangeText={setLabObs}
            />
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: REGISTRAR VACUNA ── */}
      <AppModal
        visible={isVaxModalVisible}
        onClose={() => setIsVaxModalVisible(false)}
        title="Registrar Vacunación"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsVaxModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveVax} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingVax} loading={isSavingVax} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Nombre de la Vacuna</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Influenza, Tétanos..."
              placeholderTextColor={commonColors.textTertiary}
              value={vaxNombre}
              onChangeText={setVaxNombre}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Número de Dosis</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 1, 2"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="numeric"
              value={vaxDosis}
              onChangeText={setVaxDosis}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Semanas de Embarazo Aplicación</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 20"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="numeric"
              value={vaxSemana}
              onChangeText={setVaxSemana}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Estado</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {['aplicada', 'pendiente'].map((est) => (
                <TouchableOpacity
                  key={est}
                  style={[
                    styles.textInput,
                    { flex: 1, alignItems: 'center' },
                    vaxEstado === est && { borderColor: BRAND, backgroundColor: obstetraColors.primaryLight }
                  ]}
                  onPress={() => setVaxEstado(est)}
                >
                  <Text style={[vaxEstado === est && { color: BRAND, fontWeight: 'bold' }]}>
                    {est.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: REGISTRAR TRATAMIENTO ── */}
      <AppModal
        visible={isTreatModalVisible}
        onClose={() => setIsTreatModalVisible(false)}
        title="Asignar Tratamiento"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsTreatModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Asignar" onPress={handleSaveTreat} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingTreat} loading={isSavingTreat} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Medicamento</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Sulfato Ferroso + Ácido Fólico"
              placeholderTextColor={commonColors.textTertiary}
              value={treatNombre}
              onChangeText={setTreatNombre}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Dosis</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 1 tableta, 60mg"
              placeholderTextColor={commonColors.textTertiary}
              value={treatDosis}
              onChangeText={setTreatDosis}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Frecuencia</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Diario, Cada 8 horas"
              placeholderTextColor={commonColors.textTertiary}
              value={treatFrecuencia}
              onChangeText={setTreatFrecuencia}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Horario de Recordatorio</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 08:00"
              placeholderTextColor={commonColors.textTertiary}
              value={treatHora}
              onChangeText={setTreatHora}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Duración (Días)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. 30"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="numeric"
              value={treatDuracion}
              onChangeText={setTreatDuracion}
            />
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: EDITAR DATOS DEL EMBARAZO (FUM/FPP) ── */}
      <AppModal
        visible={isEmbModalVisible}
        onClose={() => setIsEmbModalVisible(false)}
        title="Editar datos del embarazo"
        subtitle="Al guardar la FUM, la FPP se recalcula automáticamente (regla de Naegele)."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsEmbModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveEmbarazo} style={{ flex: 1 }} themeColor={BRAND} loading={isSavingEmb} disabled={isSavingEmb} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <DateTimeField
            label="FUM — Fecha de última menstruación"
            mode="date"
            value={embFum}
            onChange={setEmbFum}
            themeColor={BRAND}
            maximumDate={new Date()}
            placeholder="Seleccionar fecha"
          />
          <DateTimeField
            label="FPP por ecografía (opcional)"
            mode="date"
            value={embFppEco}
            onChange={setEmbFppEco}
            themeColor={BRAND}
            placeholder="Seleccionar fecha"
          />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputFieldGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Peso habitual (kg)</Text>
              <TextInput style={styles.textInput} placeholder="ej. 55" placeholderTextColor={commonColors.textTertiary} value={embPesoHabitual} onChangeText={setEmbPesoHabitual} keyboardType="numeric" />
            </View>
            <View style={[styles.inputFieldGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Talla (cm)</Text>
              <TextInput style={styles.textInput} placeholder="ej. 160" placeholderTextColor={commonColors.textTertiary} value={embTalla} onChangeText={setEmbTalla} keyboardType="numeric" />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputFieldGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Grupo sanguíneo</Text>
              <TextInput style={styles.textInput} placeholder="ej. O" placeholderTextColor={commonColors.textTertiary} value={embGrupo} onChangeText={setEmbGrupo} autoCapitalize="characters" />
            </View>
            <View style={[styles.inputFieldGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Factor RH</Text>
              <TextInput style={styles.textInput} placeholder="ej. +" placeholderTextColor={commonColors.textTertiary} value={embFactor} onChangeText={setEmbFactor} />
            </View>
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: ANTECEDENTE (RF-2.03) ── */}
      <AppModal
        visible={isAntModalVisible}
        onClose={() => setIsAntModalVisible(false)}
        title="Registrar antecedente"
        subtitle="Antecedente familiar o personal de la gestante."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsAntModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveAntecedente} style={{ flex: 1 }} themeColor={BRAND} loading={isSavingAnt} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.inputLabel}>Tipo</Text>
            <View style={styles.segmentRow}>
              {(['personal', 'familiar'] as const).map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[styles.segment, antTipo === tipo && styles.segmentActive]}
                  onPress={() => setAntTipo(tipo)}
                >
                  <Text style={[styles.segmentText, antTipo === tipo && styles.segmentTextActive]}>
                    {tipo === 'personal' ? 'Personal' : 'Familiar'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View>
            <Text style={styles.inputLabel}>Condición</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Ej. Diabetes, Hipertensión, Preeclampsia..."
              placeholderTextColor={commonColors.textTertiary}
              value={antCondicion}
              onChangeText={setAntCondicion}
            />
          </View>
          <View>
            <Text style={styles.inputLabel}>Detalle (opcional)</Text>
            <TextInput
              style={[styles.textInput, { height: 70 }]}
              placeholder="Notas adicionales..."
              placeholderTextColor={commonColors.textTertiary}
              multiline
              value={antDetalle}
              onChangeText={setAntDetalle}
            />
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: EDITAR TRATAMIENTO (RF-4.10) ── */}
      <AppModal
        visible={!!editTreat}
        onClose={() => setEditTreat(null)}
        title="Editar tratamiento"
        subtitle={editTreat?.nombre}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setEditTreat(null)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveEditTreat} style={{ flex: 1 }} themeColor={BRAND} loading={isUpdatingTreat} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View>
            <Text style={styles.inputLabel}>Dosis</Text>
            <TextInput style={styles.textInput} value={editDosis} onChangeText={setEditDosis} placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View>
            <Text style={styles.inputLabel}>Frecuencia</Text>
            <TextInput style={styles.textInput} value={editFrecuencia} onChangeText={setEditFrecuencia} placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View>
            <Text style={styles.inputLabel}>Indicaciones (opcional)</Text>
            <TextInput style={[styles.textInput, { height: 70 }]} multiline value={editIndicaciones} onChangeText={setEditIndicaciones} placeholderTextColor={commonColors.textTertiary} />
          </View>
        </View>
      </AppModal>

      {/* ── MODAL: SUSPENDER TRATAMIENTO (RF-4.10) ── */}
      <AppModal
        visible={!!suspendTreat}
        onClose={() => { setSuspendTreat(null); setMotivoSuspension(''); }}
        title="Suspender tratamiento"
        subtitle={suspendTreat?.nombre}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => { setSuspendTreat(null); setMotivoSuspension(''); }} style={{ flex: 1 }} />
            <AppButton title="Suspender" onPress={handleSuspendTreat} style={{ flex: 1, backgroundColor: semanticColors.danger }} loading={isUpdatingTreat} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <Text style={styles.suspendHint}>Esta acción detiene el tratamiento. Se requiere una justificación clínica.</Text>
          <View>
            <Text style={styles.inputLabel}>Motivo de suspensión</Text>
            <TextInput
              style={[styles.textInput, { height: 90 }]}
              placeholder="Ej. Reacción adversa, cambio de esquema..."
              placeholderTextColor={commonColors.textTertiary}
              multiline
              value={motivoSuspension}
              onChangeText={setMotivoSuspension}
            />
          </View>
        </View>
      </AppModal>

      {/* MODAL: RECOMENDAR CONTENIDO EDUCATIVO */}
      <AppModal
        visible={recommendVisible}
        onClose={() => setRecommendVisible(false)}
        title="Recomendar contenido"
        subtitle={`Envía un recurso educativo a ${patient.firstName} por el chat.`}
      >
        <View style={styles.recSearchBox}>
          <Search size={18} color={commonColors.textTertiary} />
          <TextInput
            style={styles.recSearchInput}
            value={recSearch}
            onChangeText={setRecSearch}
            placeholder="Buscar contenido…"
            placeholderTextColor={commonColors.textTertiary}
          />
          {recSearch ? (
            <TouchableOpacity onPress={() => setRecSearch('')} hitSlop={10}><X size={16} color={commonColors.textTertiary} /></TouchableOpacity>
          ) : null}
        </View>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          {catalogLoading ? (
            <Text style={styles.recEmpty}>Cargando contenido…</Text>
          ) : recFiltered.length === 0 ? (
            <Text style={styles.recEmpty}>No hay contenido disponible.</Text>
          ) : (
            recFiltered.map((c) => {
              const cm = categoryMeta(c.categoria);
              const CIcon = cm.icon;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={styles.recRow}
                  onPress={() => handleRecommend(c.id, c.titulo)}
                  disabled={isRecommending}
                  activeOpacity={0.7}
                >
                  <View style={[styles.recIcon, { backgroundColor: cm.bg }]}>
                    <CIcon size={18} color={cm.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.recTitle} numberOfLines={1}>{c.titulo}</Text>
                    <Text style={styles.recMeta}>{cm.label}{c.trimestre ? ` · ${c.trimestre}° trim` : ''}</Text>
                  </View>
                  <Send size={18} color={BRAND} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </AppModal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  recSearchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 44, marginBottom: spacing.md },
  recSearchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  recEmpty: { ...typography.bodySmall, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm2, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  recIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  recTitle: { ...typography.bodyMedium, color: commonColors.text, fontWeight: '600' },
  recMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  
  // Header gradient
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight : 24) : 0,
    paddingBottom: 36,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  iconBtnGlass: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
  },
  headerTitle: {
    ...typography.h3,
    color: commonColors.white,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    ...typography.h3,
    color: commonColors.white,
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.sm2,
  },
  patientName: {
    ...typography.h2,
    color: commonColors.white,
    marginBottom: 2,
  },
  patientSub: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.85)',
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: commonColors.white,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  riskDot: { width: 7, height: 7, borderRadius: 4 },
  riskPillText: {
    ...typography.overline,
    color: commonColors.text,
  },

  // KPIs (glass superpuestas)
  kpiWrapper: {
    paddingHorizontal: spacing.md,
    marginTop: -spacing.lg,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm2,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    ...typography.numericSm,
    color: commonColors.text,
    marginBottom: 2,
  },
  kpiLabel: {
    ...typography.overline,
    fontSize: 10,
    color: commonColors.textSecondary,
    textTransform: 'uppercase',
  },

  // Main Content
  mainContent: {
    flex: 1,
    marginTop: 8,
  },
  tabsWrapper: {
    maxHeight: 56,
  },
  tabsScrollContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    gap: spacing.sm,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.sm2,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
    ...shadows.card,
  },
  tabPillActive: {
    backgroundColor: BRAND,
  },
  tabText: {
    ...typography.buttonSm,
    color: commonColors.textSecondary,
  },
  tabTextActive: {
    color: commonColors.white,
  },
  scrollAreaWrapper: {
    flex: 1,
  },
  scrollArea: {
    padding: 16,
    paddingBottom: 80,
  },
  dataTabContainer: {
    marginTop: -4,
  },

  // Banner de estado clínico (lo crítico siempre arriba)
  statusBanner: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  statusTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  statusRiskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusRiskDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: commonColors.white },
  statusRiskText: { ...typography.buttonSm, color: commonColors.white },
  statusAlertChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
  },
  statusAlertText: { ...typography.caption, fontWeight: '700', color: semanticColors.danger },
  statusMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm2,
  },
  statusMetric: { flex: 1, alignItems: 'center', gap: 3 },
  statusMetricVal: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  statusMetricLbl: { ...typography.overline, fontSize: 10, color: commonColors.textSecondary },
  statusDivider: { width: 1, height: 34, backgroundColor: commonColors.borderLight },

  resumenCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: obstetraColors.primary,
  },
  resumenHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.xs2 },
  resumenTitle: {
    ...typography.label,
    fontWeight: '700',
    color: obstetraColors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resumenTexto: { ...typography.bodySm, color: commonColors.text, lineHeight: 20 },
  resumenAlertas: {
    marginTop: spacing.sm,
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: commonColors.border,
    paddingTop: spacing.sm,
  },
  resumenAlertaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resumenAlertaText: { ...typography.caption, color: commonColors.textSecondary, flex: 1 },
  section: {
    gap: 16,
  },

  // Cards
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: 8,
  },

  // Controls specific
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    marginTop: 8,
  },
  tamizajesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    ...shadows.card,
  },
  tamizajesIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tamizajesTitle: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, fontWeight: '700', color: commonColors.text },
  tamizajesDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  tamizajesIntro: { ...typography.bodySmall, color: commonColors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 6,
    ...coloredGlow(BRAND),
  },
  primaryActionText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: obstetraColors.onPrimary,
  },

  controlCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md2,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  ctrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctrlDateBox: {
    backgroundColor: obstetraColors.primaryLight,
    borderRadius: borderRadius.md,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  ctrlDay: {
    ...typography.h3,
    fontWeight: '800',
    color: BRAND,
    lineHeight: 22,
  },
  ctrlMonth: {
    ...typography.overline,
    fontSize: 10,
    color: commonColors.textSecondary,
  },
  ctrlTitleWrap: {
    flex: 1,
  },
  ctrlTitle: {
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  ctrlSubtitle: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    marginTop: 2,
  },
  ctrlMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
  },
  ctrlMetricBox: {
    alignItems: 'center',
  },
  ctrlMetricVal: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: commonColors.text,
  },
  ctrlMetricLbl: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
    marginTop: 4,
  },

  // Treatments specific
  pillCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md2,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  pillIconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: obstetraColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  pillInfo: {
    flex: 1,
  },
  pillName: {
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  pillDosis: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    marginTop: 2,
    marginBottom: 12,
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 3,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
  },
  progressHint: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 0.1,
    color: commonColors.textTertiary,
    marginTop: 6,
  },

  // Lab specific
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: semanticColors.dangerLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md2,
    marginTop: spacing.sm,
    alignItems: 'flex-start',
    borderLeftWidth: 4,
    borderLeftColor: semanticColors.danger,
  },
  alertBannerTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  alertBannerTitle: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: semanticColors.danger,
    marginBottom: 4,
  },
  alertBannerDesc: {
    ...typography.bodySmall,
    color: semanticColors.danger,
    lineHeight: 18,
  },

  // Vax specific
  vaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  vaxBorder: {
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  vaxIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: commonColors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vaxInfo: {
    flex: 1,
  },
  vaxName: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.text,
  },
  vaxWeek: {
    ...typography.overline,
    fontSize: 12,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
    marginTop: 2,
  },
  vaxStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  vaxStatusOk: { backgroundColor: semanticColors.successLight },
  vaxStatusPending: { backgroundColor: commonColors.surfaceAlt },
  vaxStatusText: {
    ...typography.overline,
    fontSize: 11,
    letterSpacing: 0.1,
    fontWeight: '700',
  },
  vaxStatusTextOk: { color: semanticColors.success },
  vaxStatusTextPending: { color: commonColors.textSecondary },
  
  emptyTextInfo: {
    ...typography.bodyMedium,
    color: commonColors.textSecondary,
    fontStyle: 'italic',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    ...typography.h2,
    color: commonColors.text,
    marginBottom: 8,
  },
  inputFieldGroup: {
    gap: 6,
    marginBottom: 12,
  },
  inputLabel: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  textInput: {
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    ...typography.body,
    color: commonColors.text,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: commonColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.label,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  saveBtnText: {
    ...typography.label,
    fontWeight: '600',
    color: obstetraColors.onPrimary,
  },

  // Antecedentes + acciones de tratamiento
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: BRAND,
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addChipText: { ...typography.micro, color: obstetraColors.onPrimary, textTransform: 'uppercase' },
  antRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 12 },
  antRowBorder: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  antCondicion: { ...typography.bodyMedium, color: commonColors.text },
  antMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  antDeleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: semanticColors.dangerLight },
  antEmpty: { ...typography.bodySmall, color: commonColors.textSecondary, padding: 16 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center', backgroundColor: commonColors.surface },
  segmentActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  segmentText: { ...typography.bodySmall, color: commonColors.textSecondary },
  segmentTextActive: { color: BRAND, fontFamily: typography.label.fontFamily },
  suspendBadge: {
    ...typography.micro,
    color: semanticColors.danger,
    backgroundColor: semanticColors.dangerLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    textTransform: 'uppercase',
    overflow: 'hidden',
  },
  treatActionsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  treatActionBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center', backgroundColor: commonColors.surface },
  treatSuspendBtn: { borderColor: semanticColors.dangerLight, backgroundColor: semanticColors.dangerLight },
  treatActionText: { ...typography.buttonSmall, color: commonColors.text },
  suspendHint: { ...typography.bodySmall, color: commonColors.textSecondary, lineHeight: 20 },
});
