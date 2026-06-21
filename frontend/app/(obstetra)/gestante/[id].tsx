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
  Phone, CalendarClock, Baby, HeartPulse, CalendarHeart, ChevronRight,
  Eye, Clock, ExternalLink, PlayCircle, CheckCircle2, Droplet, Beaker, ShieldCheck,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { HomeVisitsTab } from '../../../src/components/obstetra/HomeVisitsTab';
import { LineChartSvg } from '../../../src/components/ui/LineChartSvg';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton, useToast, DateTimeField, Accordion, PlainInput, ToggleTabs, PrenatalRibbon } from '../../../src/components/ui';
import { WhatsAppIcon } from '../../../src/components/ui/WhatsAppIcon';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { spacing, borderRadius, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { typography } from '../../../src/theme/typography';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import {
  usePatientProfile, useCreateLabResult, useCreateVaccine, useCreateTreatment,
  useCreateAntecedente, useDeleteAntecedente, useUpdateTreatment, useUpdatePatient,
  useEducationCatalog, useRecommendContent,
  usePatientDangerSigns, useUpdateDangerSign, useHomeVisits,
} from '../../../src/services/api-queries';
import { categoryMeta, typeMeta, readingTime } from '../../../src/utils/educationMeta';
import { RichText } from '../../../src/components/ui/RichText';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { useFeatureFlags } from '../../../src/hooks/useFeatureFlags';
import { AlturaUterinaChart } from '../../../src/components/shared/AlturaUterinaChart';
import { confirmAction } from '../../../src/utils/confirm';
import { openWhatsApp } from '../../../src/utils/whatsapp';
import { goBack } from '../../../src/utils/navigation';

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

/**
 * Fila de resultado de laboratorio con interpretación clínica visible:
 * nombre del examen + qué mide (subtítulo), valor medido y una etiqueta de
 * estado con color (Normal / Alerta / Pendiente). Hace que la sección Clínico
 * se entienda de un vistazo, sin conocer los rangos de memoria.
 */
function LabRow({
  label, hint, value, state, stateLabel, isLast = false,
}: {
  label: string;
  hint?: string;
  value?: string | null;
  state: 'normal' | 'alerta' | 'pendiente' | 'info';
  stateLabel: string;
  isLast?: boolean;
}) {
  const meta = {
    normal: { color: semanticColors.success, bg: semanticColors.successLight },
    alerta: { color: semanticColors.danger, bg: semanticColors.dangerLight },
    pendiente: { color: commonColors.textTertiary, bg: commonColors.surfaceAlt },
    info: { color: semanticColors.info, bg: semanticColors.infoLight },
  }[state];
  return (
    <View style={[labRowStyles.row, !isLast && labRowStyles.border]}>
      <View style={labRowStyles.left}>
        <Text style={labRowStyles.label}>{label}</Text>
        {hint ? <Text style={labRowStyles.hint}>{hint}</Text> : null}
      </View>
      <View style={labRowStyles.right}>
        {value ? <Text style={labRowStyles.value} numberOfLines={2}>{value}</Text> : null}
        <View style={[labRowStyles.pill, { backgroundColor: meta.bg }]}>
          <Text style={[labRowStyles.pillText, { color: meta.color }]} numberOfLines={1}>{stateLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const labRowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, gap: 10 },
  border: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  // Etiqueta (izquierda) y estado (derecha) comparten el ancho sin encimarse:
  // ambas pueden encoger y su texto se ajusta en varias líneas.
  left: { flex: 1.2, minWidth: 0 },
  label: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.text },
  hint: { ...typography.caption, color: commonColors.textTertiary, marginTop: 1 },
  right: { flexShrink: 1, alignItems: 'flex-end', gap: 4, minWidth: 0 },
  value: { ...typography.bodySmall, fontWeight: '700', color: commonColors.text, textAlign: 'right' },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, alignSelf: 'flex-end' },
  pillText: { ...typography.overline, fontSize: 10, fontWeight: '700' },
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

/**
 * Clasifica un signo vital de un control prenatal como normal o de alerta, para
 * que el obstetra detecte de un vistazo lo que requiere atención.
 * Devuelve 'warn' (fuera de rango) o 'ok'. Rangos de referencia obstétrica.
 */
function vitalStatus(
  type: 'pa' | 'fcf' | 'temp' | 'pulso',
  c: any,
): 'ok' | 'warn' {
  if (type === 'pa') {
    const s = c.presionSistolica, d = c.presionDiastolica;
    if (s == null || d == null) return 'ok';
    return s >= 140 || d >= 90 || s < 90 ? 'warn' : 'ok';
  }
  if (type === 'fcf') {
    const v = c.fetalHeartRate;
    if (v == null) return 'ok';
    return v < 110 || v > 160 ? 'warn' : 'ok';
  }
  if (type === 'temp') {
    const v = c.temperatura;
    if (v == null) return 'ok';
    return v >= 38 || v < 35 ? 'warn' : 'ok';
  }
  if (type === 'pulso') {
    const v = c.pulsoMaterno;
    if (v == null) return 'ok';
    return v < 60 || v > 100 ? 'warn' : 'ok';
  }
  return 'ok';
}

/** Estado de interpretación de un resultado de laboratorio. */
type LabState = 'normal' | 'alerta' | 'pendiente' | 'info';

/** Clasifica la hemoglobina (corregida por altitud) según umbrales OMS/MINSA. */
function classifyHb(corrected: number | null): { state: LabState; label: string } {
  if (corrected == null) return { state: 'pendiente', label: 'Pendiente' };
  if (corrected < 7) return { state: 'alerta', label: 'Anemia severa' };
  if (corrected < 10) return { state: 'alerta', label: 'Anemia moderada' };
  if (corrected < 11) return { state: 'alerta', label: 'Anemia leve' };
  return { state: 'normal', label: 'Normal' };
}

/**
 * Interpreta un resultado cualitativo (VIH, VDRL, Hepatitis B, orina, PAP).
 * Reconoce reactivo/positivo/anormal como alerta; no reactivo/negativo/normal
 * como normal. Sin dato → pendiente.
 */
function classifyQualitative(value?: string | null): { state: LabState; label: string } {
  if (!value || !String(value).trim()) return { state: 'pendiente', label: 'Pendiente' };
  const v = String(value).toLowerCase();
  if (/(no reactivo|negativo|normal|no reactiv)/.test(v)) return { state: 'normal', label: value };
  if (/(reactivo|positivo|anormal|alterad|patolog)/.test(v)) return { state: 'alerta', label: value };
  return { state: 'info', label: value };
}

/**
 * Catálogo de exámenes de laboratorio del control prenatal (MINSA). Define para
 * cada uno cómo se captura: 'numeric' (un valor + unidad) o 'qualitative'
 * (opciones reactivo/no reactivo, normal/anormal). Simplifica el formulario:
 * la obstetra ya no decide entre 4 campos de valor.
 */
const LAB_EXAM_TYPES: {
  tipo: string;
  label: string;
  kind: 'numeric' | 'qualitative';
  unidad?: string;
  placeholder?: string;
  options?: string[];
  hint?: string;
}[] = [
  { tipo: 'hemoglobina', label: 'Hemoglobina', kind: 'numeric', unidad: 'g/dL', placeholder: 'Ej. 11.5', hint: 'Se corrige por la altitud automáticamente para evaluar anemia.' },
  { tipo: 'glucemia', label: 'Glucemia', kind: 'numeric', unidad: 'mg/dL', placeholder: 'Ej. 85' },
  { tipo: 'vih', label: 'VIH', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'vdrl', label: 'Sífilis (VDRL/RPR)', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'hepatitis_b', label: 'Hepatitis B', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'orina', label: 'Orina', kind: 'qualitative', options: ['Normal', 'Anormal'], hint: 'Anormal puede indicar infección urinaria.' },
  { tipo: 'pap', label: 'Papanicolaou', kind: 'qualitative', options: ['Normal', 'Anormal'] },
];

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
  // Sub-vista dentro de "Seguimiento": evita que las visitas domiciliarias
  // queden enterradas tras una lista larga de controles.
  const [seguimientoView, setSeguimientoView] = useState<'controles' | 'visitas'>('controles');
  // Controles expandidos manualmente (el más reciente arranca abierto).
  const [expandedControls, setExpandedControls] = useState<Record<string, boolean>>({});

  const { data: patient, isLoading } = usePatientProfile(id || '');
  // Conteo de visitas domiciliarias para el badge de la sub-pestaña (React Query
  // deduplica con el que usa HomeVisitsTab, no genera petición extra).
  const { data: homeVisitsData } = useHomeVisits(id || '');
  const homeVisitsCount = Array.isArray(homeVisitsData) ? homeVisitsData.length : 0;

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

  // Editar antecedentes obstétricos (G/P/C/A) — fórmula obstétrica
  const [isObsModalVisible, setIsObsModalVisible] = useState(false);
  const [obsGestaciones, setObsGestaciones] = useState('');
  const [obsPartos, setObsPartos] = useState('');
  const [obsCesareas, setObsCesareas] = useState('');
  const [obsAbortos, setObsAbortos] = useState('');

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
  // Contenido seleccionado para previsualizar antes de enviar + nota opcional.
  const [recSelected, setRecSelected] = useState<any | null>(null);
  const [recNota, setRecNota] = useState('');
  // Controla si el cuerpo completo del contenido está expandido en el detalle.
  const [recBodyExpanded, setRecBodyExpanded] = useState(false);
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
  };

  // Abre el detalle del recurso (vista previa completa + envío en un paso).
  // El cuerpo arranca expandido para ver el contenido completo tal como lo verá
  // la gestante.
  const openRecDetail = (content: any) => {
    setRecSelected(content);
    setRecBodyExpanded(true);
  };

  const backToRecList = () => {
    setRecSelected(null);
    setRecNota('');
    setRecBodyExpanded(false);
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

  const openObsModal = () => {
    if (!patient) return;
    setObsGestaciones(patient.gestaciones != null ? String(patient.gestaciones) : '');
    setObsPartos(patient.partos != null ? String(patient.partos) : '');
    setObsCesareas(patient.cesareas != null ? String(patient.cesareas) : '');
    setObsAbortos(patient.abortos != null ? String(patient.abortos) : '');
    setIsObsModalVisible(true);
  };

  const handleSaveObstetricos = () => {
    if (!patient) return;
    // Validación: enteros >= 0. Un campo vacío se interpreta como 0.
    const parse = (v: string, label: string): number | null => {
      const s = v.trim();
      if (s === '') return 0;
      const n = Number(s);
      if (!Number.isInteger(n) || n < 0) {
        toast.error('Valor inválido', `${label} debe ser un número entero igual o mayor a 0.`);
        return null;
      }
      return n;
    };
    const gestaciones = parse(obsGestaciones, 'Gestaciones');
    const partosVaginales = parse(obsPartos, 'Partos');
    const cesareas = parse(obsCesareas, 'Cesáreas');
    const abortos = parse(obsAbortos, 'Abortos');
    if (gestaciones === null || partosVaginales === null || cesareas === null || abortos === null) return;

    // Coherencia obstétrica básica: P + C + A no debería superar G.
    if (partosVaginales + cesareas + abortos > gestaciones) {
      return toast.error(
        'Datos incoherentes',
        'La suma de partos, cesáreas y abortos no puede ser mayor que el número de gestaciones.',
      );
    }

    updatePatient(
      { id: patient.id, data: { gestaciones, partosVaginales, cesareas, abortos } },
      {
        onSuccess: () => {
          toast.success('Antecedentes actualizados', 'Se recalculó el nivel de riesgo.');
          setIsObsModalVisible(false);
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
              <TouchableOpacity onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes')} style={styles.iconBtnGlass}>
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
          onAction={() => goBack(router, '/(obstetra)/(tabs)/gestantes')}
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
  const weekLabels = weightPoints.map((p: any) => `Sem ${Number.isFinite(p.week) ? p.week : '—'}`);

  // Banda de ganancia de peso recomendada (IOM), según el IMC pregestacional.
  // Ganancia total por categoría → kg/semana en 2º-3er trimestre, partiendo del
  // peso habitual (pregestacional). Permite ver si la gestante sube lo correcto.
  const imcInicial = Number(patient.imc);
  const pesoBase = Number(patient.pesoHabitual);
  const gainRange = (() => {
    if (!Number.isFinite(imcInicial) || imcInicial <= 0) return null;
    if (imcInicial < 18.5) return { totalMin: 12.5, totalMax: 18, label: 'bajo peso' };
    if (imcInicial < 25) return { totalMin: 11.5, totalMax: 16, label: 'peso normal' };
    if (imcInicial < 30) return { totalMin: 7, totalMax: 11.5, label: 'sobrepeso' };
    return { totalMin: 5, totalMax: 9, label: 'obesidad' };
  })();
  const hasWeightBand = hasWeightChart && Number.isFinite(pesoBase) && pesoBase > 0 && !!gainRange;
  // En cada semana medida, peso esperado = peso base + ganancia proporcional a
  // (semana-13)/(40-13) del total recomendado (la ganancia relevante arranca ~sem 13).
  const weightLower = hasWeightBand
    ? weightPoints.map((p: any) => {
        const frac = Math.max(0, Math.min(1, (p.week - 13) / (40 - 13)));
        return Number((pesoBase + gainRange!.totalMin * frac).toFixed(1));
      })
    : [];
  const weightUpper = hasWeightBand
    ? weightPoints.map((p: any) => {
        const frac = Math.max(0, Math.min(1, (p.week - 13) / (40 - 13)));
        return Number((pesoBase + gainRange!.totalMax * frac).toFixed(1));
      })
    : [];
  const gananciaActual = hasWeightChart && Number.isFinite(pesoBase) && pesoBase > 0
    ? Number((weightData[weightData.length - 1] - pesoBase).toFixed(1))
    : null;

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
            <TouchableOpacity onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes')} style={styles.iconBtnGlass}>
              <ChevronLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Historia Clínica</Text>
            <View style={{ flexDirection: 'row', gap: spacing.xs2 }}>
              {/* El botón "Registrar control" se quitó por redundante: la acción
                  ya está en la pestaña Seguimiento. */}
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
                <WhatsAppIcon size={20} color={commonColors.white} />
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
                {/* Métricas en rejilla 2×2 (cada celda al 50%): en móvil ya no
                    se aprietan ni se desordenan como en la fila de 4 columnas. */}
                <View style={styles.statusMetricsGrid}>
                  <View style={styles.statusMetricCell}>
                    <Baby size={16} color={obstetraColors.primary} />
                    <View style={styles.statusMetricTexts}>
                      <Text style={styles.statusMetricVal} numberOfLines={1}>
                        {patient.currentWeek ? `${patient.currentWeek} sem` : '—'}
                        {patient.currentTrimester ? ` · ${patient.currentTrimester}° trim.` : ''}
                      </Text>
                      <Text style={styles.statusMetricLbl} numberOfLines={1}>Edad gestacional</Text>
                    </View>
                  </View>
                  <View style={styles.statusMetricCell}>
                    <CalendarHeart size={16} color={obstetraColors.primary} />
                    <View style={styles.statusMetricTexts}>
                      <Text style={styles.statusMetricVal} numberOfLines={1}>
                        {patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </Text>
                      <Text style={styles.statusMetricLbl} numberOfLines={1}>Fecha prob. de parto</Text>
                    </View>
                  </View>
                  <View style={styles.statusMetricCell}>
                    <CalendarClock size={16} color={obstetraColors.primary} />
                    <View style={styles.statusMetricTexts}>
                      <Text style={styles.statusMetricVal} numberOfLines={1}>
                        {nextAppointment ? new Date(nextAppointment.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—'}
                      </Text>
                      <Text style={styles.statusMetricLbl} numberOfLines={1}>Próxima cita</Text>
                    </View>
                  </View>
                  <View style={styles.statusMetricCell}>
                    <Activity size={16} color={obstetraColors.primary} />
                    <View style={styles.statusMetricTexts}>
                      <Text style={styles.statusMetricVal} numberOfLines={1}>{displayImc}</Text>
                      <Text style={styles.statusMetricLbl} numberOfLines={1}>IMC</Text>
                    </View>
                  </View>
                </View>
                {/* Cinta prenatal: continuidad del embarazo a la vista, con el
                    acento del obstetra. Es la misma firma que ve la gestante. */}
                {Number(patient.currentWeek) > 0 ? (
                  <View style={styles.statusRibbon}>
                    <PrenatalRibbon
                      week={Number(patient.currentWeek)}
                      colors={obstetraColors.gradient}
                      showCaption={false}
                    />
                  </View>
                ) : null}
              </View>

              {/* 2. ALERTAS ACCIONABLES — lo único que requiere atención.
                  Se quitó la tarjeta "destacados" y el párrafo auto-generado, que
                  repetían estos mismos datos (anemia/riesgo/adherencia). */}
              {(patient.resumenClinico?.alertas?.length ?? 0) > 0 && (
                <View style={[styles.alertasCard, designTokens.cardShadow]}>
                  <Text style={styles.alertasTitle}>Requiere atención</Text>
                  {patient.resumenClinico!.alertas!.map((a: string, i: number) => (
                    <View key={i} style={styles.resumenAlertaRow}>
                      <AlertTriangle size={14} color={riskColors.riskRed} />
                      <Text style={styles.resumenAlertaText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 3. DETALLE CLÍNICO — agrupado y secundario respecto al estado */}
              <Text style={styles.groupLabel}>Información clínica</Text>
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

              <Accordion
                title="Antecedentes obstétricos"
                icon={Baby}
                accentColor={BRAND}
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={openObsModal} hitSlop={6}>
                    <Plus size={13} color={BRAND} />
                    <Text style={styles.addChipText}>Editar</Text>
                  </TouchableOpacity>
                )}
              >
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

              <Text style={styles.groupLabel}>Datos administrativos</Text>
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
              {/* Encabezado explicativo de la sección (issue #6 de Seguimiento) */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <Text style={[styles.cardHeader, { marginBottom: 2 }]}>Seguimiento del embarazo</Text>
                <Text style={styles.clinicoIntro}>
                  Aquí ves cómo evoluciona el embarazo control a control: el crecimiento del bebé (altura uterina),
                  la ganancia de peso y el historial de controles con sus signos vitales.
                </Text>
              </View>

              {/* Sub-pestañas: separa Controles de Visitas domiciliarias para que
                  las visitas no queden enterradas tras una lista larga de controles. */}
              <ToggleTabs
                tabs={[
                  { key: 'controles', label: 'Controles', badge: controls.length || undefined },
                  { key: 'visitas', label: 'Visitas a domicilio', badge: homeVisitsCount || undefined },
                ]}
                value={seguimientoView}
                onChange={(k) => setSeguimientoView(k as 'controles' | 'visitas')}
                activeColor={BRAND}
                style={{ marginBottom: spacing.md }}
              />

              {seguimientoView === 'controles' && (<>
              {/* Gráfica de altura uterina con bandas de referencia P10/P90 (RF-5.03) */}
              <AlturaUterinaChart controls={controls} themeColor={BRAND} />

              {/* La curva de peso solo se muestra si el módulo de peso está activo. */}
              {flags.pesoRegistros && hasWeightChart && (
                <View style={[styles.card, designTokens.cardShadow, { padding: 20 }]}>
                  <Text style={[styles.cardHeader, { marginBottom: 2 }]}>Ganancia de peso</Text>
                  <Text style={styles.clinicoIntro}>
                    {hasWeightBand
                      ? 'La línea morada es el peso de tu paciente. La franja verde es la ganancia recomendada para su contextura: mientras esté dentro, sube lo adecuado.'
                      : 'Peso de tu paciente por semana. Registra su peso habitual y talla para ver la franja de ganancia recomendada.'}
                  </Text>
                  <LineChartSvg
                    labels={weekLabels}
                    height={190}
                    decimals={1}
                    yAxisLabel="Peso (kg)"
                    xAxisLabel="Semanas de embarazo"
                    band={hasWeightBand ? { lower: weightLower, upper: weightUpper, color: semanticColors.successLight } : undefined}
                    series={[
                      ...(hasWeightBand ? [
                        { data: weightLower, color: commonColors.borderStrong, strokeWidth: 1, withDots: false, dashed: true },
                        { data: weightUpper, color: commonColors.borderStrong, strokeWidth: 1, withDots: false, dashed: true },
                      ] : []),
                      { data: weightData, color: BRAND, strokeWidth: 3, highlightLast: true },
                    ]}
                    legend={hasWeightBand
                      ? [{ label: 'Ganancia recomendada', color: semanticColors.success }, { label: 'Peso de tu paciente', color: BRAND }]
                      : [{ label: 'Peso (kg)', color: BRAND }]}
                    style={{ marginTop: spacing.sm }}
                  />
                  {gananciaActual != null && (
                    <Text style={styles.weightSummary}>
                      Ganancia hasta hoy: <Text style={styles.weightSummaryStrong}>{gananciaActual > 0 ? '+' : ''}{gananciaActual} kg</Text>
                      {gainRange ? ` · recomendado total para ${gainRange.label}: ${gainRange.totalMin}–${gainRange.totalMax} kg` : ''}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.actionHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardHeader}>Controles prenatales</Text>
                  <Text style={styles.sectionCount}>
                    {controls.length} de 8 · meta MINSA
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.primaryActionBtn, designTokens.glassShadow]}
                  onPress={() => router.push({ pathname: '/(obstetra)/control/nuevo', params: { patientId: patient.id } } as any)}
                >
                  <Plus size={16} color={obstetraColors.onPrimary} />
                  <Text style={styles.primaryActionText}>Nuevo Control</Text>
                </TouchableOpacity>
              </View>

              {controls.length > 0 ? (
                // El backend ordena por fecha desc → el más reciente ya viene
                // primero. NO se invierte (antes se hacía y el último quedaba al
                // final, obligando a scrollear). El primero se muestra expandido.
                controls.map((ctrl: any, idx: number) => {
                  const fecha = new Date(ctrl.date || ctrl.fecha);
                  const nro = ctrl.numeroControl ?? (controls.length - idx);
                  const esUltimo = idx === 0;
                  const cid = ctrl.id || ctrl._id || String(idx);
                  // Métricas con nombre claro (sin abreviaturas crípticas) + alerta.
                  const metrics = [
                    { key: 'pa', label: 'Presión arterial', short: 'mmHg', value: ctrl.bloodPressure, unit: '', status: vitalStatus('pa', ctrl) },
                    { key: 'fcf', label: 'Latido del bebé', short: 'FCF', value: ctrl.fetalHeartRate, unit: ' lpm', status: vitalStatus('fcf', ctrl) },
                    { key: 'au', label: 'Altura uterina', short: 'AU', value: ctrl.alturaUterina, unit: ' cm', status: 'ok' as const },
                    { key: 'peso', label: 'Peso', short: '', value: ctrl.weight, unit: ' kg', status: 'ok' as const },
                    { key: 'temp', label: 'Temperatura', short: '', value: ctrl.temperatura, unit: ' °C', status: vitalStatus('temp', ctrl) },
                    { key: 'pulso', label: 'Pulso materno', short: '', value: ctrl.pulsoMaterno, unit: ' lpm', status: vitalStatus('pulso', ctrl) },
                  ].filter((m) => m.value != null && m.value !== '');
                  const hasWarn = metrics.some((m) => m.status === 'warn');
                  // Expandido si es el último o si el usuario lo abrió.
                  const open = expandedControls[cid] ?? esUltimo;

                  return (
                    <View key={cid} style={[styles.controlCard, designTokens.cardShadow, esUltimo && styles.controlCardLatest]}>
                      {/* Cabecera tappable: alterna expandir/colapsar */}
                      <TouchableOpacity
                        style={styles.ctrlHeader}
                        activeOpacity={0.7}
                        onPress={() => setExpandedControls((prev) => ({ ...prev, [cid]: !open }))}
                        accessibilityRole="button"
                        accessibilityLabel={`Control ${nro}, ${open ? 'ocultar' : 'ver'} detalle`}
                      >
                        <View style={styles.ctrlDateBox}>
                          <Text style={styles.ctrlDay}>{fecha.getDate()}</Text>
                          <Text style={styles.ctrlMonth}>
                            {fecha.toLocaleDateString('es-PE', { month: 'short' }).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.ctrlTitleWrap}>
                          <View style={styles.ctrlTitleRow}>
                            <Text style={styles.ctrlTitle}>Control N° {nro}</Text>
                            {esUltimo && (
                              <View style={styles.ctrlLatestBadge}>
                                <Text style={styles.ctrlLatestText}>Más reciente</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.ctrlSubtitle}>
                            {ctrl.week != null ? `Semana ${ctrl.week}` : 'Semana —'} · {fecha.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                          {/* Resumen compacto cuando está colapsado */}
                          {!open && metrics.length > 0 && (
                            <Text style={styles.ctrlCollapsedSummary} numberOfLines={1}>
                              {metrics.slice(0, 3).map((m) => `${m.value}${m.unit}`).join('  ·  ')}
                            </Text>
                          )}
                        </View>
                        {hasWarn && (
                          <View style={styles.ctrlWarnChip}>
                            <AlertTriangle size={12} color={semanticColors.warning} />
                            <Text style={styles.ctrlWarnText}>Revisar</Text>
                          </View>
                        )}
                        {open ? <ChevronUp size={18} color={commonColors.textTertiary} /> : <ChevronDown size={18} color={commonColors.textTertiary} />}
                      </TouchableOpacity>

                      {open && (<>
                      {metrics.length > 0 ? (
                        <View style={styles.ctrlMetrics}>
                          {metrics.map((m) => (
                            <View key={m.key} style={styles.ctrlMetricBox}>
                              <Text style={[styles.ctrlMetricVal, m.status === 'warn' && { color: semanticColors.warning }]}>
                                {m.value}{m.unit}
                              </Text>
                              <Text style={styles.ctrlMetricLbl} numberOfLines={1}>{m.label}</Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={styles.ctrlNoData}>Sin signos vitales registrados en este control.</Text>
                      )}

                      {ctrl.movimientoFetal ? (
                        <Text style={styles.ctrlExtra}>Movimiento del bebé: <Text style={styles.ctrlExtraStrong}>{ctrl.movimientoFetal}</Text></Text>
                      ) : null}

                      {ctrl.observaciones ? (
                        <View style={styles.ctrlObsBox}>
                          <Text style={styles.ctrlObsText}>{ctrl.observaciones}</Text>
                        </View>
                      ) : null}

                      {ctrl.proximaCita ? (
                        <View style={styles.ctrlNextRow}>
                          <CalendarClock size={13} color={obstetraColors.primary} />
                          <Text style={styles.ctrlNextText}>
                            Próximo control: {new Date(ctrl.proximaCita).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                      ) : null}
                      </>)}
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  icon={Activity as any}
                  title="Sin controles"
                  description="Aún no se ha registrado ningún control para esta gestante."
                  themeColor={BRAND}
                />
              )}
              </>)}

              {/* Visitas domiciliarias (continuidad del cuidado, Objetivo 1) */}
              {seguimientoView === 'visitas' && (
                <HomeVisitsTab
                  gestanteId={patient.id}
                  domicilioLat={patient.domicilioLat}
                  domicilioLng={patient.domicilioLng}
                  referenciaDom={patient.referenciaDom}
                />
              )}
            </View>
          )}

          {/* ── SECCIÓN: TRATAMIENTO (medicinas/suplementos + vacunas) ── */}
          {activeTab === 'tratamiento' && (
            <View style={styles.section}>
              {/* Encabezado explicativo de la sección */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <Text style={[styles.cardHeader, { marginBottom: 2 }]}>Tratamiento y vacunas</Text>
                <Text style={styles.clinicoIntro}>
                  Medicamentos y suplementos recetados con su adherencia (qué tanto los toma la gestante)
                  y el esquema de vacunación del embarazo.
                </Text>
              </View>

              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={[styles.cardHeader, { marginBottom: 0 }]}>Medicamentos y suplementos</Text>
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
                  // Interpretación de la adherencia en lenguaje claro.
                  const adColor = pct >= 80 ? semanticColors.success : pct >= 50 ? semanticColors.warning : semanticColors.danger;
                  const adLabel = pct >= 80 ? 'Buena adherencia' : pct >= 50 ? 'Adherencia regular' : 'Adherencia baja';

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
                            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: adColor }]} />
                          </View>
                          <Text style={[styles.progressPct, { color: adColor }]}>{pct}%</Text>
                        </View>
                        <View style={styles.adherenceRow}>
                          {!suspendido && (
                            <View style={[styles.adherencePill, { backgroundColor: adColor + '1A' }]}>
                              <Text style={[styles.adherencePillText, { color: adColor }]}>{adLabel}</Text>
                            </View>
                          )}
                          <Text style={styles.progressHint}>{tomados} de {total} dosis tomadas</Text>
                        </View>

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
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardHeader, { marginBottom: 2 }]}>Vacunas del embarazo</Text>
                    {vacunas.length > 0 && (
                      <Text style={styles.sectionCount}>
                        {vacunas.filter((v: any) => v.aplicada).length} de {vacunas.length} aplicadas
                      </Text>
                    )}
                  </View>
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
              {/* ENCABEZADO + EXPLICACIÓN de qué es esta sección */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 12 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.cardHeader, { marginBottom: 2 }]}>Exámenes de laboratorio</Text>
                    <Text style={styles.clinicoIntro}>
                      Resultados de los análisis de la gestante con su interpretación. El color indica si está
                      {' '}<Text style={{ color: semanticColors.success, fontWeight: '700' }}>normal</Text>,
                      {' '}requiere <Text style={{ color: semanticColors.danger, fontWeight: '700' }}>atención</Text> o está
                      {' '}<Text style={{ color: commonColors.textTertiary, fontWeight: '700' }}>pendiente</Text>.
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setIsLabModalVisible(true)}>
                    <Plus size={16} color={obstetraColors.onPrimary} />
                    <Text style={styles.primaryActionText}>Registrar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* GRUPO 1: HEMOGLOBINA Y ANEMIA */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={styles.labGroupHeader}>
                  <Droplet size={16} color={BRAND} />
                  <Text style={styles.labGroupTitle}>Hemoglobina y anemia</Text>
                </View>
                <Text style={styles.labGroupNote}>
                  Valor corregido por la altitud de la zona. La anemia se evalúa con este valor corregido (no el observado).
                </Text>
                {(() => {
                  const rows = [
                    { n: 'I', val: lab.hemoglobina1, corr: lab.hb1Corregida, show: true },
                    { n: 'II', val: lab.hemoglobina2, corr: lab.hb2Corregida, show: lab.hemoglobina2 != null || Number(patient.currentWeek) >= 25 },
                    { n: 'III', val: lab.hemoglobina3, corr: lab.hb3Corregida, show: lab.hemoglobina3 != null || Number(patient.currentWeek) >= 33 },
                  ].filter((r) => r.show);
                  return rows.map((r, i) => {
                    const cls = classifyHb(r.corr ?? r.val ?? null);
                    const valueText = r.val != null
                      ? `${r.val} g/dL${r.corr != null && r.corr !== r.val ? ` (corr. ${r.corr})` : ''}`
                      : null;
                    return (
                      <LabRow
                        key={r.n}
                        label={`Hemoglobina ${r.n}`}
                        hint={r.n === 'I' ? '1er control' : r.n === 'II' ? 'aprox. sem. 25' : 'aprox. sem. 33'}
                        value={valueText}
                        state={cls.state}
                        stateLabel={cls.label}
                        isLast={i === rows.length - 1}
                      />
                    );
                  });
                })()}
              </View>

              {/* GRUPO 2: TAMIZAJE / SEROLOGÍA */}
              <View style={[styles.card, designTokens.cardShadow]}>
                <View style={styles.labGroupHeader}>
                  <ShieldCheck size={16} color={BRAND} />
                  <Text style={styles.labGroupTitle}>Tamizaje y serología</Text>
                </View>
                {(() => {
                  const items = [
                    { label: 'VIH', hint: 'Tamizaje VIH', value: lab.vih },
                    { label: 'Sífilis (VDRL/RPR)', hint: 'Tamizaje de sífilis', value: lab.vdrl },
                    { label: 'Hepatitis B', hint: 'Antígeno de superficie', value: lab.hepatitisB },
                    { label: 'Glucemia', hint: 'Azúcar en sangre', value: lab.glucemia },
                    { label: 'Examen de orina', hint: 'Descarta infección urinaria', value: lab.examenOrina },
                    { label: 'Papanicolaou (PAP)', hint: 'Tamizaje de cáncer de cuello uterino', value: lab.pap },
                  ];
                  return items.map((it, i) => {
                    const cls = classifyQualitative(it.value);
                    return (
                      <LabRow
                        key={it.label}
                        label={it.label}
                        hint={it.hint}
                        value={cls.state === 'pendiente' ? null : (it.value || null)}
                        state={cls.state}
                        stateLabel={cls.state === 'pendiente' ? 'Pendiente' : cls.label}
                        isLast={i === items.length - 1}
                      />
                    );
                  });
                })()}
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
        <View style={{ gap: 12 }}>
          {/* 1) Elegir el examen */}
          <View>
            <Text style={styles.inputLabel}>¿Qué examen vas a registrar?</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {LAB_EXAM_TYPES.map((ex) => {
                const active = labTipo === ex.tipo;
                return (
                  <TouchableOpacity
                    key={ex.tipo}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14,
                      backgroundColor: active ? obstetraColors.primaryLight : commonColors.surfaceAlt,
                      borderWidth: 1, borderColor: active ? BRAND : commonColors.border,
                    }}
                    onPress={() => { setLabTipo(ex.tipo); setLabUnidad(ex.unidad || ''); setLabResultado(''); setLabValorText(''); }}
                  >
                    <Text style={{ ...typography.caption, color: active ? BRAND : commonColors.textSecondary, fontWeight: active ? '700' : '500' }}>{ex.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {(() => {
            const exam = LAB_EXAM_TYPES.find((e) => e.tipo === labTipo);
            const isNumeric = exam?.kind === 'numeric';
            const isQual = exam?.kind === 'qualitative';
            // Examen no listado → entrada libre como antes.
            const isCustom = !exam;
            return (
              <>
                {isCustom && (
                  <PlainInput label="Tipo de examen" placeholder="Escribe el nombre del examen…" value={labTipo} onChangeText={setLabTipo} themeColor={BRAND} />
                )}

                {/* Hemoglobina lleva número de toma (I, II, III) */}
                {exam?.tipo === 'hemoglobina' && (
                  <PlainInput label="Número de toma (1, 2 o 3)" placeholder="Ej. 1" keyboardType="numeric" value={labToma} onChangeText={setLabToma} themeColor={BRAND} />
                )}

                {(isNumeric || isCustom) && (
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 2 }}>
                      <PlainInput label="Valor medido" placeholder={exam?.placeholder || 'Ej. 11.5'} keyboardType="numeric" value={labValorNum} onChangeText={setLabValorNum} themeColor={BRAND} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <PlainInput label="Unidad" placeholder="g/dL" value={labUnidad} onChangeText={setLabUnidad} themeColor={BRAND} />
                    </View>
                  </View>
                )}

                {isQual && (
                  <View>
                    <Text style={styles.inputLabel}>Resultado</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                      {exam!.options!.map((opt) => {
                        const active = labResultado === opt;
                        const isBad = /(reactivo|positivo|anormal)/i.test(opt);
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={{
                              paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12,
                              backgroundColor: active ? (isBad ? semanticColors.dangerLight : semanticColors.successLight) : commonColors.surfaceAlt,
                              borderWidth: 1, borderColor: active ? (isBad ? semanticColors.danger : semanticColors.success) : commonColors.border,
                            }}
                            onPress={() => setLabResultado(opt)}
                          >
                            <Text style={{ ...typography.bodySmall, fontWeight: '700', color: active ? (isBad ? semanticColors.danger : semanticColors.success) : commonColors.textSecondary }}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {exam?.hint ? <Text style={styles.labModalHint}>{exam.hint}</Text> : null}

                <PlainInput label="Observaciones (opcional)" placeholder="Notas adicionales…" multiline value={labObs} onChangeText={setLabObs} themeColor={BRAND} />
              </>
            );
          })()}
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

      {/* ── MODAL: EDITAR ANTECEDENTES OBSTÉTRICOS (fórmula G/P/C/A) ── */}
      <AppModal
        visible={isObsModalVisible}
        onClose={() => setIsObsModalVisible(false)}
        title="Antecedentes obstétricos"
        subtitle="Fórmula obstétrica de la gestante. Al guardar se recalcula el nivel de riesgo."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsObsModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSaveObstetricos} style={{ flex: 1 }} themeColor={BRAND} loading={isSavingEmb} disabled={isSavingEmb} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Gestaciones (G)" placeholder="Ej. 2" value={obsGestaciones} onChangeText={setObsGestaciones} keyboardType="number-pad" themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Partos (P)" placeholder="Ej. 1" value={obsPartos} onChangeText={setObsPartos} keyboardType="number-pad" themeColor={BRAND} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Cesáreas (C)" placeholder="Ej. 0" value={obsCesareas} onChangeText={setObsCesareas} keyboardType="number-pad" themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Abortos (A)" placeholder="Ej. 0" value={obsAbortos} onChangeText={setObsAbortos} keyboardType="number-pad" themeColor={BRAND} />
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
        title={!recSelected ? 'Recomendar contenido' : 'Vista previa y envío'}
        subtitle={!recSelected
          ? `Elige un recurso educativo para ${patient.firstName}.`
          : `Así lo verá ${patient.firstName}. Añade una nota si quieres y envíalo.`}
        footer={recSelected ? (
          <>
            <AppButton title="Volver" variant="outline" onPress={backToRecList} style={{ flex: 1 }} />
            <AppButton
              title="Enviar a la gestante"
              onPress={handleRecommend}
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
                        onPress={() => openRecDetail(c)}
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
                      {/* Botón rápido de vista previa (lleva al mismo detalle) */}
                      <TouchableOpacity
                        style={styles.recPreviewIconBtn}
                        onPress={() => openRecDetail(c)}
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

                  {/* ENVÍO: nota opcional + maqueta fiel de cómo lo verá en el chat */}
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
                        {recNota.trim()
                          ? `Tu obstetra te recomienda este contenido: "${recSelected.titulo}".\n\n${recNota.trim()}`
                          : `Tu obstetra te recomienda leer este contenido: "${recSelected.titulo}".`}
                      </Text>
                      <View style={styles.recPreviewCard}>
                        {thumb ? (
                          <Image source={{ uri: thumb }} style={[styles.recThumb, { borderRadius: borderRadius.md }]} resizeMode="cover" />
                        ) : (
                          <View style={[styles.recIcon, { backgroundColor: cm.bg, borderRadius: borderRadius.md }]}>
                            <CIcon size={20} color={cm.color} />
                          </View>
                        )}
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
  statusMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
  },
  statusMetricCell: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm2,
  },
  statusMetricTexts: { flex: 1, minWidth: 0 },
  statusMetricVal: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  statusMetricLbl: { ...typography.overline, fontSize: 10, color: commonColors.textSecondary, marginTop: 1 },
  statusRibbon: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm2,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
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
  // Tarjeta única de alertas accionables (reemplaza destacados + párrafo).
  alertasCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: 8,
  },
  alertasTitle: { ...typography.label, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  // Subtítulo de grupo para separar lo clínico de lo administrativo.
  groupLabel: {
    ...typography.overline,
    color: commonColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
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
  sectionCount: {
    ...typography.caption,
    color: commonColors.textSecondary,
    marginTop: -4,
  },
  clinicoIntro: {
    ...typography.caption,
    color: commonColors.textSecondary,
    lineHeight: 18,
  },
  weightSummary: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  weightSummaryStrong: { color: commonColors.text, fontFamily: typography.label.fontFamily, fontWeight: '700' },
  labGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  labGroupTitle: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  labGroupNote: { ...typography.caption, color: commonColors.textTertiary, marginBottom: spacing.sm, lineHeight: 18 },
  labModalHint: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 17, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.md, padding: spacing.sm },

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
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...shadows.card,
  },
  controlCardLatest: {
    borderWidth: 1.5,
    borderColor: obstetraColors.primaryMid,
  },
  ctrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctrlTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  ctrlLatestBadge: {
    backgroundColor: obstetraColors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  ctrlLatestText: { ...typography.overline, fontSize: 9, fontWeight: '700', color: BRAND },
  ctrlCollapsedSummary: { ...typography.caption, color: commonColors.textTertiary, marginTop: 3 },
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
    flexWrap: 'wrap',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 16,
    padding: spacing.md,
    rowGap: spacing.md,
    marginTop: spacing.md,
  },
  ctrlMetricBox: {
    alignItems: 'center',
    width: '33.33%',
  },
  ctrlWarnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: semanticColors.warningLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  ctrlWarnText: { ...typography.overline, fontSize: 10, color: semanticColors.warning, fontWeight: '700' },
  ctrlNoData: {
    ...typography.bodySmall,
    color: commonColors.textTertiary,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
    textAlign: 'center',
  },
  ctrlExtra: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: spacing.sm },
  ctrlExtraStrong: { color: commonColors.text, fontFamily: typography.label.fontFamily, fontWeight: '700' },
  ctrlObsBox: {
    marginTop: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: obstetraColors.primary,
  },
  ctrlObsText: { ...typography.bodySmall, color: commonColors.text, lineHeight: 20 },
  ctrlNextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  ctrlNextText: { ...typography.caption, color: commonColors.textSecondary },
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
  },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  adherencePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.full },
  adherencePillText: { ...typography.overline, fontSize: 10, fontWeight: '700' },

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
