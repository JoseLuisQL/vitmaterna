import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  StatusBar, Platform, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveMediaUrl } from '../../../src/services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, ChevronDown, ChevronUp, User, Stethoscope, Pill, FlaskConical,
  Syringe, AlertTriangle, Activity, Plus, ClipboardList, Trash2, BookOpen, Send,
  Phone, CalendarClock, Baby, HeartPulse, CalendarHeart, ChevronRight,
  Eye, Clock, ExternalLink, PlayCircle, CheckCircle2, Droplet, Beaker, ShieldCheck, HelpCircle, Scale,
} from 'lucide-react-native';
import { Linking } from 'react-native';
import { HomeVisitsTab } from '../../../src/components/obstetra/HomeVisitsTab';
import { LineChartSvg } from '../../../src/components/ui/LineChartSvg';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton, useToast, DateTimeField, Accordion, PlainInput, ToggleTabs, PrenatalRibbon, SearchField, ScheduleSelector } from '../../../src/components/ui';
import { WhatsAppIcon } from '../../../src/components/ui/WhatsAppIcon';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { spacing, borderRadius, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { typography } from '../../../src/theme/typography';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import {
  usePatientProfile, useCreateLabResult, useCreateVaccine, useUpdateVaccine, useCreateTreatment,
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
// Sub-componentes y helpers extraídos (Fase 3) — presentacional puro, sin mutación.
import { Fila } from '../../../src/components/obstetra/patient-detail/Fila';
import { LabRow } from '../../../src/components/obstetra/patient-detail/LabRow';
import { Seccion } from '../../../src/components/obstetra/patient-detail/Seccion';
import {
  TAB_ALIASES,
  riskTextColor,
  riskLabel,
  vitalStatus,
  classifyHb,
  classifyQualitative,
  LAB_EXAM_TYPES,
  type LabState,
} from '../../../src/components/obstetra/patient-detail/helpers';

const BRAND = obstetraColors.primary;

// ─── TABS (4 secciones por FLUJO CLÍNICO) ────────────────────────────────────
// Reorganizadas según cómo trabaja el obstetra al abrir un expediente:
//   Resumen   → estado de un vistazo: riesgo, alertas accionables, próxima cita.
//   Embarazo  → ficha estática editable: datos del embarazo, antecedentes
//               obstétricos, antecedentes personales/familiares, datos personales.
//   Evolución → cómo avanza el embarazo en el tiempo: controles prenatales,
//               gráficas (altura uterina, peso) y visitas domiciliarias.
//   Clínico   → datos clínicos puntuales: laboratorio, tratamiento, vacunas y
//               signos de alarma.
const TABS = [
  { id: 'resumen', label: 'Resumen', icon: Activity },
  { id: 'embarazo', label: 'Embarazo', icon: Baby },
  { id: 'evolucion', label: 'Evolución', icon: Stethoscope },
  { id: 'clinico', label: 'Clínico', icon: FlaskConical },
];

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const designTokens = {
  cardShadow: shadows.card,
  glassShadow: shadows.card,
};

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
  const [isEvolucionModalVisible, setIsEvolucionModalVisible] = useState(false);

  // Form states for Lab Result
  const [labTipo, setLabTipo] = useState('');
  const [labToma, setLabToma] = useState('1');
  const [labValorNum, setLabValorNum] = useState('');
  const [labValorText, setLabValorText] = useState('');
  const [labUnidad, setLabUnidad] = useState('');
  const [labResultado, setLabResultado] = useState('');
  const [labObs, setLabObs] = useState('');

  // Form states for Vaccine Record
  const [vaxId, setVaxId] = useState<string | undefined>(undefined);
  const [vaxNombre, setVaxNombre] = useState('');
  const [vaxDosis, setVaxDosis] = useState('1');
  const [vaxSemana, setVaxSemana] = useState('');
  const [vaxEstado, setVaxEstado] = useState('aplicada');

  // Form states for Treatment
  const [treatNombre, setTreatNombre] = useState('');
  const [treatDosis, setTreatDosis] = useState('1 tableta');
  const [treatFrecuencia, setTreatFrecuencia] = useState('Diario');
  const [treatHorarios, setTreatHorarios] = useState<string[]>(['08:00']);
  const [treatHoraInput, setTreatHoraInput] = useState('14:00');
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
  const [isAlarmHistoryModalVisible, setIsAlarmHistoryModalVisible] = useState(false);
  const [obsGestaciones, setObsGestaciones] = useState('');
  const [obsPartos, setObsPartos] = useState('');
  const [obsCesareas, setObsCesareas] = useState('');
  const [obsAbortos, setObsAbortos] = useState('');

  // Issue #36: edición de datos personales de la gestante por el obstetra.
  const [isPersonalModalVisible, setIsPersonalModalVisible] = useState(false);
  const [pFirstName, setPFirstName] = useState('');
  const [pLastName, setPLastName] = useState('');
  const [pFechaNac, setPFechaNac] = useState('');
  const [pHistoriaClinica, setPHistoriaClinica] = useState('');
  const [pPhone, setPPhone] = useState('');
  const [pAcompanante, setPAcompanante] = useState('');
  const [pDireccion, setPDireccion] = useState('');
  const [pLocalidad, setPLocalidad] = useState('');
  const [pOcupacion, setPOcupacion] = useState('');
  const [pCodigoSis, setPCodigoSis] = useState('');

  // Editar/suspender tratamiento (RF-4.10)
  const [editTreat, setEditTreat] = useState<any | null>(null);
  const [editDosis, setEditDosis] = useState('');
  const [editFrecuencia, setEditFrecuencia] = useState('');
  const [editIndicaciones, setEditIndicaciones] = useState('');
  const [editHorarios, setEditHorarios] = useState<string[]>([]);
  const [editDuracion, setEditDuracion] = useState('');
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
  const { mutate: createVaccine, isPending: isCreatingVax } = useCreateVaccine();
  const { mutate: updateVaccine, isPending: isUpdatingVax } = useUpdateVaccine();
  const isSavingVax = isCreatingVax || isUpdatingVax;
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

  // Issue #36: abrir el modal de edición de datos personales precargado.
  const openPersonalModal = () => {
    if (!patient) return;
    setPFirstName(patient.firstName || '');
    setPLastName(patient.lastName || '');
    setPFechaNac(patient.fechaNacimientoRaw || '');
    setPHistoriaClinica(patient.historiaClinica || '');
    setPPhone(patient.phone || '');
    setPAcompanante(patient.phoneAcompanante || '');
    setPDireccion(patient.address || '');
    setPLocalidad(patient.localidad || '');
    setPOcupacion(patient.occupation || '');
    setPCodigoSis(patient.sisCode || '');
    setIsPersonalModalVisible(true);
  };

  const handleSavePersonal = () => {
    if (!patient) return;
    if (!pFirstName.trim() || !pLastName.trim()) {
      return toast.error('Faltan datos', 'Los nombres y apellidos son obligatorios.');
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (pFechaNac && !dateRegex.test(pFechaNac)) {
      return toast.error('Formato inválido', 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.');
    }
    // Solo enviamos los campos personales; el backend actualiza User + Gestante.
    const data: any = {
      firstName: pFirstName.trim(),
      lastName: pLastName.trim(),
      historiaClinica: pHistoriaClinica.trim() || null,
      phone: pPhone.trim() || null,
      acompanantePhone: pAcompanante.trim() || null,
      direccion: pDireccion.trim() || null,
      localidad: pLocalidad.trim() || null,
      ocupacion: pOcupacion.trim() || null,
      codigoSis: pCodigoSis.trim() || null,
    };
    if (pFechaNac) data.fechaNacimiento = new Date(pFechaNac).toISOString();

    updatePatient(
      { id: patient.id, data },
      {
        onSuccess: () => {
          toast.success('Datos personales actualizados', 'Los cambios se guardaron correctamente.');
          setIsPersonalModalVisible(false);
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
    const hrs: string[] = Array.isArray(sup.horarios) && sup.horarios.length > 0
      ? sup.horarios
      : (sup.horaRecordatorio || sup.horaToma ? [sup.horaRecordatorio || sup.horaToma] : ['08:00']);
    setEditHorarios(hrs);
    setEditDuracion(sup.duracionDias ? String(sup.duracionDias) : '30');
  };

  const handleSaveEditTreat = () => {
    if (!editTreat || !patient) return;
    updateTreatment(
      {
        treatmentId: editTreat.id || editTreat._id,
        gestanteId: patient.id,
        data: {
          dosis: editDosis,
          frecuencia: editFrecuencia,
          horarios: editHorarios,
          horaToma: editHorarios.length > 0 ? editHorarios[0] : null,
          duracionDias: parseInt(editDuracion, 10) || undefined,
          indicaciones: editIndicaciones || undefined,
        },
      },
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

    const payload = {
      vacuna: vaxNombre,
      dosisNumero: parseInt(vaxDosis, 10) || 1,
      egSemanasAplicacion: vaxSemana ? parseInt(vaxSemana, 10) : undefined,
      fechaAplicacion: vaxEstado === 'aplicada' ? new Date().toISOString().split('T')[0] : undefined,
      estado: vaxEstado,
    };

    const onSuccess = () => {
      toast.success(vaxId ? 'Vacuna actualizada' : 'Vacuna registrada', vaxId ? 'El estado de la vacuna fue actualizado.' : 'El registro de vacunación se guardó.');
      setIsVaxModalVisible(false);
      setVaxId(undefined);
      setVaxNombre('');
      setVaxDosis('1');
      setVaxSemana('');
      setVaxEstado('aplicada');
    };

    const onError = () => {
      toast.error('Error', 'No se pudo registrar/actualizar la vacuna.');
    };

    if (vaxId) {
      updateVaccine({ id: vaxId, gestanteId: patient.id, data: payload }, { onSuccess, onError });
    } else {
      createVaccine({ gestanteId: patient.id, ...payload }, { onSuccess, onError });
    }
  };

  const openEditVax = (v: any) => {
    setVaxId(v.id || v._id);
    setVaxNombre(v.nombre || '');
    setVaxDosis(v.dosis?.toString() || '1');
    setVaxSemana(v.semana?.toString() || '');
    setVaxEstado(v.aplicada ? 'aplicada' : 'pendiente');
    setIsVaxModalVisible(true);
  };

  const handleSaveTreat = () => {
    if (!treatNombre) return toast.error('Falta el medicamento', 'El nombre del medicamento es requerido.');
    if (!patient) return;

    createTreatment({
      gestanteId: patient.id,
      nombre: treatNombre,
      dosis: treatDosis,
      frecuencia: treatFrecuencia,
      horaToma: treatHorarios.length > 0 ? treatHorarios[0] : undefined,
      horarios: treatHorarios,
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
        setTreatHorarios(['08:00']);
        setTreatHoraInput('14:00');
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
              <TouchableOpacity onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes')} style={styles.iconBtnGlass} accessibilityRole="button" accessibilityLabel="Volver">
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

  // Alertas accionables: se descartan las que solo reiteran el nivel de riesgo
  // (ya visible en el chip), para no mostrar "Riesgo alto" varias veces.
  const accionableAlertas = ((patient.resumenClinico?.alertas as string[] | undefined) || []).filter(
    (a) => !/\b(alto|medio|bajo)\s+riesgo\b|\briesgo\s+(alto|medio|bajo)\b/i.test(a),
  );
  const nextAppointment = (patient.appointments || [])
    .filter((a: any) => ['programada', 'confirmada'].includes(a.estado) && new Date(a.fecha) >= new Date())
    .sort((a: any, b: any) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())[0];

  // Semana de gestación de la próxima cita → hito sobre la cinta prenatal.
  const ribbonMilestones = (() => {
    if (!patient.fumRaw || !nextAppointment?.fecha) return [];
    const fum = new Date(patient.fumRaw);
    const cita = new Date(nextAppointment.fecha);
    if (isNaN(fum.getTime()) || isNaN(cita.getTime())) return [];
    const w = Math.floor((cita.getTime() - fum.getTime()) / (1000 * 60 * 60 * 24 * 7));
    if (w <= 0 || w > 42) return [];
    return [{ week: w, label: 'Próxima cita' }];
  })();

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
            <TouchableOpacity onPress={() => goBack(router, '/(obstetra)/(tabs)/gestantes')} style={styles.iconBtnGlass} accessibilityRole="button" accessibilityLabel="Volver">
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
                  accessibilityRole="button"
                  accessibilityLabel="Tamizajes y registros"
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
              <Text style={styles.patientSub} numberOfLines={1}>
                DNI {patient.documentNumber}{patient.age ? ` · ${patient.age} años` : ''}
              </Text>
            </View>
            {/* Chip de riesgo: identidad clínica de la paciente, siempre visible. */}
            <View style={[styles.headerRiskChip, { backgroundColor: riskTextColor(patient.riskLevel) }]}>
              <View style={styles.headerRiskDot} />
              <Text style={styles.headerRiskText}>{riskLabel(patient.riskLevel)}</Text>
            </View>
          </View>

          {/* Estado clínico EN LÍNEA: lo esencial de un vistazo sin entrar a un
              tab (semana · trimestre · próxima cita · alertas pendientes). */}
          <View style={styles.headerStatusRow}>
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal} numberOfLines={1}>
                {patient.currentWeek ? `${patient.currentWeek}` : '—'}
                <Text style={styles.headerStatUnit}> sem</Text>
              </Text>
              <Text style={styles.headerStatLbl} numberOfLines={1}>
                {patient.currentTrimester ? `${patient.currentTrimester}° trimestre` : 'Edad gestacional'}
              </Text>
            </View>
            <View style={styles.headerStatDivider} />
            <View style={styles.headerStat}>
              <Text style={styles.headerStatVal} numberOfLines={1}>
                {nextAppointment ? new Date(nextAppointment.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }) : '—'}
              </Text>
              <Text style={styles.headerStatLbl} numberOfLines={1}>Próxima cita</Text>
            </View>
            <View style={styles.headerStatDivider} />
            <TouchableOpacity 
              style={[styles.headerStat, pendingDangerCount > 0 && { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 }]}
              onPress={() => pendingDangerCount > 0 && setActiveTab('clinico')}
              disabled={pendingDangerCount === 0}
            >
              <Text style={[styles.headerStatVal, pendingDangerCount > 0 && { color: commonColors.white }]} numberOfLines={1}>
                {pendingDangerCount > 0 ? pendingDangerCount : '0'}
              </Text>
              <Text style={styles.headerStatLbl} numberOfLines={1}>
                {pendingDangerCount === 1 ? 'Alarma' : 'Alarmas'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {/* ── PANTALLA PRINCIPAL CON TABS ──
          Fila de ancho fijo que reparte los 4 tabs por igual (flex:1). Antes era
          un scroll horizontal donde "Tratamiento"/"Clínico" se cortaban en el
          borde sin indicio de scroll. En móvil se oculta el ícono para dar todo
          el ancho al texto y que ningún tab se trunque. */}
      <View style={styles.mainContent}>
        <View style={styles.tabsRow}>
          {visibleTabs.map(({ id: tid, label, icon: Icon }) => {
            const isActive = activeTab === tid;
            return (
              <TouchableOpacity
                key={tid}
                onPress={() => setActiveTab(tid)}
                style={[styles.tabPill, isActive && styles.tabPillActive]}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={label}
              >
                {webShell ? (
                  <Icon size={16} color={isActive ? commonColors.white : commonColors.textSecondary} strokeWidth={isActive ? 2.5 : 2} />
                ) : null}
                <Text style={[styles.tabText, isActive && styles.tabTextActive]} numberOfLines={1}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView 
          style={styles.scrollAreaWrapper}
          contentContainerStyle={[styles.scrollArea, webShell && styles.scrollAreaWeb]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── SECCIÓN: RESUMEN — solo lo accionable de un vistazo ── */}
          {activeTab === 'resumen' && (
            <View style={styles.dataTabContainer}>
              {/* 1. ALERTAS ACCIONABLES — lo primero porque es lo que exige acción.
                  Si hay signos de alarma pendientes, se muestran arriba con un CTA
                  directo a la pestaña Clínico donde se atienden. */}
              {(accionableAlertas.length > 0 || pendingDangerCount > 0) ? (
                <View style={[styles.alertasCard, designTokens.cardShadow]}>
                  <Text style={styles.alertasTitle}>Requiere atención</Text>
                  {pendingDangerCount > 0 && (
                    <TouchableOpacity
                      style={[styles.resumenAlertaRow, { backgroundColor: semanticColors.dangerLight || '#FEE2E2', paddingVertical: 12, paddingHorizontal: 14, borderRadius: borderRadius.md, marginBottom: 8 }]}
                      onPress={() => setActiveTab('clinico')}
                      activeOpacity={0.8}
                    >
                      <AlertTriangle size={18} color={semanticColors.danger || '#DC2626'} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ ...typography.bodyMd, fontWeight: '800', color: semanticColors.danger || '#DC2626' }}>
                          {pendingDangerCount === 1 ? '1 Signo de alarma pendiente' : `${pendingDangerCount} Signos de alarma pendientes`}
                        </Text>
                        <Text style={{ ...typography.caption, color: commonColors.textSecondary, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
                          {dangerSigns.find((s: any) => s.estado === 'pendiente')?.tipoSigno || 'Requiere evaluación'}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: semanticColors.danger || '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.sm, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: commonColors.white, fontWeight: '700', fontSize: 12 }}>Atender</Text>
                        <ChevronRight size={14} color={commonColors.white} />
                      </View>
                    </TouchableOpacity>
                  )}
                  {accionableAlertas.map((a: string, i: number) => (
                    <View key={i} style={styles.resumenAlertaRow}>
                      <AlertTriangle size={14} color={riskColors.riskRed} />
                      <Text style={styles.resumenAlertaText}>{a}</Text>
                    </View>
                  ))}
                  {/* CTA: si falta registrar controles, ofrecer la acción directa. */}
                  {(controls.length === 0 || accionableAlertas.some((a) => /control/i.test(a))) && (
                    <TouchableOpacity
                      style={styles.alertaCtaBtn}
                      onPress={() => router.push({ pathname: '/(obstetra)/control/nuevo', params: { patientId: patient.id } } as any)}
                      accessibilityRole="button"
                      accessibilityLabel="Registrar un control prenatal"
                    >
                      <Plus size={15} color={obstetraColors.onPrimary} />
                      <Text style={styles.alertaCtaText}>Registrar control</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={[styles.okCard, designTokens.cardShadow]}>
                  <CheckCircle2 size={18} color={semanticColors.success} />
                  <Text style={styles.okCardText}>Sin alertas pendientes. La gestante está al día.</Text>
                </View>
              )}

              {/* 2. AVANCE DEL EMBARAZO — la cinta como pieza central del resumen. */}
              {Number(patient.currentWeek) > 0 ? (
                <View style={[styles.card, designTokens.cardShadow]}>
                  <Text style={[styles.cardHeader, { marginBottom: spacing.sm }]}>Avance del embarazo</Text>
                  <PrenatalRibbon
                    week={Number(patient.currentWeek)}
                    colors={obstetraColors.gradient}
                    showCaption
                    milestones={ribbonMilestones}
                  />
                </View>
              ) : null}

              {/* 3. DATOS CLAVE — métricas no presentes en la cabecera (FPP / IMC). */}
              <View style={styles.resumenKpiRow}>
                <View style={[styles.resumenKpi, designTokens.cardShadow]}>
                  <CalendarHeart size={18} color={BRAND} />
                  <Text style={styles.resumenKpiVal} numberOfLines={1}>
                    {patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  </Text>
                  <Text style={styles.resumenKpiLbl} numberOfLines={1}>Fecha prob. de parto</Text>
                </View>
                <View style={[styles.resumenKpi, designTokens.cardShadow]}>
                  <Activity size={18} color={BRAND} />
                  <Text style={styles.resumenKpiVal} numberOfLines={1}>{displayImc}</Text>
                  <Text style={styles.resumenKpiLbl} numberOfLines={1}>IMC</Text>
                </View>
              </View>

              {/* Atajo a la próxima cita / agenda. */}
              <TouchableOpacity
                style={[styles.resumenLinkCard, designTokens.cardShadow]}
                onPress={() => setActiveTab('evolucion')}
                accessibilityRole="button"
                accessibilityLabel="Ver evolución y controles"
              >
                <Stethoscope size={18} color={BRAND} />
                <Text style={styles.resumenLinkText}>Ver controles y evolución del embarazo</Text>
                <ChevronRight size={18} color={commonColors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── SECCIÓN: EMBARAZO — ficha estática editable ── */}
          {activeTab === 'embarazo' && (
            <View style={styles.dataTabContainer}>
              <Text style={styles.groupLabel}>Información clínica</Text>
              <Accordion title="Datos del embarazo" icon={CalendarHeart} accentColor={BRAND} defaultOpen
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={openEmbModal} hitSlop={6}>
                    <Plus size={13} color={BRAND} />
                    <Text style={styles.addChipText}>Editar</Text>
                  </TouchableOpacity>
                )}
              >
                {/* FPP y Semanas NO se repiten aquí: ya están en el grid de
                    métricas de arriba. Este bloque guarda solo el detalle que no
                    aparece en las métricas. */}
                <Fila label="FUM" value={patient.fum} />
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
                      <TouchableOpacity onPress={() => confirmDeleteAntecedente(ant)} hitSlop={10} style={styles.antDeleteBtn} accessibilityRole="button" accessibilityLabel={`Eliminar antecedente: ${ant.condicion}`}>
                        <Trash2 size={18} color={semanticColors.danger} />
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.antEmpty}>Sin antecedentes registrados.</Text>
                )}
              </Accordion>

              <Text style={styles.groupLabel}>Datos administrativos</Text>
              <Accordion title="Datos personales" icon={User} accentColor={BRAND}
                headerAction={(
                  <TouchableOpacity style={styles.addChip} onPress={openPersonalModal} hitSlop={6}>
                    <Plus size={13} color={BRAND} />
                    <Text style={styles.addChipText}>Editar</Text>
                  </TouchableOpacity>
                )}
              >
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

          {/* ── SECCIÓN: EVOLUCIÓN (controles prenatales + gráficas + visitas) ── */}
          {activeTab === 'evolucion' && (
            <View style={styles.section}>
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
              <AlturaUterinaChart controls={controls} themeColor={BRAND} onHelpPress={() => setIsEvolucionModalVisible(true)} />

              {/* La curva de peso solo se muestra si el módulo de peso está activo. */}
              {flags.pesoRegistros && hasWeightChart && (
                <View style={[styles.card, designTokens.cardShadow, { padding: 20 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <Text style={[styles.cardHeader, { marginBottom: 2, flex: 1 }]}>Ganancia de peso</Text>
                    <TouchableOpacity
                      style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => setIsEvolucionModalVisible(true)}
                      accessibilityLabel="Ver explicación clínica de las gráficas"
                    >
                      <HelpCircle size={20} color={BRAND} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.clinicoIntro}>
                    {hasWeightBand
                      ? 'La línea azul es el peso de tu paciente. La franja verde es la ganancia recomendada para su contextura: mientras esté dentro, sube lo adecuado.'
                      : 'Peso de tu paciente por semana. Registra su peso habitual y talla para ver la franja de ganancia recomendada.'}
                  </Text>
                  <LineChartSvg
                    labels={weekLabels}
                    height={190}
                    decimals={1}
                    yAxisLabel="Peso (kg)"
                    xAxisLabel="Semanas de embarazo"
                    band={hasWeightBand ? { lower: weightLower, upper: weightUpper, color: 'rgba(31, 157, 107, 0.22)' } : undefined}
                    series={[
                      ...(hasWeightBand ? [
                        { data: weightLower, color: semanticColors.success, strokeWidth: 1.5, withDots: false, dashed: true },
                        { data: weightUpper, color: semanticColors.success, strokeWidth: 1.5, withDots: false, dashed: true },
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
          {/* ── SECCIÓN: CLÍNICO (tratamiento + vacunas + laboratorio + alarmas) ── */}
          {activeTab === 'clinico' && (
            <View style={styles.section}>
              {/* ALARMAS REPORTADAS EN PRIMER LUGAR */}
              <Seccion titulo="Signos de alarma reportados" />
              {dangerSigns.length === 0 ? (
                <View style={[styles.card, designTokens.cardShadow, { marginBottom: 16 }]}>
                  <Text style={{ ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', paddingVertical: spacing.md }}>
                    Esta gestante no ha reportado signos de alarma.
                  </Text>
                </View>
              ) : (
                <>
                  {[...dangerSigns]
                    .sort((a: any, b: any) => {
                      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
                      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
                      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    })
                    .slice(0, 1)
                    .map((s) => {
                      const grave = (s.severidad || '').toLowerCase() === 'grave';
                      const color = grave ? semanticColors.danger : semanticColors.warning;
                      const pendiente = s.estado === 'pendiente';
                      const estadoLabel = s.estado === 'atendido' ? 'Atendido' : s.estado === 'derivado' ? 'Derivado' : 'Pendiente';
                      return (
                        <View key={s.id} style={[styles.card, designTokens.cardShadow, { marginBottom: 12 }]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              <AlertTriangle size={16} color={color} />
                              <Text style={{ ...typography.bodyMd, fontWeight: '700', color: commonColors.text, flex: 1 }} numberOfLines={2}>{s.tipoSigno}</Text>
                            </View>
                            <View style={{ backgroundColor: color + '1A', paddingHorizontal: 10, paddingVertical: 3, borderRadius: borderRadius.full }}>
                              <Text style={{ ...typography.overline, color, fontWeight: '700' }}>{grave ? 'GRAVE' : 'LEVE'}</Text>
                            </View>
                          </View>
                          {s.descripcion ? (
                            <Text style={{ ...typography.bodySm, color: commonColors.textSecondary, marginBottom: 6 }}>{s.descripcion}</Text>
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
                    })}

                  {dangerSigns.length > 1 && (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        backgroundColor: BRAND + '1A',
                        paddingVertical: 12,
                        borderRadius: borderRadius.md,
                        marginBottom: 16,
                        borderWidth: 1,
                        borderColor: BRAND + '33',
                      }}
                      onPress={() => setIsAlarmHistoryModalVisible(true)}
                    >
                      <ClipboardList size={16} color={BRAND} />
                      <Text style={{ ...typography.label, color: BRAND, fontWeight: '700' }}>
                        Ver historial completo ({dangerSigns.length} reportes)
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* ── MEDICAMENTOS Y SUPLEMENTOS ── */}
              <View style={[styles.card, designTokens.cardShadow, { marginBottom: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND + '1A', alignItems: 'center', justifyContent: 'center' }}>
                    <Pill size={20} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: commonColors.text, fontWeight: '700' }}>Esquema de Medicación y Suplementos</Text>
                    <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>Prescripción preventiva y monitoreo de adherencia</Text>
                  </View>
                </View>

                {/* Acción prominente y limpia */}
                <View style={{ marginTop: 14, marginBottom: 16, width: '100%' }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: BRAND,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: borderRadius.full,
                      width: '100%',
                    }}
                    onPress={() => setIsTreatModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFF" />
                    <Text style={{ ...typography.bodySm, color: '#FFF', fontWeight: '700' }}>Recetar suplemento</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: commonColors.borderLight || '#F1F5F9', paddingTop: 12 }}>
                  {suplementos.length > 0 ? suplementos.map((sup: any, idx: number) => {
                    const tomados = sup.diasTomados?.length || 0;
                    const total = sup.totalDias || 30;
                    const pct = total > 0 ? Math.round((tomados / total) * 100) : 0;
                    const adColor = pct >= 80 ? semanticColors.success : pct >= 50 ? semanticColors.warning : semanticColors.danger;
                    const adLabel = pct >= 80 ? 'Buena adherencia' : pct >= 50 ? 'Adherencia regular' : 'Adherencia baja';
                    const suspendido = sup.estado === 'suspendido';
                    const isLast = idx === suplementos.length - 1;

                    return (
                      <View key={sup.id || sup._id} style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.md }, !isLast && { borderBottomWidth: 1, borderBottomColor: commonColors.border }, suspendido && { opacity: 0.6 }]}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                          <Pill size={20} color={BRAND} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ ...typography.bodyMd, fontWeight: '700', color: commonColors.text }}>{sup.nombre}</Text>
                            {suspendido && (
                              <Text style={{ ...typography.overline, color: semanticColors.danger, backgroundColor: semanticColors.dangerLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full, fontWeight: '700' }}>
                                Suspendido
                              </Text>
                            )}
                          </View>
                          <Text style={{ ...typography.caption, color: commonColors.textSecondary, marginTop: 2 }}>
                            {sup.dosis} • {sup.frecuencia}
                            {sup.horarios && sup.horarios.length > 0
                              ? ` • Hrs: ${sup.horarios.join(' · ')}`
                              : sup.horaRecordatorio
                              ? ` • Hrs: ${sup.horaRecordatorio}`
                              : ''}
                          </Text>
                          
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                            <View style={{ flex: 1, height: 6, backgroundColor: commonColors.border, borderRadius: 3, overflow: 'hidden' }}>
                              <View style={[{ height: 6, borderRadius: 3 }, { width: `${pct}%`, backgroundColor: adColor }]} />
                            </View>
                            <Text style={[{ ...typography.caption, fontWeight: '700', width: 36, textAlign: 'right' }, { color: adColor }]}>{pct}%</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 4 }}>
                            {!suspendido && (
                              <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full }, { backgroundColor: adColor + '1A' }]}>
                                <Text style={[{ ...typography.overline, fontWeight: '700' }, { color: adColor }]}>{adLabel}</Text>
                              </View>
                            )}
                            <Text style={{ ...typography.caption, color: commonColors.textTertiary }}>{tomados} de {total} dosis registradas</Text>
                          </View>

                          {!suspendido && (
                            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: 10 }}>
                              <TouchableOpacity style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border }} onPress={() => openEditTreat(sup)}>
                                <Text style={{ ...typography.caption, fontWeight: '600' }}>Editar</Text>
                              </TouchableOpacity>
                              <TouchableOpacity style={[{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, borderWidth: 1 }, { borderColor: semanticColors.dangerLight }]} onPress={() => setSuspendTreat(sup)}>
                                <Text style={[{ ...typography.caption, fontWeight: '600' }, { color: semanticColors.danger }]}>Suspender</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  }) : (
                    <EmptyState
                      icon={Pill as any}
                      title="Sin medicación activa"
                      description="No hay suplementos o tratamientos registrados. Presiona el botón superior para emitir una receta."
                      themeColor={BRAND}
                    />
                  )}
                </View>
              </View>

              {/* ── VACUNAS DEL EMBARAZO ── */}
              <View style={[styles.card, designTokens.cardShadow, { marginBottom: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND + '1A', alignItems: 'center', justifyContent: 'center' }}>
                    <Syringe size={20} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: commonColors.text, fontWeight: '700' }}>Vacunas del Embarazo</Text>
                    <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>
                      {vacunas.length > 0 ? `${vacunas.filter((v: any) => v.aplicada).length} de ${vacunas.length} vacunas aplicadas` : 'Inmunizaciones obligatorias MINSA'}
                    </Text>
                  </View>
                </View>

                {/* Acción prominente y limpia */}
                <View style={{ marginTop: 14, marginBottom: 16, width: '100%' }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: BRAND,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: borderRadius.full,
                      width: '100%',
                    }}
                    onPress={() => {
                      setVaxId(undefined);
                      setVaxNombre('');
                      setVaxDosis('1');
                      setVaxSemana('');
                      setVaxEstado('pendiente');
                      setIsVaxModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFF" />
                    <Text style={{ ...typography.bodySm, color: '#FFF', fontWeight: '700' }}>Registrar vacuna</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: commonColors.borderLight || '#F1F5F9', paddingTop: 12 }}>
                  {vacunas.length > 0 ? vacunas.map((v: any, idx: number) => {
                    const isLast = idx === vacunas.length - 1;
                    return (
                      <TouchableOpacity
                        key={v.id || idx}
                        style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 }, !isLast && { borderBottomWidth: 1, borderBottomColor: commonColors.border }]}
                        onPress={() => openEditVax(v)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: v.aplicada ? '#DCFCE7' : obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                            <Syringe size={18} color={v.aplicada ? semanticColors.success : BRAND} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ ...typography.bodySm, fontWeight: '700', color: commonColors.text }}>{v.nombre}</Text>
                            <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>Semana recomendada: {v.semana || 'Estándar'}</Text>
                          </View>
                        </View>
                        <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: v.aplicada ? '#DCFCE7' : BRAND }}>
                          <Text style={{ ...typography.caption, fontWeight: '700', color: v.aplicada ? semanticColors.success : '#FFF' }}>
                            {v.aplicada ? 'Aplicada' : 'Registrar'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }) : (
                    <EmptyState
                      icon={Syringe as any}
                      title="Sin esquema de vacunación"
                      description="Presiona el botón superior para registrar las inmunizaciones."
                      themeColor={BRAND}
                    />
                  )}
                </View>
              </View>

              {/* ── CONTROL DE HEMOGLOBINA Y ANEMIA ── */}
              <View style={[styles.card, designTokens.cardShadow, { marginBottom: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND + '1A', alignItems: 'center', justifyContent: 'center' }}>
                    <Droplet size={20} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: commonColors.text, fontWeight: '700' }}>Control de Hemoglobina y Anemia</Text>
                    <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>Tamizaje seriado y corrección por altitud</Text>
                  </View>
                </View>

                {/* Acción prominente y limpia */}
                <View style={{ marginTop: 14, marginBottom: 16, width: '100%' }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: BRAND,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: borderRadius.full,
                      width: '100%',
                    }}
                    onPress={() => {
                      setLabTipo('hemoglobina');
                      setLabUnidad('g/dL');
                      setLabValorText('');
                      setIsLabModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFF" />
                    <Text style={{ ...typography.bodySm, color: '#FFF', fontWeight: '700' }}>Registrar hemoglobina</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: commonColors.borderLight || '#F1F5F9', paddingTop: 12 }}>
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
              </View>

              {/* ── PANEL DE TAMIZAJES SEROLÓGICOS ── */}
              <View style={[styles.card, designTokens.cardShadow, { marginBottom: spacing.lg }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: BRAND + '1A', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} color={BRAND} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typography.h4, color: commonColors.text, fontWeight: '700' }}>Panel de Tamizajes Serológicos</Text>
                    <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>Detección de infecciones y comorbilidades obstétricas</Text>
                  </View>
                </View>

                {/* Acción prominente y limpia */}
                <View style={{ marginTop: 14, marginBottom: 16, width: '100%' }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      backgroundColor: BRAND,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderRadius: borderRadius.full,
                      width: '100%',
                    }}
                    onPress={() => {
                      setLabTipo('vih');
                      setLabResultado('');
                      setIsLabModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Plus size={16} color="#FFF" />
                    <Text style={{ ...typography.bodySm, color: '#FFF', fontWeight: '700' }}>Registrar tamizaje</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ borderTopWidth: 1, borderTopColor: commonColors.borderLight || '#F1F5F9', paddingTop: 12 }}>
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
              </View>

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
                            <Text style={{ ...typography.bodySm, fontWeight: '700', color: active ? (isBad ? semanticColors.danger : semanticColors.success) : commonColors.textSecondary }}>{opt}</Text>
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
        onClose={() => { setIsVaxModalVisible(false); setVaxId(undefined); }}
        title={vaxId ? 'Actualizar estado de vacuna' : 'Registrar vacunación'}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => { setIsVaxModalVisible(false); setVaxId(undefined); }} style={{ flex: 1 }} />
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

      {/* ── MODAL: HISTORIAL COMPLETO DE SIGNOS DE ALARMA ── */}
      <AppModal
        visible={isAlarmHistoryModalVisible}
        onClose={() => setIsAlarmHistoryModalVisible(false)}
        title={`Historial de Alarma (${dangerSigns.length})`}
        footer={
          <AppButton title="Cerrar" variant="outline" onPress={() => setIsAlarmHistoryModalVisible(false)} style={{ flex: 1 }} />
        }
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 12, paddingBottom: 10 }}>
            {dangerSigns.some((s: any) => s.estado === 'pendiente') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <AlertTriangle size={16} color={semanticColors.danger} />
                <Text style={{ ...typography.label, color: semanticColors.danger, fontWeight: '800' }}>
                  ACTIVOS PARA ATENDER ({dangerSigns.filter((s: any) => s.estado === 'pendiente').length})
                </Text>
              </View>
            )}
            {dangerSigns
              .filter((s: any) => s.estado === 'pendiente')
              .map((s: any) => {
                const grave = (s.severidad || '').toLowerCase() === 'grave';
                const color = grave ? semanticColors.danger : semanticColors.warning;
                return (
                  <View key={s.id} style={{ backgroundColor: color + '0D', borderWidth: 1.5, borderColor: color, padding: 12, borderRadius: borderRadius.md }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <AlertTriangle size={16} color={color} />
                        <Text style={{ ...typography.bodyMd, fontWeight: '700', color: commonColors.text, flex: 1 }}>{s.tipoSigno}</Text>
                      </View>
                      <View style={{ backgroundColor: color + '1A', paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full }}>
                        <Text style={{ ...typography.overline, color, fontWeight: '700' }}>{grave ? 'GRAVE' : 'LEVE'}</Text>
                      </View>
                    </View>
                    {s.descripcion ? (
                      <Text style={{ ...typography.bodySm, color: commonColors.textSecondary, marginBottom: 8 }}>{s.descripcion}</Text>
                    ) : null}
                    <Text style={{ ...typography.caption, color: commonColors.textTertiary, marginBottom: 10 }}>
                      Reportado: {new Date(s.createdAt).toLocaleString('es-PE')} · Pendiente
                    </Text>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: semanticColors.warningLight }}
                        disabled={isUpdatingDanger}
                        onPress={() => updateDangerSign({ id: s.id, gestanteId: id || '', estado: 'derivado' })}
                      >
                        <Text style={{ ...typography.label, color: semanticColors.warning, fontWeight: '700' }}>Derivar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: borderRadius.md, backgroundColor: semanticColors.successLight }}
                        disabled={isUpdatingDanger}
                        onPress={() => updateDangerSign({ id: s.id, gestanteId: id || '', estado: 'atendido' })}
                      >
                        <Text style={{ ...typography.label, color: semanticColors.success, fontWeight: '700' }}>Atender</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

            {dangerSigns.some((s: any) => s.estado !== 'pendiente') && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
                <ClipboardList size={16} color={commonColors.textSecondary} />
                <Text style={{ ...typography.label, color: commonColors.textSecondary, fontWeight: '800' }}>
                  HISTORIAL RESUELTO ({dangerSigns.filter((s: any) => s.estado !== 'pendiente').length})
                </Text>
              </View>
            )}
            {dangerSigns
              .filter((s: any) => s.estado !== 'pendiente')
              .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((s: any) => {
                const grave = (s.severidad || '').toLowerCase() === 'grave';
                const estadoLabel = s.estado === 'atendido' ? 'Atendido' : 'Derivado';
                return (
                  <View key={s.id} style={{ backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, padding: 12, borderRadius: borderRadius.md, opacity: 0.85 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                        <CheckCircle2 size={16} color={semanticColors.success} />
                        <Text style={{ ...typography.bodyMd, fontWeight: '600', color: commonColors.text, flex: 1 }}>{s.tipoSigno}</Text>
                      </View>
                      <View style={{ backgroundColor: semanticColors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full }}>
                        <Text style={{ ...typography.overline, color: semanticColors.success, fontWeight: '700' }}>{estadoLabel.toUpperCase()}</Text>
                      </View>
                    </View>
                    {s.descripcion ? (
                      <Text style={{ ...typography.bodySm, color: commonColors.textSecondary, marginBottom: 4 }}>{s.descripcion}</Text>
                    ) : null}
                    <Text style={{ ...typography.caption, color: commonColors.textTertiary }}>
                      Reportado: {new Date(s.createdAt).toLocaleString('es-PE')}
                    </Text>
                  </View>
                );
              })}
          </View>
        </ScrollView>
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
          <ScheduleSelector
            frecuencia={treatFrecuencia}
            onFrecuenciaChange={setTreatFrecuencia}
            horarios={treatHorarios}
            onHorariosChange={setTreatHorarios}
            themeColor={BRAND}
          />
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

      {/* ── MODAL: EDITAR DATOS PERSONALES (issue #36) ── */}
      <AppModal
        visible={isPersonalModalVisible}
        onClose={() => setIsPersonalModalVisible(false)}
        title="Editar datos personales"
        subtitle="Modifica o completa los datos personales de la gestante."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsPersonalModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar" onPress={handleSavePersonal} style={{ flex: 1 }} themeColor={BRAND} loading={isSavingEmb} disabled={isSavingEmb} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Nombres *" placeholder="Ej. María" value={pFirstName} onChangeText={setPFirstName} themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Apellidos *" placeholder="Ej. Pérez Gómez" value={pLastName} onChangeText={setPLastName} themeColor={BRAND} />
            </View>
          </View>
          <DateTimeField
            label="Fecha de nacimiento"
            mode="date"
            value={pFechaNac}
            onChange={setPFechaNac}
            themeColor={BRAND}
            maximumDate={new Date()}
            placeholder="Seleccionar fecha"
          />
          <PlainInput label="N° Historia Clínica" placeholder="Ej. HC-12345" value={pHistoriaClinica} onChangeText={setPHistoriaClinica} themeColor={BRAND} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Teléfono" placeholder="Ej. 987654321" value={pPhone} onChangeText={setPPhone} keyboardType="phone-pad" themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Tel. acompañante" placeholder="Ej. 987654321" value={pAcompanante} onChangeText={setPAcompanante} keyboardType="phone-pad" themeColor={BRAND} />
            </View>
          </View>
          <PlainInput label="Dirección" placeholder="Ej. Jr. Lima 123" value={pDireccion} onChangeText={setPDireccion} themeColor={BRAND} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <PlainInput label="Localidad" placeholder="Ej. Talavera" value={pLocalidad} onChangeText={setPLocalidad} themeColor={BRAND} />
            </View>
            <View style={{ flex: 1 }}>
              <PlainInput label="Código SIS" placeholder="Ej. 12345678" value={pCodigoSis} onChangeText={setPCodigoSis} themeColor={BRAND} />
            </View>
          </View>
          <PlainInput label="Ocupación" placeholder="Ej. Comerciante" value={pOcupacion} onChangeText={setPOcupacion} themeColor={BRAND} />
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

      {/* ── MODAL: GUÍA CLÍNICA EVOLUCIÓN ── */}
      <AppModal
        visible={isEvolucionModalVisible}
        onClose={() => setIsEvolucionModalVisible(false)}
        title="Guía Clínica de Evolución"
        subtitle="Monitoreo e interpretación de gráficas"
        footer={
          <AppButton title="Entendido" onPress={() => setIsEvolucionModalVisible(false)} style={{ flex: 1 }} themeColor={BRAND} />
        }
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: spacing.md, paddingBottom: spacing.md }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Stethoscope size={18} color={BRAND} />
                <Text style={[styles.cardHeader, { fontSize: 16, color: BRAND }]}>¿Para qué ayuda esta sección?</Text>
              </View>
              <Text style={[styles.clinicoIntro, { fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                Permite la vigilancia progresiva (control a control) del desarrollo materno-fetal para la toma de decisiones clínicas rápidas y detección temprana de alertas clínicas.
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: commonColors.borderLight }} />

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Activity size={18} color={semanticColors.success} />
                <Text style={[styles.cardHeader, { fontSize: 16 }]}>Altura Uterina (Crecimiento Fetal)</Text>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: semanticColors.success, fontWeight: '700' }}>•</Text>
                  <Text style={[styles.clinicoIntro, { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                    <Text style={{ fontWeight: '700', color: semanticColors.success }}>Franja Verde:</Text> Curvas de referencia P10 a P90 según los estándares oficiales CLAP/SISP (OPS/OMS) y MINSA para la edad gestacional.
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: semanticColors.danger, fontWeight: '700' }}>•</Text>
                  <Text style={[styles.clinicoIntro, { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                    <Text style={{ fontWeight: '700', color: semanticColors.danger }}>Alerta clínica:</Text> Si el punto cae por debajo, descartar RCIU u oligohidramnios. Si está por encima, evaluar macrosomía o polihidramnios.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: commonColors.borderLight }} />

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Scale size={18} color={semanticColors.success} />
                <Text style={[styles.cardHeader, { fontSize: 16 }]}>Ganancia de Peso Materno</Text>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: semanticColors.success, fontWeight: '700' }}>•</Text>
                  <Text style={[styles.clinicoIntro, { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                    <Text style={{ fontWeight: '700', color: semanticColors.success }}>Franja Verde:</Text> Rango ideal de ganancia en kg proyectado desde el IMC pregestacional de la paciente según estándares internacionales del IOM (Institute of Medicine).
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                  <Text style={{ fontSize: 13, lineHeight: 19, color: semanticColors.danger, fontWeight: '700' }}>•</Text>
                  <Text style={[styles.clinicoIntro, { flex: 1, fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                    <Text style={{ fontWeight: '700', color: semanticColors.danger }}>Alerta clínica:</Text> Previene preeclampsia, diabetes gestacional o bajo peso al nacer.
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: commonColors.borderLight }} />

            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ClipboardList size={18} color={commonColors.text} />
                <Text style={[styles.cardHeader, { fontSize: 16 }]}>Registro de Datos</Text>
              </View>
              <Text style={[styles.clinicoIntro, { fontSize: 13, lineHeight: 19, textAlign: 'left' }]}>
                Se actualizan de forma automática cada vez que registras una atención en <Text style={{ fontWeight: '700', color: commonColors.text }}>+ Nuevo Control</Text> o en una <Text style={{ fontWeight: '700', color: commonColors.text }}>Visita Domiciliaria</Text>. El peso habitual y talla se configuran en los antecedentes de la paciente.
              </Text>
            </View>
          </View>
        </ScrollView>
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
          <ScheduleSelector
            frecuencia={editFrecuencia}
            onFrecuenciaChange={setEditFrecuencia}
            horarios={editHorarios}
            onHorariosChange={setEditHorarios}
            themeColor={BRAND}
          />
          <PlainInput label="Duración (días)" keyboardType="numeric" value={editDuracion} onChangeText={setEditDuracion} themeColor={BRAND} />
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
              title="Enviar"
              onPress={handleRecommend}
              style={{ flex: 1.5 }}
              themeColor={BRAND}
              loading={isRecommending}
              disabled={isRecommending}
            />
          </>
        ) : undefined}
      >
        {!recSelected ? (
          <>
            <View style={{ marginBottom: spacing.md }}>
              <SearchField
                value={recSearch}
                onChangeText={setRecSearch}
                placeholder="Buscar por título o categoría…"
                themeColor={BRAND}
              />
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
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.recRow, { paddingVertical: 10 }]}
                      onPress={() => openRecDetail(c)}
                      activeOpacity={0.7}
                    >
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.recThumb} resizeMode="cover" />
                      ) : (
                        <View style={[styles.recIcon, { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.borderLight }]}>
                          <CIcon size={20} color={BRAND} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recRowCat, { color: BRAND }]} numberOfLines={1}>{cm.label}</Text>
                        <Text style={styles.recTitle} numberOfLines={2}>{c.titulo}</Text>
                        <Text style={styles.recMeta}>{tm.label}{c.trimestre ? ` · ${c.trimestre}° trim` : ''} · {readingTime(c.contenido, c.duracionMin)}</Text>
                      </View>
                      <ChevronRight size={18} color={commonColors.textTertiary} />
                    </TouchableOpacity>
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
                  {/* Tarjeta compacta del recurso */}
                  <View style={[styles.recArticleCard, { padding: 14, gap: 10, borderWidth: 1, borderColor: commonColors.borderLight }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />
                      ) : (
                        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: commonColors.borderLight }}>
                          <CIcon size={22} color={BRAND} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={[styles.recCatBadgeText, { color: BRAND }]}>{cm.label}</Text>
                          <Text style={{ color: commonColors.textTertiary }}>·</Text>
                          <Text style={{ fontSize: 11, color: commonColors.textSecondary, fontWeight: '600' }}>{tm.label}</Text>
                        </View>
                        <Text style={[styles.recArticleTitle, { marginTop: 0, fontSize: 15 }]}>{recSelected.titulo}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 6, borderTopWidth: 1, borderTopColor: commonColors.borderLight }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} color={commonColors.textSecondary} />
                        <Text style={{ fontSize: 12, color: commonColors.textSecondary }}>{readingTime(body, recSelected.duracionMin)}</Text>
                      </View>
                      {recSelected.trimestre ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <CalendarClock size={14} color={commonColors.textSecondary} />
                          <Text style={{ fontSize: 12, color: commonColors.textSecondary }}>{recSelected.trimestre}° trimestre</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* Recurso multimedia (si existe) */}
                  {media ? (
                    <TouchableOpacity style={[styles.recMediaCard, { marginTop: 12 }]} onPress={() => Linking.openURL(media)} activeOpacity={0.85}>
                      {isPlayable ? <PlayCircle size={20} color={BRAND} /> : <ExternalLink size={18} color={BRAND} />}
                      <Text style={styles.recMediaText}>
                        {recSelected.tipo === 'video' ? 'Ver video' : recSelected.tipo === 'audio' ? 'Escuchar audio' : 'Abrir recurso'}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {/* Resumen del contenido */}
                  {body ? (
                    <View style={{ marginTop: 12 }}>
                      <Text style={[styles.recSectionLabel, { marginBottom: 6 }]}>Resumen del contenido</Text>
                      <View style={[styles.recBodyWrap, { padding: 12 }]}>
                        <RichText content={bodyPreview} accentColor={BRAND} />
                        {isLong ? (
                          <TouchableOpacity
                            style={[styles.recExpandBtn, { marginTop: 8, paddingTop: 8 }]}
                            onPress={() => setRecBodyExpanded((v) => !v)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.recExpandText, { color: BRAND }]}>
                              {showFullBody ? 'Ver menos' : 'Leer todo'}
                            </Text>
                            {showFullBody ? <ChevronUp size={16} color={BRAND} /> : <ChevronDown size={16} color={BRAND} />}
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  {/* Envío y Nota personalizada */}
                  <View style={{ marginTop: 14, borderTopWidth: 1, borderTopColor: commonColors.borderLight, paddingTop: 14 }}>
                    <PlainInput
                      label="Nota personalizada para la gestante (opcional)"
                      placeholder="Ej. Léelo antes de tu próxima cita del martes."
                      multiline
                      value={recNota}
                      onChangeText={setRecNota}
                      themeColor={BRAND}
                    />
                  </View>

                  {/* Vista previa profesional del mensaje (WhatsApp / App) */}
                  <View style={{ marginTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <WhatsAppIcon size={16} />
                      <Text style={[styles.recSectionLabel, { marginBottom: 0 }]}>Vista previa del mensaje</Text>
                    </View>

                    <View style={[styles.recPreviewBubble, { padding: 0, overflow: 'hidden', borderWidth: 1, borderColor: commonColors.borderLight }]}>
                      <View style={{ backgroundColor: commonColors.surfaceAlt, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight }}>
                        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: BRAND, alignItems: 'center', justifyContent: 'center' }}>
                          <Send size={11} color="#FFF" />
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: BRAND, flex: 1 }}>Recomendación clínica de VitMaterna</Text>
                      </View>

                      <View style={{ padding: 14, gap: 12 }}>
                        <Text style={[styles.recPreviewNote, { marginBottom: 0, color: commonColors.text, fontWeight: '500' }]}>
                          Hola {patient.firstName}, tu obstetra te sugiere revisar este material educativo:
                        </Text>

                        {recNota.trim() ? (
                          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: commonColors.surfaceAlt, padding: 10, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: BRAND }}>
                            <Text style={{ fontSize: 13, color: commonColors.text, fontStyle: 'italic', flex: 1 }}>
                              "{recNota.trim()}"
                            </Text>
                          </View>
                        ) : null}

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: commonColors.surfaceAlt, borderRadius: 10, borderWidth: 1, borderColor: commonColors.borderLight }}>
                          {thumb ? (
                            <Image source={{ uri: thumb }} style={{ width: 40, height: 40, borderRadius: 8 }} resizeMode="cover" />
                          ) : (
                            <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: commonColors.borderLight }}>
                              <CIcon size={20} color={BRAND} />
                            </View>
                          )}
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: BRAND }}>{cm.label}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: commonColors.text }} numberOfLines={1}>{recSelected.titulo}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                              <Clock size={11} color={commonColors.textSecondary} />
                              <Text style={{ fontSize: 11, color: commonColors.textSecondary }}>{readingTime(body, recSelected.duracionMin)}</Text>
                            </View>
                          </View>
                          <ChevronRight size={18} color={commonColors.textTertiary} />
                        </View>
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

  recEmpty: { ...typography.bodySm, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.xl },
  recRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  recRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingVertical: spacing.xs2 },
  recIcon: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  recThumb: { width: 44, height: 44, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, flexShrink: 0 },
  recRowCat: { ...typography.overline, fontSize: 10, marginBottom: 2 },
  recTitle: { ...typography.bodyMd, color: commonColors.text, fontWeight: '600' },
  recMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  // Tarjeta tipo "artículo" en el detalle del recurso.
  recArticleCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, overflow: 'hidden', ...shadows.card },
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
  recMediaText: { ...typography.bodyMd, fontWeight: '700', color: BRAND },
  // Cuerpo del contenido (lectura).
  recSectionLabel: { ...typography.overline, color: commonColors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  recBodyWrap: { backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  recEmptyBody: { ...typography.bodySm, color: commonColors.textTertiary, fontStyle: 'italic', backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  recExpandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  recExpandText: { ...typography.caption, fontWeight: '700' },
  recDivider: { height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.xs },
  recPreviewBubble: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.sm2, ...shadows.card },
  recPreviewNote: { ...typography.bodySm, color: commonColors.text, marginBottom: spacing.sm, lineHeight: 19 },
  recPreviewCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.sm2, borderWidth: 1, borderColor: commonColors.border },
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  
  // Header gradient
  headerContainer: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ? StatusBar.currentHeight : 24) : 0,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
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
  // Chip de riesgo en la cabecera (sobre gradiente)
  headerRiskChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  headerRiskDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: commonColors.white },
  headerRiskText: { ...typography.caption, fontWeight: '800', color: commonColors.white },
  // Estado clínico en línea (sobre gradiente)
  headerStatusRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: commonColors.onColorSurfaceFaint,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm2,
    marginTop: spacing.md,
  },
  headerStat: { flex: 1, alignItems: 'center', paddingHorizontal: spacing.xs },
  headerStatVal: { ...typography.bodyMd, fontWeight: '800', color: commonColors.white },
  headerStatUnit: { ...typography.caption, fontWeight: '700', color: commonColors.onColorTextSoft },
  headerStatLbl: { ...typography.caption, color: commonColors.onColorTextSoft, marginTop: 2 },
  headerStatDivider: { width: 1, alignSelf: 'stretch', backgroundColor: commonColors.onColorSurfaceStrong, marginVertical: 4 },
  // Resumen — tarjeta "sin alertas"
  okCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: semanticColors.successLight,
    borderRadius: borderRadius.xl, padding: spacing.lg,
  },
  okCardText: { flex: 1, ...typography.bodySm, color: commonColors.text, fontWeight: '600' },
  // Resumen — KPIs (FPP / IMC)
  resumenKpiRow: { flexDirection: 'row', gap: spacing.sm },
  resumenKpi: {
    flex: 1, backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl, padding: spacing.md, gap: 4,
  },
  resumenKpiVal: { ...typography.bodyMd, fontWeight: '800', color: commonColors.text, marginTop: 4 },
  resumenKpiLbl: { ...typography.caption, color: commonColors.textSecondary },
  // Resumen — tarjeta-atajo
  resumenLinkCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl, padding: spacing.lg,
  },
  resumenLinkText: { flex: 1, ...typography.bodySm, fontWeight: '600', color: commonColors.text },
  // Main Content
  mainContent: {
    flex: 1,
    marginTop: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: spacing.xs2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surfaceAlt,
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
    // Separación uniforme entre tarjetas (antes los márgenes sueltos hacían
    // que algunas quedaran pegadas y otras no).
    gap: spacing.md,
  },

  // Banner de estado clínico (lo crítico siempre arriba)
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
    gap: 8,
  },
  // CTA dentro de la tarjeta de alertas (p. ej. "Registrar control").
  alertaCtaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: obstetraColors.primary,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    marginTop: 2,
  },
  alertaCtaText: { ...typography.buttonSm, color: obstetraColors.onPrimary },
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
  weightSummary: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: spacing.sm, textAlign: 'center' },
  weightSummaryStrong: { color: commonColors.text, fontFamily: typography.label.fontFamily, fontWeight: '700' },
  labGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  labGroupTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
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
  tamizajesTitle: { ...typography.bodySm, fontFamily: typography.label.fontFamily, fontWeight: '700', color: commonColors.text },
  tamizajesDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  tamizajesIntro: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.md, lineHeight: 20 },
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
    ...typography.bodyMd,
    color: commonColors.text,
  },
  ctrlSubtitle: {
    ...typography.bodySm,
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
    ...typography.bodySm,
    color: commonColors.textTertiary,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
    textAlign: 'center',
  },
  ctrlExtra: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: spacing.sm },
  ctrlExtraStrong: { color: commonColors.text, fontFamily: typography.label.fontFamily, fontWeight: '700' },
  ctrlObsBox: {
    marginTop: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 12,
    padding: spacing.md,
  },
  ctrlObsText: { ...typography.bodySm, color: commonColors.text, lineHeight: 20 },
  ctrlNextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  ctrlNextText: { ...typography.caption, color: commonColors.textSecondary },
  ctrlMetricVal: {
    ...typography.bodySm,
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
    ...typography.bodyMd,
    color: commonColors.text,
  },
  pillDosis: {
    ...typography.bodySm,
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
  },
  alertBannerTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  alertBannerTitle: {
    ...typography.bodySm,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: semanticColors.danger,
    marginBottom: 4,
  },
  alertBannerDesc: {
    ...typography.bodySm,
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
    ...typography.bodySm,
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
    ...typography.bodyMd,
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
  antCondicion: { ...typography.bodyMd, color: commonColors.text },
  antMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  antDeleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: semanticColors.dangerLight },
  antEmpty: { ...typography.bodySm, color: commonColors.textSecondary, padding: 16 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center', backgroundColor: commonColors.surface },
  segmentActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  segmentText: { ...typography.bodySm, color: commonColors.textSecondary },
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
  treatActionText: { ...typography.buttonSm, color: commonColors.text },
  suspendHint: { ...typography.bodySm, color: commonColors.textSecondary, lineHeight: 20 },
});
