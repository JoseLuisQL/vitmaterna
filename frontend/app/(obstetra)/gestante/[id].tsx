import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity, Dimensions,
  StatusBar, Platform, Modal, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, User, Stethoscope, Pill, FlaskConical,
  Syringe, AlertTriangle, Activity, Check, Plus, ClipboardList
} from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';
import { usePatientProfile, useCreateLabResult, useCreateVaccine, useCreateTreatment } from '../../../src/services/api-queries';

const { width: screenWidth } = Dimensions.get('window');
const BRAND = obstetraColors.primary;

/** Convierte un color hex (#RRGGBB) a rgba() para react-native-chart-kit. */
const hexToRgba = (hex: string, opacity = 1): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

// ─── TABS ────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'datos', label: 'Datos', icon: User },
  { id: 'controles', label: 'Controles', icon: Stethoscope },
  { id: 'tratamiento', label: 'Medicinas', icon: Pill },
  { id: 'laboratorio', label: 'Lab.', icon: FlaskConical },
  { id: 'vacunas', label: 'Vacunas', icon: Syringe },
];

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const designTokens = {
  cardShadow: shadows.xs,
  glassShadow: shadows.sm,
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

function CustomBadge({ label, riskLevel }: { label: string; riskLevel: string }) {
  let bg: string = commonColors.surfaceAlt;
  let text: string = commonColors.textSecondary;
  if (riskLevel === 'Alto') { bg = riskColors.riskRedLight; text = riskColors.riskRed; }
  else if (riskLevel === 'Medio') { bg = riskColors.riskYellowLight; text = riskColors.riskYellow; }
  else if (riskLevel === 'Bajo') { bg = riskColors.riskGreenLight; text = riskColors.riskGreen; }

  return (
    <View style={[badgeStyles.container, { backgroundColor: bg, borderWidth: 1, borderColor: text + '20' }]}>
      <View style={[badgeStyles.dot, { backgroundColor: text }]} />
      <Text style={[badgeStyles.text, { color: text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    ...typography.overline,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  }
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function PatientProfileScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('datos');

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

  // Mutations
  const { mutate: createLabResult, isPending: isSavingLab } = useCreateLabResult();
  const { mutate: createVaccine, isPending: isSavingVax } = useCreateVaccine();
  const { mutate: createTreatment, isPending: isSavingTreat } = useCreateTreatment();

  const handleSaveLab = () => {
    if (!labTipo) return Alert.alert('Error', 'El tipo de examen es requerido.');
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
        Alert.alert('Éxito', 'Resultado de laboratorio registrado.');
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
        Alert.alert('Error', 'No se pudo registrar el examen.');
      }
    });
  };

  const handleSaveVax = () => {
    if (!vaxNombre) return Alert.alert('Error', 'El nombre de la vacuna es requerido.');
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
        Alert.alert('Éxito', 'Registro de vacuna guardado.');
        setIsVaxModalVisible(false);
        setVaxNombre('');
        setVaxDosis('1');
        setVaxSemana('');
        setVaxEstado('aplicada');
      },
      onError: () => {
        Alert.alert('Error', 'No se pudo registrar la vacuna.');
      }
    });
  };

  const handleSaveTreat = () => {
    if (!treatNombre) return Alert.alert('Error', 'El nombre del medicamento es requerido.');
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
        Alert.alert('Éxito', 'Tratamiento asignado correctamente.');
        setIsTreatModalVisible(false);
        setTreatNombre('');
        setTreatDosis('1 tableta');
        setTreatFrecuencia('Diario');
        setTreatHora('08:00');
        setTreatDuracion('30');
      },
      onError: () => {
        Alert.alert('Error', 'No se pudo asignar el tratamiento.');
      }
    });
  };

  if (isLoading) return <LoadingScreen message="Cargando historia clínica..." />;

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
  const weightData = controls.length >= 2
    ? controls.map((c: any) => c.weight || 60)
    : [60, 62, 64];
  const weekLabels = controls.length >= 2
    ? controls.map((c: any) => `S${c.week || ''}`)
    : ['S12', 'S20', 'S28'];

  const lab = patient.laboratorio || {};
  const vacunas = patient.vacunas || [];
  const suplementos = patient.suplementos || [];

  const imcVal = Number(patient.imc);
  const displayImc = !isNaN(imcVal) && imcVal > 0 && imcVal < 100 ? imcVal.toFixed(1) : '—';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      
      {/* ── HEADER MINIMALISTA ── */}
      <View style={styles.headerContainer}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={24} color={commonColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Historia Clínica</Text>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push({
              pathname: '/(obstetra)/gestante/tamizajes',
              params: { id: patient.id, nombre: `${patient.firstName} ${patient.lastName}` },
            } as any)}
          >
            <ClipboardList size={22} color={commonColors.text} />
          </TouchableOpacity>
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
            <Text style={styles.patientSub}>DNI {patient.documentNumber} • {patient.age || 28} años</Text>
          </View>
          <CustomBadge label={`Riesgo ${patient.riskLevel || 'Bajo'}`} riskLevel={patient.riskLevel} />
        </View>
      </View>

      {/* ── KPI HIGHLIGHTS ── */}
      <View style={styles.kpiWrapper}>
        <View style={styles.kpiGrid}>
          {[
            { label: 'Semana', value: `${patient.currentWeek || '—'}` },
            { label: 'Trimestre', value: patient.currentTrimester ? `${patient.currentTrimester}°` : '—' },
            { label: 'FPP', value: patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE', { month: 'short', day: 'numeric' }) : '—' },
            { label: 'IMC', value: displayImc },
          ].map((kpi, idx) => (
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
          {TABS.map(({ id: tid, label, icon: Icon }) => {
            const isActive = activeTab === tid;
            return (
              <TouchableOpacity
                key={tid}
                onPress={() => setActiveTab(tid)}
                style={[
                  styles.tabLine,
                  isActive && styles.tabLineActive
                ]}
              >
                <Icon size={16} color={isActive ? BRAND : commonColors.textSecondary} strokeWidth={isActive ? 2.5 : 2} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView 
          contentContainerStyle={styles.scrollArea} 
          showsVerticalScrollIndicator={false}
        >
          {/* ── TAB: DATOS ── */}
          {activeTab === 'datos' && (
            <View style={styles.dataTabContainer}>
              <Seccion titulo="Datos Personales" />
              <View style={[styles.insetGroup, designTokens.cardShadow]}>
                <Fila label="Nombre completo" value={`${patient.firstName} ${patient.lastName}`} />
                <Fila label="DNI" value={patient.documentNumber} />
                <Fila label="Edad" value={patient.age ? `${patient.age} años` : undefined} />
                <Fila label="Teléfono" value={patient.phone} />
                <Fila label="Dirección" value={patient.address} />
                <Fila label="Estado civil" value={patient.maritalStatus} />
                <Fila label="Ocupación" value={patient.occupation} />
                <Fila label="Estudios" value={patient.education} />
                <Fila label="Código SIS" value={patient.sisCode} isLast />
              </View>

              <Seccion titulo="Antecedentes Obstétricos" />
              <View style={[styles.insetGroup, designTokens.cardShadow]}>
                <Fila label="Gestaciones (G)" value={patient.gestaciones} />
                <Fila label="Partos (P)" value={patient.partos} />
                <Fila label="Cesáreas (C)" value={patient.cesareas} />
                <Fila label="Abortos (A)" value={patient.abortos} isLast />
              </View>

              <Seccion titulo="Datos del Embarazo" />
              <View style={[styles.insetGroup, designTokens.cardShadow]}>
                <Fila label="FUM" value={patient.fum} />
                <Fila label="FPP" value={patient.estimatedDueDate ? new Date(patient.estimatedDueDate).toLocaleDateString('es-PE') : undefined} />
                <Fila label="Semanas" value={patient.currentWeek ? `${patient.currentWeek} semanas` : undefined} />
                <Fila label="Peso habitual" value={patient.pesoHabitual ? `${patient.pesoHabitual} kg` : undefined} />
                <Fila label="Talla" value={patient.talla ? `${patient.talla} cm` : undefined} />
                <Fila label="Grupo sanguíneo" value={patient.bloodType} isLast />
              </View>

              <Seccion titulo="Tamizajes y registros clínicos" />
              <TouchableOpacity
                style={[styles.tamizajesBtn, designTokens.cardShadow]}
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
                  <Text style={styles.tamizajesTitle}>SRQ-18, violencia, patologías y más</Text>
                  <Text style={styles.tamizajesDesc}>Registrar tamizajes, consejería nutricional y peso</Text>
                </View>
                <Plus size={20} color={commonColors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── TAB: CONTROLES ── */}
          {activeTab === 'controles' && (
            <View style={styles.section}>
              {controls.length >= 2 && (
                <View style={[styles.card, designTokens.cardShadow, { padding: 20 }]}>
                  <Text style={styles.cardHeader}>Curva de Ganancia de Peso</Text>
                  <LineChart
                    data={{
                      labels: weekLabels,
                      datasets: [{ data: weightData, color: () => BRAND, strokeWidth: 3 }],
                    }}
                    width={screenWidth - 72}
                    height={180}
                    chartConfig={{
                      backgroundColor: commonColors.surface,
                      backgroundGradientFrom: commonColors.surface,
                      backgroundGradientTo: commonColors.surface,
                      decimalPlaces: 1,
                      color: (opacity = 1) => hexToRgba(BRAND, opacity),
                      labelColor: (opacity = 1) => hexToRgba(commonColors.textSecondary, opacity),
                      propsForDots: { r: '4', strokeWidth: '2', stroke: BRAND },
                    }}
                    bezier
                    style={{ marginLeft: -10, marginTop: 10 }}
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
            </View>
          )}

          {/* ── TAB: TRATAMIENTO ── */}
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
                  
                  return (
                    <View key={sup.id || sup._id} style={[styles.pillCard, designTokens.glassShadow]}>
                      <View style={styles.pillIconBox}>
                        <Pill size={24} color={BRAND} />
                      </View>
                      <View style={styles.pillInfo}>
                        <Text style={styles.pillName}>{sup.nombre}</Text>
                        <Text style={styles.pillDosis}>{sup.dosis} • {sup.frecuencia}</Text>
                        
                        <View style={styles.progressWrap}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: isGood ? semanticColors.success : semanticColors.warning }]} />
                          </View>
                          <Text style={[styles.progressPct, { color: isGood ? semanticColors.success : semanticColors.warning }]}>{pct}%</Text>
                        </View>
                        <Text style={styles.progressHint}>{tomados} de {total} dosis tomadas</Text>
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
            </View>
          )}

          {/* ── TAB: LABORATORIO ── */}
          {activeTab === 'laboratorio' && (
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
          )}

          {/* ── TAB: VACUNAS ── */}
          {activeTab === 'vacunas' && (
            <View style={[styles.card, designTokens.cardShadow]}>
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
          )}
        </ScrollView>
      </View>

      {/* ── MODAL: REGISTRAR EXAMEN ── */}
      <Modal
        visible={isLabModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsLabModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Registrar Examen de Laboratorio</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Tipo de Examen</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Hemoglobina, Glucemia, VIH..."
                  value={labTipo}
                  onChangeText={setLabTipo}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Número de Toma</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 1, 2, 3"
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
                  value={labValorText}
                  onChangeText={setLabValorText}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Unidad (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. g/dL, mg/dL"
                  value={labUnidad}
                  onChangeText={setLabUnidad}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Resultado (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Normal, Anemia Leve..."
                  value={labResultado}
                  onChangeText={setLabResultado}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Observaciones</Text>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  placeholder="Notas adicionales..."
                  multiline
                  value={labObs}
                  onChangeText={setLabObs}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsLabModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveLab} disabled={isSavingLab}>
                {isSavingLab ? (
                  <ActivityIndicator color={obstetraColors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: REGISTRAR VACUNA ── */}
      <Modal
        visible={isVaxModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVaxModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Registrar Vacunación</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Nombre de la Vacuna</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Influenza, Tétanos..."
                  value={vaxNombre}
                  onChangeText={setVaxNombre}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Número de Dosis</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 1, 2"
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
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsVaxModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveVax} disabled={isSavingVax}>
                {isSavingVax ? (
                  <ActivityIndicator color={obstetraColors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── MODAL: REGISTRAR TRATAMIENTO ── */}
      <Modal
        visible={isTreatModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsTreatModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Asignar Tratamiento</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Medicamento</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Sulfato Ferroso + Ácido Fólico"
                  value={treatNombre}
                  onChangeText={setTreatNombre}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Dosis</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 1 tableta, 60mg"
                  value={treatDosis}
                  onChangeText={setTreatDosis}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Frecuencia</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. Diario, Cada 8 horas"
                  value={treatFrecuencia}
                  onChangeText={setTreatFrecuencia}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Horario de Recordatorio</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 08:00"
                  value={treatHora}
                  onChangeText={setTreatHora}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Duración (Días)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Ej. 30"
                  keyboardType="numeric"
                  value={treatDuracion}
                  onChangeText={setTreatDuracion}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsTreatModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTreat} disabled={isSavingTreat}>
                {isSavingTreat ? (
                  <ActivityIndicator color={obstetraColors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Asignar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  
  // Header Minimalista
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
  },
  headerNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBtn: {
    width: 40, height: 40,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  headerTitle: {
    ...typography.h3,
    color: commonColors.text,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 56, height: 56,
    borderRadius: 28,
    backgroundColor: obstetraColors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  avatarText: {
    ...typography.h3,
    color: BRAND,
  },
  headerInfo: {
    flex: 1,
    marginRight: 12,
  },
  patientName: {
    ...typography.h2,
    color: commonColors.text,
    marginBottom: 2,
  },
  patientSub: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },

  // KPIs
  kpiWrapper: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  kpiValue: {
    ...typography.h3,
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
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  tabsScrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  tabLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLineActive: {
    borderBottomColor: BRAND,
  },
  tabText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.textTertiary,
    marginLeft: 6,
  },
  tabTextActive: {
    color: BRAND,
  },
  scrollArea: {
    padding: 16,
    paddingBottom: 80,
  },
  dataTabContainer: {
    marginTop: -4,
  },
  insetGroup: {
    backgroundColor: commonColors.surface,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  section: {
    gap: 16,
  },

  // Cards
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: commonColors.border,
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
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
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  primaryActionText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: obstetraColors.onPrimary,
  },

  controlCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  ctrlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ctrlDateBox: {
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 12,
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: commonColors.border,
    marginRight: 16,
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
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
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
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
    marginTop: 8,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: semanticColors.danger,
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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.bodySmall,
    fontSize: 15,
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
});
