import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, TextInput, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveMediaUrl } from '../../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, ChevronDown, ChevronUp, User, Stethoscope, Pill, FlaskConical,
  Syringe, AlertTriangle, Activity, Plus, ClipboardList, Trash2, BookOpen, Search, Send, X,
  Phone, MessageCircle, Sparkles, CalendarClock, Baby, HeartPulse, CalendarHeart, ChevronRight,
  Eye, Clock, ExternalLink, PlayCircle,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { HomeVisitsTab } from '../../../src/components/obstetra/HomeVisitsTab';
import { LineChartSvg } from '../../../src/components/ui/LineChartSvg';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton, useToast, DateTimeField, Accordion, PlainInput } from '../../../src/components/ui';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { spacing, borderRadius, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { typography } from '../../../src/theme/typography';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import {
  usePatientProfile, useCreateLabResult, useCreateVaccine, useCreateTreatment,
  useCreateAntecedente, useDeleteAntecedente, useUpdateTreatment, useUpdatePatient,
  useEducationCatalog, useRecommendContent,
  usePatientDangerSigns, useUpdateDangerSign,
} from '../../../src/services/api-queries';
import { categoryMeta, typeMeta, readingTime } from '../../../src/utils/educationMeta';
import { RichText } from '../../../src/components/ui/RichText';
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
  const { webShell } = useResponsive();
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

  // Resumen clínico: el relato detallado está colapsado por defecto.
  const [resumenExpanded, setResumenExpanded] = useState(false);

  // Recomendar contenido educativo a esta gestante
  const [recommendVisible, setRecommendVisible] = useState(false);
  const [recSearch, setRecSearch] = useState('');
  // Contenido seleccionado para previsualizar antes de enviar + nota opcional.
  const [recSelected, setRecSelected] = useState<any | null>(null);
  const [recNota, setRecNota] = useState('');
  // Controla si el cuerpo completo del contenido está expandido en el paso de envío.
  const [recBodyExpanded, setRecBodyExpanded] = useState(false);
  // Modo de la pantalla de detalle: 'enviar' (con nota + maqueta de chat) o
  // 'leer' (solo lectura del recurso, abierto desde el botón "Vista previa").
  const [recMode, setRecMode] = useState<'enviar' | 'leer'>('enviar');
  const { data: catalog = [], isLoading: catalogLoading } = useEducationCatalog();
  const { mutate: recommendContent, isPending: isRecommending } = useRecommendContent();

  const debouncedRecSearch = useDebouncedValue(recSearch, 400);
  const recFiltered = React.useMemo(() => {
    const q = debouncedRecSearch.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((c) => `${c.titulo} ${c.contenido}`.toLowerCase().includes(q));
  }, [catalog, debouncedRecSearch]);

  const closeRecommend = () => {
    setRecommendVisible(false);
    setRecSearch('');
    setRecSelected(null);
    setRecNota('');
    setRecBodyExpanded(false);
    setRecMode('enviar');
  };

  // Abre el detalle de un recurso: 'leer' = solo lectura (botón Vista previa),
  // 'enviar' = flujo de recomendación con nota y maqueta del chat.
  const openRecDetail = (content: any, mode: 'enviar' | 'leer') => {
    setRecSelected(content);
    setRecMode(mode);
    setRecBodyExpanded(mode === 'leer');
  };

  const backToRecList = () => {
    setRecSelected(null);
    setRecNota('');
    setRecBodyExpanded(false);
    setRecMode('enviar');
  };

  const handleRecommend = () => {
    if (!patient || isRecommending || !recSelected) return;
    recommendContent(
      { gestanteId: patient.id, contentId: recSelected.id, nota: recNota.trim() || undefined },
      {
        onSuccess: () => {
          toast.success('Contenido asignado', `"${recSelected.titulo}" se agregó a la sección Educación de ${patient.firstName} y se le avisó por el chat.`);
          closeRecommend();
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
              {/* Acción rápida: registrar control desde la cabecera (issue #10),
                  el flujo más frecuente del obstetra. */}
              <TouchableOpacity
                style={styles.iconBtnGlass}
                onPress={() => router.push({ pathname: '/(obstetra)/control/nuevo', params: { patientId: patient.id } } as any)}
                accessibilityLabel="Registrar nuevo control"
                accessibilityRole="button"
              >
                <Stethoscope size={20} color={commonColors.white} />
              </TouchableOpacity>
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
            {/* El nivel de riesgo se muestra (con jerarquía) en el banner de estado
                del tab Resumen; aquí se omite para no duplicarlo (issue #3). */}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* KPIs de Semana/Trimestre/FPP/IMC eliminados aquí: duplicaban el banner
          de estado clínico del tab Resumen (issue #2/#3). El estado glanceable
          vive ahora en un solo lugar (statusBanner), con mejor jerarquía. */}

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
          contentContainerStyle={[styles.scrollArea, webShell && styles.scrollAreaWeb]}
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
                    <Text style={styles.statusMetricVal}>
                      {patient.currentWeek ? `${patient.currentWeek} sem` : '—'}
                    </Text>
                    <Text style={styles.statusMetricLbl}>
                      {patient.currentTrimester ? `Edad gest. · ${patient.currentTrimester}° trim.` : 'Edad gest.'}
                    </Text>
                  </View>
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <CalendarHeart size={15} color={obstetraColors.primary} />
                    <Text style={styles.statusMetricVal}>
                      {patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
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
                  <View style={styles.statusDivider} />
                  <View style={styles.statusMetric}>
                    <Activity size={15} color={obstetraColors.primary} />
                    <Text style={styles.statusMetricVal}>{displayImc}</Text>
                    <Text style={styles.statusMetricLbl}>IMC</Text>
                  </View>
                </View>
              </View>

              {/* 2. RESUMEN CLÍNICO INTELIGENTE — alertas accionables + destacados + relato */}
              {patient.resumenClinico ? (
                <View style={[styles.resumenCard, designTokens.cardShadow]}>
                  <View style={styles.resumenHeader}>
                    <View style={styles.resumenIconWrap}>
                      <Sparkles size={15} color={obstetraColors.primary} />
                    </View>
                    <Text style={styles.resumenTitle}>Resumen clínico</Text>
                  </View>

                  {/* a) Alertas accionables primero (lo que requiere atención) */}
                  {patient.resumenClinico.alertas?.length > 0 && (
                    <View style={styles.resumenAlertas}>
                      {patient.resumenClinico.alertas.map((a: string, i: number) => (
                        <View key={i} style={styles.resumenAlertaRow}>
                          <AlertTriangle size={14} color={riskColors.riskRed} />
                          <Text style={styles.resumenAlertaText}>{a}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* b) Destacados clínicos en una rejilla legible */}
                  {patient.resumenClinico.destacados && (
                    <View style={styles.resumenDestacados}>
                      {patient.resumenClinico.destacados.anemia ? (
                        <View style={styles.resumenChip}>
                          <Text style={styles.resumenChipLabel}>Anemia</Text>
                          <Text style={[styles.resumenChipValue, { color: patient.resumenClinico.destacados.anemia === 'normal' ? semanticColors.success : riskColors.riskYellow }]}>
                            {patient.resumenClinico.destacados.anemia === 'normal' ? 'Sin anemia' : patient.resumenClinico.destacados.anemia}
                          </Text>
                        </View>
                      ) : null}
                      {patient.resumenClinico.destacados.adherencia != null ? (
                        <View style={styles.resumenChip}>
                          <Text style={styles.resumenChipLabel}>Adherencia</Text>
                          <Text style={[styles.resumenChipValue, { color: patient.resumenClinico.destacados.adherencia >= 80 ? semanticColors.success : patient.resumenClinico.destacados.adherencia >= 50 ? riskColors.riskYellow : riskColors.riskRed }]}>
                            {patient.resumenClinico.destacados.adherencia}%
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.resumenChip}>
                        <Text style={styles.resumenChipLabel}>Controles</Text>
                        <Text style={styles.resumenChipValue}>{(patient.controls || []).length}</Text>
                      </View>
                    </View>
                  )}

                  {/* c) Relato detallado (secundario, expandible) */}
                  {patient.resumenClinico.texto ? (
                    <>
                      <TouchableOpacity style={styles.resumenToggle} onPress={() => setResumenExpanded((v) => !v)} activeOpacity={0.7}>
                        <Text style={styles.resumenToggleText}>{resumenExpanded ? 'Ocultar detalle' : 'Ver detalle completo'}</Text>
                        <ChevronDown size={15} color={obstetraColors.primary} style={resumenExpanded ? { transform: [{ rotate: '180deg' }] } : undefined} />
                      </TouchableOpacity>
                      {resumenExpanded && <Text style={styles.resumenTexto}>{patient.resumenClinico.texto}</Text>}
                    </>
                  ) : null}
                </View>
              ) : null}

              {/* 3. DETALLE EN ACORDEONES — Embarazo abierto, el resto plegado */}
              <Accordion title="Datos del embarazo" icon={CalendarHeart} accentColor={BRAND} defaultOpen
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={openEmbModal} hitSlop={6}>
                    <Plus size={13} color={BRAND} />
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
                    <Plus size={13} color={BRAND} />
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
                {/* Hb II/III solo muestran "Pendiente" cuando ya corresponde por EG
                    (≥ sem. 25 para la II, ≥ sem. 33 para la III) para no meter ruido. */}
                <Fila
                  label="Hemoglobina II"
                  value={lab.hemoglobina2 ? `${lab.hemoglobina2} g/dL` : (Number(patient.currentWeek) >= 25 ? 'Pendiente' : undefined)}
                />
                <Fila
                  label="Hemoglobina III"
                  value={lab.hemoglobina3 ? `${lab.hemoglobina3} g/dL` : (Number(patient.currentWeek) >= 33 ? 'Pendiente' : undefined)}
                />
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
        <View style={{ gap: 10 }}>
          <View>
            <Text style={styles.inputLabel}>Tipo de examen</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 8 }}>
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
            <PlainInput
              placeholder="O escribe otro tipo de examen…"
              value={labTipo}
              onChangeText={setLabTipo}
              themeColor={BRAND}
            />
          </View>

          <PlainInput label="Número de toma" placeholder="Ej. 1, 2, 3" keyboardType="numeric" value={labToma} onChangeText={setLabToma} themeColor={BRAND} />
          <PlainInput label="Valor numérico (opcional)" placeholder="Ej. 11.5" keyboardType="numeric" value={labValorNum} onChangeText={setLabValorNum} themeColor={BRAND} />
          <PlainInput label="Valor texto (opcional)" placeholder="Ej. Normal, Reactivo…" value={labValorText} onChangeText={setLabValorText} themeColor={BRAND} />
          <PlainInput label="Unidad (opcional)" placeholder="Ej. g/dL, mg/dL" value={labUnidad} onChangeText={setLabUnidad} themeColor={BRAND} />
          <PlainInput label="Resultado (opcional)" placeholder="Ej. Normal, Anemia leve…" value={labResultado} onChangeText={setLabResultado} themeColor={BRAND} />
          <PlainInput label="Observaciones" placeholder="Notas adicionales…" multiline value={labObs} onChangeText={setLabObs} themeColor={BRAND} />
        </View>
      </AppModal>

      {/* ── MODAL: REGISTRAR VACUNA ── */}
      <AppModal
        visible={isVaxModalVisible}
        onClose={() => setIsVaxModalVisible(false)}
        title="Registrar vacunación"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsVaxModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveVax} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingVax} loading={isSavingVax} />
          </>
        }
      >
        <View style={{ gap: 10 }}>
          <PlainInput label="Nombre de la vacuna" placeholder="Ej. Influenza, Tétanos…" value={vaxNombre} onChangeText={setVaxNombre} themeColor={BRAND} />
          <PlainInput label="Número de dosis" placeholder="Ej. 1, 2" keyboardType="numeric" value={vaxDosis} onChangeText={setVaxDosis} themeColor={BRAND} />
          <PlainInput label="Semana de embarazo de aplicación" placeholder="Ej. 20" keyboardType="numeric" value={vaxSemana} onChangeText={setVaxSemana} themeColor={BRAND} />

          <View>
            <Text style={styles.inputLabel}>Estado</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              {['aplicada', 'pendiente'].map((est) => (
                <TouchableOpacity
                  key={est}
                  style={[styles.segment, { flex: 1 }, vaxEstado === est && styles.segmentActive]}
                  onPress={() => setVaxEstado(est)}
                >
                  <Text style={[styles.segmentText, vaxEstado === est && styles.segmentTextActive]}>
                    {est === 'aplicada' ? 'Aplicada' : 'Pendiente'}
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
        title="Asignar tratamiento"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsTreatModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Asignar" onPress={handleSaveTreat} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingTreat} loading={isSavingTreat} />
          </>
        }
      >
        <View style={{ gap: 10 }}>
          <PlainInput label="Medicamento" placeholder="Ej. Sulfato ferroso + ácido fólico" value={treatNombre} onChangeText={setTreatNombre} themeColor={BRAND} />
          <PlainInput label="Dosis" placeholder="Ej. 1 tableta, 60 mg" value={treatDosis} onChangeText={setTreatDosis} themeColor={BRAND} />
          <PlainInput label="Frecuencia" placeholder="Ej. Diario, cada 8 horas" value={treatFrecuencia} onChangeText={setTreatFrecuencia} themeColor={BRAND} />
          <PlainInput label="Horario de recordatorio" placeholder="Ej. 08:00" value={treatHora} onChangeText={setTreatHora} themeColor={BRAND} />
          <PlainInput label="Duración (días)" placeholder="Ej. 30" keyboardType="numeric" value={treatDuracion} onChangeText={setTreatDuracion} themeColor={BRAND} />
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
            <View style={{ flex: 1 }}>
              <PlainInput label="Peso habitual (kg)" placeholder="Ej. 55" value={embPesoHabitual} onChangeText={setEmbPesoHabitual} keyboardType="numeric" themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Talla (m)" placeholder="Ej. 1.60" value={embTalla} onChangeText={setEmbTalla} keyboardType="numeric" themeColor={BRAND} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Grupo sanguíneo" placeholder="Ej. O" value={embGrupo} onChangeText={setEmbGrupo} autoCapitalize="characters" themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Factor RH" placeholder="Ej. +" value={embFactor} onChangeText={setEmbFactor} themeColor={BRAND} />
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
          <PlainInput label="Condición" placeholder="Ej. Diabetes, hipertensión, preeclampsia…" value={antCondicion} onChangeText={setAntCondicion} themeColor={BRAND} />
          <PlainInput label="Detalle (opcional)" placeholder="Notas adicionales…" multiline value={antDetalle} onChangeText={setAntDetalle} themeColor={BRAND} />
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
        <View style={{ gap: 10 }}>
          <PlainInput label="Dosis" value={editDosis} onChangeText={setEditDosis} themeColor={BRAND} />
          <PlainInput label="Frecuencia" value={editFrecuencia} onChangeText={setEditFrecuencia} themeColor={BRAND} />
          <PlainInput label="Indicaciones (opcional)" multiline value={editIndicaciones} onChangeText={setEditIndicaciones} themeColor={BRAND} />
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
        <View style={{ gap: 10 }}>
          <Text style={styles.suspendHint}>Esta acción detiene el tratamiento. Se requiere una justificación clínica.</Text>
          <PlainInput
            label="Motivo de suspensión"
            placeholder="Ej. Reacción adversa, cambio de esquema…"
            multiline
            value={motivoSuspension}
            onChangeText={setMotivoSuspension}
            themeColor={BRAND}
          />
        </View>
      </AppModal>

      {/* MODAL: RECOMENDAR CONTENIDO EDUCATIVO (lista → lectura / envío) */}
      <AppModal
        visible={recommendVisible}
        onClose={closeRecommend}
        title={!recSelected
          ? 'Recomendar contenido'
          : recMode === 'leer' ? 'Vista previa del contenido' : 'Revisar y enviar'}
        subtitle={!recSelected
          ? `Elige un recurso educativo para ${patient.firstName}.`
          : recMode === 'leer'
            ? 'Así se lee el recurso. Envíalo cuando estés lista.'
            : `Revisa el contenido antes de enviarlo a ${patient.firstName}.`}
        footer={recSelected ? (
          <>
            <AppButton title="Volver" variant="outline" onPress={backToRecList} style={{ flex: 1 }} />
            <AppButton
              title={recMode === 'leer' ? 'Recomendar' : 'Enviar al chat'}
              onPress={recMode === 'leer' ? () => setRecMode('enviar') : handleRecommend}
              style={{ flex: 1 }}
              themeColor={BRAND}
              loading={isRecommending}
              disabled={isRecommending}
            />
          </>
        ) : undefined}
      >
        {!recSelected ? (
          <>
            <View style={styles.recSearchBox}>
              <Search size={18} color={commonColors.textTertiary} />
              <TextInput
                style={styles.recSearchInput}
                value={recSearch}
                onChangeText={setRecSearch}
                placeholder="Buscar por título o categoría…"
                placeholderTextColor={commonColors.textTertiary}
              />
              {recSearch ? (
                <TouchableOpacity onPress={() => setRecSearch('')} hitSlop={10}><X size={16} color={commonColors.textTertiary} /></TouchableOpacity>
              ) : null}
            </View>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {catalogLoading ? (
                <Text style={styles.recEmpty}>Cargando contenido…</Text>
              ) : recFiltered.length === 0 ? (
                <Text style={styles.recEmpty}>No se encontró contenido con esa búsqueda.</Text>
              ) : (
                recFiltered.map((c) => {
                  const cm = categoryMeta(c.categoria);
                  const tm = typeMeta(c.tipo);
                  const CIcon = cm.icon;
                  const thumb = resolveMediaUrl(c.thumbnailUrl);
                  return (
                    <View key={c.id} style={styles.recRow}>
                      <TouchableOpacity
                        style={styles.recRowMain}
                        onPress={() => openRecDetail(c, 'enviar')}
                        activeOpacity={0.7}
                      >
                        {thumb ? (
                          <Image source={{ uri: thumb }} style={styles.recThumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.recIcon, { backgroundColor: cm.bg }]}>
                            <CIcon size={20} color={cm.color} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.recRowCat, { color: cm.color }]} numberOfLines={1}>{cm.label}</Text>
                          <Text style={styles.recTitle} numberOfLines={2}>{c.titulo}</Text>
                          <Text style={styles.recMeta}>{tm.label}{c.trimestre ? ` · ${c.trimestre}° trim` : ''} · {readingTime(c.contenido, c.duracionMin)}</Text>
                        </View>
                      </TouchableOpacity>
                      {/* Botón rápido para LEER el recurso sin entrar al flujo de envío */}
                      <TouchableOpacity
                        style={styles.recPreviewIconBtn}
                        onPress={() => openRecDetail(c, 'leer')}
                        accessibilityLabel={`Vista previa de ${c.titulo}`}
                        accessibilityRole="button"
                        hitSlop={8}
                      >
                        <Eye size={18} color={BRAND} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </>
        ) : (
          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
            {(() => {
              const cm = categoryMeta(recSelected.categoria);
              const tm = typeMeta(recSelected.tipo);
              const CIcon = cm.icon;
              const TIcon = tm.icon;
              const thumb = resolveMediaUrl(recSelected.thumbnailUrl);
              const media = resolveMediaUrl(recSelected.mediaUrl);
              const isPlayable = recSelected.tipo === 'video' || recSelected.tipo === 'audio';
              const body = (recSelected.contenido || '').trim();
              const isLong = body.length > 320;
              const showFullBody = recBodyExpanded || !isLong;
              const bodyPreview = showFullBody ? body : `${body.slice(0, 320).trimEnd()}…`;
              return (
                <>
                  {/* Tarjeta "artículo": portada o ícono + categoría + título + meta */}
                  <View style={styles.recArticleCard}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.recArticleCover} resizeMode="cover" />
                    ) : (
                      <View style={[styles.recArticleBanner, { backgroundColor: cm.bg }]}>
                        <CIcon size={30} color={cm.color} />
                      </View>
                    )}
                    <View style={styles.recArticleBody}>
                      <View style={[styles.recCatBadge, { backgroundColor: cm.bg }]}>
                        <CIcon size={13} color={cm.color} />
                        <Text style={[styles.recCatBadgeText, { color: cm.color }]}>{cm.label}</Text>
                      </View>
                      <Text style={styles.recArticleTitle}>{recSelected.titulo}</Text>
                      <View style={styles.recArticleMetaRow}>
                        <View style={styles.recMetaChip}>
                          <TIcon size={12} color={commonColors.textSecondary} />
                          <Text style={styles.recMetaChipText}>{tm.label}</Text>
                        </View>
                        <View style={styles.recMetaChip}>
                          <Clock size={12} color={commonColors.textSecondary} />
                          <Text style={styles.recMetaChipText}>{readingTime(body, recSelected.duracionMin)}</Text>
                        </View>
                        {recSelected.trimestre ? (
                          <View style={styles.recMetaChip}>
                            <Text style={styles.recMetaChipText}>{recSelected.trimestre}° trimestre</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  {/* Recurso multimedia (si existe): abre en el navegador/app */}
                  {media ? (
                    <TouchableOpacity style={styles.recMediaCard} onPress={() => Linking.openURL(media)} activeOpacity={0.85}>
                      {isPlayable ? <PlayCircle size={20} color={BRAND} /> : <ExternalLink size={18} color={BRAND} />}
                      <Text style={styles.recMediaText}>
                        {recSelected.tipo === 'video' ? 'Ver video' : recSelected.tipo === 'audio' ? 'Escuchar audio' : 'Abrir recurso'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Cuerpo real del contenido (EL FIX): lectura con formato RichText */}
                  <View>
                    <Text style={styles.recSectionLabel}>Contenido</Text>
                    {body ? (
                      <View style={styles.recBodyWrap}>
                        <RichText content={bodyPreview} accentColor={cm.color} />
                        {isLong ? (
                          <TouchableOpacity
                            style={styles.recExpandBtn}
                            onPress={() => setRecBodyExpanded((v) => !v)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.recExpandText, { color: BRAND }]}>
                              {showFullBody ? 'Ver menos' : 'Ver contenido completo'}
                            </Text>
                            {showFullBody
                              ? <ChevronUp size={16} color={BRAND} />
                              : <ChevronDown size={16} color={BRAND} />}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={styles.recEmptyBody}>Este recurso aún no tiene contenido de lectura.</Text>
                    )}
                  </View>

                  {/* Paso de ENVÍO: nota opcional + maqueta de cómo lo verá en el chat */}
                  {recMode === 'enviar' ? (
                    <>
                      <View style={styles.recDivider} />
                      <PlainInput
                        label="Nota para la gestante (opcional)"
                        placeholder="Ej. Léelo antes de tu próxima cita."
                        multiline
                        value={recNota}
                        onChangeText={setRecNota}
                        themeColor={BRAND}
                      />
                      <View>
                        <Text style={styles.recSectionLabel}>Así lo verá en su chat</Text>
                        <View style={styles.recPreviewBubble}>
                          <Text style={styles.recPreviewNote}>
                            📘 Tu obstetra te recomienda{recNota.trim() ? ': ' : ' leer: '}"{recSelected.titulo}"{recNota.trim() ? `\n\n${recNota.trim()}` : ''}
                          </Text>
                          <View style={styles.recPreviewCard}>
                            <View style={[styles.recIcon, { backgroundColor: cm.bg, borderRadius: borderRadius.md }]}>
                              <CIcon size={20} color={cm.color} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.recMeta, { color: cm.color }]} numberOfLines={1}>{cm.label}</Text>
                              <Text style={styles.recTitle} numberOfLines={2}>{recSelected.titulo}</Text>
                              <Text style={styles.recMeta}>{tm.label} · {readingTime(body, recSelected.duracionMin)} · Toca para leer</Text>
                            </View>
                            <ChevronRight size={18} color={commonColors.textTertiary} />
                          </View>
                        </View>
                      </View>
                    </>
                  ) : null}
                </>
              );
            })()}
          </ScrollView>
        )}
      </AppModal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  recSearchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 44, marginBottom: spacing.md },
  recSearchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  recEmpty: { ...typography.bodySmall, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  recRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingVertical: spacing.xs2 },
  recIcon: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recThumb: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, flexShrink: 0 },
  recRowCat: { ...typography.overline, fontSize: 10, marginBottom: 2 },
  recTitle: { ...typography.bodyMedium, color: commonColors.text, fontWeight: '600' },
  recMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  // Botón rápido "Vista previa" (ícono ojo) por fila de la lista.
  recPreviewIconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: obstetraColors.primaryLight, flexShrink: 0 },
  // Tarjeta tipo "artículo" en el detalle del recurso.
  recArticleCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: commonColors.borderLight, overflow: 'hidden', ...shadows.card },
  recArticleCover: { width: '100%', height: 130, backgroundColor: commonColors.surfaceAlt },
  recArticleBanner: { width: '100%', height: 88, alignItems: 'center', justifyContent: 'center' },
  recArticleBody: { padding: spacing.md, gap: spacing.xs },
  recCatBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  recCatBadgeText: { ...typography.overline, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  recArticleTitle: { ...typography.h3, color: commonColors.text, marginTop: 2 },
  recArticleMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs2 },
  recMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  recMetaChipText: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },
  // Recurso multimedia.
  recMediaCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm2, borderWidth: 1, borderColor: commonColors.border },
  recMediaText: { ...typography.bodyMedium, fontWeight: '700', color: BRAND },
  // Cuerpo del contenido (lectura).
  recSectionLabel: { ...typography.overline, color: commonColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  recBodyWrap: { backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  recEmptyBody: { ...typography.bodySmall, color: commonColors.textTertiary, fontStyle: 'italic', backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  recExpandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  recExpandText: { ...typography.caption, fontWeight: '700' },
  recDivider: { height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.xs },
  recPreviewBubble: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.sm2, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  recPreviewNote: { ...typography.bodySmall, color: commonColors.text, marginBottom: spacing.sm, lineHeight: 19 },
  recPreviewCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.sm2, borderWidth: 1, borderColor: commonColors.border },
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
    backgroundColor: commonColors.onColorSurface,
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
    backgroundColor: commonColors.onColorSurfaceStrong,
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
    color: commonColors.onColorTextSoft,
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
  scrollAreaWeb: { width: '100%' },
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
  },
  resumenHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  resumenIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  resumenTitle: {
    ...typography.bodyMedium,
    fontWeight: '700',
    color: commonColors.text,
  },
  resumenTexto: { ...typography.bodySm, color: commonColors.textSecondary, lineHeight: 21, marginTop: spacing.sm },
  resumenAlertas: {
    gap: 8,
    marginBottom: spacing.sm,
  },
  resumenAlertaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: riskColors.riskRedLight,
    borderRadius: borderRadius.md,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm2,
  },
  resumenAlertaText: { ...typography.bodySm, color: commonColors.text, flex: 1, lineHeight: 19 },
  resumenDestacados: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  resumenChip: {
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm2,
    minWidth: 92,
  },
  resumenChipLabel: { ...typography.overline, fontSize: 10, color: commonColors.textTertiary, marginBottom: 2 },
  resumenChipValue: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  resumenToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm, alignSelf: 'flex-start' },
  resumenToggleText: { ...typography.caption, fontWeight: '700', color: obstetraColors.primary },
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
  inputLabel: {
    ...typography.label,
    fontWeight: '500',
    color: commonColors.text,
    marginBottom: spacing.xs,
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
    gap: 3,
    backgroundColor: obstetraColors.primaryLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addChipText: { ...typography.caption, fontWeight: '700', color: BRAND },
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
