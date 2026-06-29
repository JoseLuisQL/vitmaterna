import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  TextInput, Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import {
  Plus, Brain, ShieldAlert, Stethoscope, Apple, Scale, Activity, Smile,
} from 'lucide-react-native';
import { AppModal, AppButton, useToast } from '../../../src/components/ui';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import {
  useCreatePathology,
  useCreateMentalHealthScreening,
  useCreateViolenceScreening,
  useCreateNutritionalCounseling,
  useCreateWeightRecord,
  useCreateUltrasound,
  useCreateDentalRecord,
} from '../../../src/services/api-queries';
import { commonColors, obstetraColors, gestanteColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { WebMaxWidth } from '../../../src/components/web';
import { useResponsive } from '../../../src/theme/responsive';
import { shadows } from '../../../src/theme/shadows';
import { useFeatureFlags, type FeatureModule } from '../../../src/hooks/useFeatureFlags';

const PINK = obstetraColors.primary;
const hoy = () => new Date().toISOString().split('T')[0];

type FormKey = 'patologia' | 'mental' | 'violencia' | 'nutricion' | 'peso' | 'ecografia' | 'odontograma';

/** Cada registro de esta pantalla depende de su feature flag (alcance del sistema). */
const FORM_FLAG: Record<FormKey, FeatureModule> = {
  mental: 'tamizajeSaludMental',
  violencia: 'tamizajeViolencia',
  patologia: 'patologias',
  ecografia: 'ecografias',
  nutricion: 'consejeriaNutricional',
  peso: 'pesoRegistros',
  odontograma: 'odontograma',
};

export default function TamizajesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const gestanteId = id || '';
  const flags = useFeatureFlags();

  const [openForm, setOpenForm] = useState<FormKey | null>(null);

  // Mutations
  const pathology = useCreatePathology();
  const mental = useCreateMentalHealthScreening();
  const violence = useCreateViolenceScreening();
  const nutrition = useCreateNutritionalCounseling();
  const weight = useCreateWeightRecord();
  const ultrasound = useCreateUltrasound();
  const dental = useCreateDentalRecord();

  // ── Patología (CIE-10) ──
  const [cie10, setCie10] = useState('');
  const [patDesc, setPatDesc] = useState('');

  // ── SRQ-18 (salud mental) ──
  const [p118, setP118] = useState('');
  const [p1922, setP1922] = useState('');
  const [p23, setP23] = useState(false);
  const [p2428, setP2428] = useState('');
  const [mentalObs, setMentalObs] = useState('');

  // ── Violencia ──
  const [vioPuntaje, setVioPuntaje] = useState('');
  const [vioObs, setVioObs] = useState('');

  // ── Consejería nutricional ──
  const [nutHist, setNutHist] = useState('');
  const [nutAnimales, setNutAnimales] = useState(false);
  const [nutMenestras, setNutMenestras] = useState(false);
  const [nutFrutas, setNutFrutas] = useState(false);
  const [nutSal, setNutSal] = useState(false);
  const [nutAcuerdos, setNutAcuerdos] = useState('');

  // ── Registro de peso ──
  const [pesoSemana, setPesoSemana] = useState('');
  const [pesoKg, setPesoKg] = useState('');

  // ── Ecografía ──
  const [ecoTipo, setEcoTipo] = useState<'genetica' | 'morfologica' | 'bienestar_fetal'>('genetica');
  const [ecoSemanas, setEcoSemanas] = useState('');
  const [ecoResultado, setEcoResultado] = useState('');
  const [ecoHallazgos, setEcoHallazgos] = useState('');

  // ── Odontograma ──
  const [dentEstado, setDentEstado] = useState('');
  const [dentCaries, setDentCaries] = useState('');
  const [dentTratamientos, setDentTratamientos] = useState('');

  const closeAndReset = () => {
    setOpenForm(null);
    setCie10(''); setPatDesc('');
    setP118(''); setP1922(''); setP23(false); setP2428(''); setMentalObs('');
    setVioPuntaje(''); setVioObs('');
    setNutHist(''); setNutAnimales(false); setNutMenestras(false); setNutFrutas(false); setNutSal(false); setNutAcuerdos('');
    setPesoSemana(''); setPesoKg('');
    setEcoTipo('genetica'); setEcoSemanas(''); setEcoResultado(''); setEcoHallazgos('');
    setDentEstado(''); setDentCaries(''); setDentTratamientos('');
  };

  const ok = (msg: string) => { toast.success('Registro guardado', msg); closeAndReset(); };
  const fail = () => toast.error('No se pudo guardar', 'Inténtalo de nuevo en unos momentos.');

  const guardarPatologia = () => {
    if (!cie10.trim()) return toast.warning('Falta el CIE-10', 'Ingresa el código CIE-10 para continuar.');
    pathology.mutate(
      { gestanteId, codigoCie10: cie10.trim(), descripcion: patDesc || undefined, fechaDiagnostico: hoy(), estado: 'activa' },
      { onSuccess: () => ok('Patología registrada.'), onError: fail }
    );
  };

  const guardarMental = () => {
    const s118 = parseInt(p118, 10) || 0;
    const s1922 = parseInt(p1922, 10) || 0;
    const s2428 = parseInt(p2428, 10) || 0;
    // Interpretación SRQ-18 (según plan): positivo si supera umbrales
    const positivo = s118 >= 9 || s1922 >= 1 || p23 || s2428 >= 1;
    mental.mutate(
      {
        gestanteId,
        respuestas: { p1_18: s118, p19_22: s1922, p23, p24_28: s2428 },
        puntajeP1_18: s118,
        puntajeP19_22: s1922,
        pregunta23: p23,
        puntajeP24_28: s2428,
        resultado: positivo ? 'positivo' : 'negativo',
        derivacion: positivo,
        observaciones: mentalObs || undefined,
        fecha: hoy(),
      },
      { onSuccess: () => ok(positivo ? 'Tamizaje SRQ-18 POSITIVO. Se marca derivación.' : 'Tamizaje SRQ-18 registrado (negativo).'), onError: fail }
    );
  };

  const guardarViolencia = () => {
    const puntaje = parseInt(vioPuntaje, 10) || 0;
    const positivo = puntaje >= 15; // tamizaje positivo según plan
    violence.mutate(
      {
        gestanteId,
        respuestas: { puntajeTotal: puntaje },
        puntajeTotal: puntaje,
        tamizajePositivo: positivo,
        derivacion: positivo,
        observaciones: vioObs || undefined,
        fecha: hoy(),
      },
      { onSuccess: () => ok(positivo ? 'Tamizaje de violencia POSITIVO. Se activa derivación.' : 'Tamizaje de violencia registrado (negativo).'), onError: fail }
    );
  };

  const guardarNutricion = () => {
    nutrition.mutate(
      {
        gestanteId,
        historialAlimentario: nutHist || undefined,
        consumoAnimales: nutAnimales,
        consumoMenestras: nutMenestras,
        consumoFrutas: nutFrutas,
        salYodada: nutSal,
        acuerdos: nutAcuerdos || undefined,
        fecha: hoy(),
      },
      { onSuccess: () => ok('Consejería nutricional registrada.'), onError: fail }
    );
  };

  const guardarPeso = () => {
    const semana = parseInt(pesoSemana, 10);
    const kg = parseFloat(pesoKg);
    if (!semana || semana < 0) return toast.warning('Semana inválida', 'Ingresa una semana gestacional válida.');
    if (!kg || kg <= 0) return toast.warning('Peso inválido', 'Ingresa un peso válido en kilogramos.');
    weight.mutate(
      { gestanteId, egSemanas: semana, peso: kg, fecha: hoy() },
      { onSuccess: () => ok('Registro de peso guardado.'), onError: fail }
    );
  };

  const guardarEcografia = () => {
    const semanas = parseInt(ecoSemanas, 10);
    const tipoNum: Record<string, number> = { genetica: 1, morfologica: 2, bienestar_fetal: 3 };
    ultrasound.mutate(
      {
        gestanteId,
        tipo: ecoTipo,
        numero: tipoNum[ecoTipo],
        egSemanas: !isNaN(semanas) ? semanas : undefined,
        fecha: hoy(),
        resultado: ecoResultado || undefined,
        hallazgos: ecoHallazgos || undefined,
      },
      { onSuccess: () => ok('Ecografía registrada.'), onError: fail }
    );
  };

  const guardarOdontograma = () => {
    if (!dentEstado.trim() && !dentCaries.trim() && !dentTratamientos.trim()) {
      return toast.warning('Odontograma vacío', 'Completa al menos un campo para guardar.');
    }
    dental.mutate(
      {
        gestanteId,
        estadoBucal: dentEstado || undefined,
        caries: dentCaries || undefined,
        tratamientos: dentTratamientos || undefined,
        fecha: hoy(),
      },
      { onSuccess: () => ok('Odontograma registrado.'), onError: fail }
    );
  };

  const isSaving =
    pathology.isPending || mental.isPending || violence.isPending ||
    nutrition.isPending || weight.isPending || ultrasound.isPending || dental.isPending;

  const FORM_TITLES: Record<FormKey, string> = {
    patologia: 'Registrar Patología (CIE-10)',
    mental: 'Tamizaje SRQ-18 (Salud Mental)',
    violencia: 'Tamizaje de Violencia',
    nutricion: 'Consejería Nutricional',
    peso: 'Registro de Peso',
    ecografia: 'Registrar Ecografía',
    odontograma: 'Registrar Odontograma',
  };

  const ALL_CARDS: { key: FormKey; label: string; desc: string; icon: any; color: string; bg: string }[] = [
    { key: 'mental', label: 'Tamizaje SRQ-18', desc: 'Salud mental', icon: Brain, color: gestanteColors.primary, bg: gestanteColors.primaryLight },
    { key: 'violencia', label: 'Tamizaje de violencia', desc: 'Detección y derivación', icon: ShieldAlert, color: semanticColors.danger, bg: semanticColors.dangerLight },
    { key: 'patologia', label: 'Patología (CIE-10)', desc: 'Diagnóstico materno', icon: Stethoscope, color: semanticColors.info, bg: semanticColors.infoLight },
    { key: 'ecografia', label: 'Ecografía', desc: 'Genética, morfológica, bienestar', icon: Activity, color: obstetraColors.primary, bg: obstetraColors.primaryLight },
    { key: 'nutricion', label: 'Consejería nutricional', desc: 'Hábitos y acuerdos', icon: Apple, color: semanticColors.success, bg: semanticColors.successLight },
    { key: 'peso', label: 'Registro de peso', desc: 'Ganancia por semana', icon: Scale, color: semanticColors.warning, bg: semanticColors.warningLight },
    { key: 'odontograma', label: 'Odontograma', desc: 'Salud bucal', icon: Smile, color: gestanteColors.primary, bg: gestanteColors.primaryLight },
  ];

  // Solo se muestran las tarjetas cuyo módulo esté activo (alcance del sistema).
  const CARDS = ALL_CARDS.filter((c) => flags[FORM_FLAG[c.key]]);

  return (
    <ScreenLayout
      role="obstetra"
      title="Tamizajes y registros"
      subtitle={nombre}
      showBack
      onBack={() => goBack(router, '/(obstetra)/(tabs)/gestantes' as any)}
      scroll={false}
      width="full"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="full">
        <Text style={styles.subtitle}>Selecciona el registro clínico que deseas añadir.</Text>

        {CARDS.length === 0 && (
          <Text style={styles.subtitle}>
            No hay registros clínicos habilitados en esta configuración. El detalle
            clínico se mantiene en la ficha física MINSA.
          </Text>
        )}

        <View style={webShell ? styles.cardGrid : undefined}>
        {CARDS.map(({ key, label, desc, icon: Icon, color, bg }) => (
          <TouchableOpacity key={key} style={StyleSheet.flatten([styles.card, webShell && styles.cardWeb])} onPress={() => setOpenForm(key)} activeOpacity={0.7}>
            <View style={[styles.cardIcon, { backgroundColor: bg }]}>
              <Icon size={24} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
            <Plus size={20} color={commonColors.textTertiary} />
          </TouchableOpacity>
        ))}
        </View>
        </WebMaxWidth>
      </ScrollView>

      {/* ── MODAL ── */}
      <AppModal
        visible={openForm !== null}
        onClose={closeAndReset}
        title={openForm ? FORM_TITLES[openForm] : undefined}
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={closeAndReset} style={{ flex: 1 }} disabled={isSaving} />
            <AppButton
              title="Guardar"
              onPress={() => {
                if (openForm === 'patologia') guardarPatologia();
                else if (openForm === 'mental') guardarMental();
                else if (openForm === 'violencia') guardarViolencia();
                else if (openForm === 'nutricion') guardarNutricion();
                else if (openForm === 'peso') guardarPeso();
                else if (openForm === 'ecografia') guardarEcografia();
                else if (openForm === 'odontograma') guardarOdontograma();
              }}
              style={{ flex: 1 }}
              themeColor={PINK}
              disabled={isSaving}
              loading={isSaving}
            />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          {openForm === 'patologia' && (
            <>
              <Field label="Código CIE-10">
                <TextInput style={styles.input} placeholder="Ej. O990" placeholderTextColor={commonColors.textTertiary} value={cie10} onChangeText={setCie10} autoCapitalize="characters" />
              </Field>
              <Field label="Descripción (opcional)">
                <TextInput style={[styles.input, { height: 80 }]} placeholder="Descripción del diagnóstico..." placeholderTextColor={commonColors.textTertiary} multiline value={patDesc} onChangeText={setPatDesc} />
              </Field>
            </>
          )}

          {openForm === 'mental' && (
            <>
              <Text style={styles.helper}>Ingresa los puntajes obtenidos en cada bloque del cuestionario SRQ-18.</Text>
              <Field label="Puntaje preguntas 1–18 (trastorno mental)">
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={p118} onChangeText={setP118} />
              </Field>
              <Field label="Puntaje preguntas 19–22 (psicótico)">
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={p1922} onChangeText={setP1922} />
              </Field>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Pregunta 23 (convulsivo): Sí</Text>
                <Switch value={p23} onValueChange={setP23} trackColor={{ true: PINK }} />
              </View>
              <Field label="Puntaje preguntas 24–28 (alcoholismo)">
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={p2428} onChangeText={setP2428} />
              </Field>
              <Field label="Observaciones (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Notas..." placeholderTextColor={commonColors.textTertiary} multiline value={mentalObs} onChangeText={setMentalObs} />
              </Field>
            </>
          )}

          {openForm === 'violencia' && (
            <>
              <Text style={styles.helper}>Cuestionario de 8 preguntas (8–24 puntos). Tamizaje positivo si el puntaje es ≥ 15.</Text>
              <Field label="Puntaje total (8–24)">
                <TextInput style={styles.input} placeholder="0" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={vioPuntaje} onChangeText={setVioPuntaje} />
              </Field>
              <Field label="Observaciones (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Notas..." placeholderTextColor={commonColors.textTertiary} multiline value={vioObs} onChangeText={setVioObs} />
              </Field>
            </>
          )}

          {openForm === 'nutricion' && (
            <>
              <Field label="Historial alimentario (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Describe la alimentación habitual..." placeholderTextColor={commonColors.textTertiary} multiline value={nutHist} onChangeText={setNutHist} />
              </Field>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Consume alimentos de origen animal</Text>
                <Switch value={nutAnimales} onValueChange={setNutAnimales} trackColor={{ true: PINK }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Consume menestras</Text>
                <Switch value={nutMenestras} onValueChange={setNutMenestras} trackColor={{ true: PINK }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Consume frutas y verduras</Text>
                <Switch value={nutFrutas} onValueChange={setNutFrutas} trackColor={{ true: PINK }} />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Usa sal yodada</Text>
                <Switch value={nutSal} onValueChange={setNutSal} trackColor={{ true: PINK }} />
              </View>
              <Field label="Acuerdos (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Acuerdos con la gestante..." placeholderTextColor={commonColors.textTertiary} multiline value={nutAcuerdos} onChangeText={setNutAcuerdos} />
              </Field>
            </>
          )}

          {openForm === 'peso' && (
            <>
              <Field label="Semana gestacional">
                <TextInput style={styles.input} placeholder="Ej. 20" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={pesoSemana} onChangeText={setPesoSemana} />
              </Field>
              <Field label="Peso (kg)">
                <TextInput style={styles.input} placeholder="Ej. 62.5" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={pesoKg} onChangeText={setPesoKg} />
              </Field>
            </>
          )}

          {openForm === 'ecografia' && (
            <>
              <Field label="Tipo de ecografía">
                <View style={styles.segmentRow}>
                  {([
                    { k: 'genetica', l: 'Genética (13 sem)' },
                    { k: 'morfologica', l: 'Morfológica (22 sem)' },
                    { k: 'bienestar_fetal', l: 'Bienestar (35 sem)' },
                  ] as const).map((opt) => (
                    <TouchableOpacity
                      key={opt.k}
                      style={[styles.segment, ecoTipo === opt.k && styles.segmentActive]}
                      onPress={() => setEcoTipo(opt.k)}
                    >
                      <Text style={[styles.segmentText, ecoTipo === opt.k && styles.segmentTextActive]}>{opt.l}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
              <Field label="Semanas de gestación (por eco)">
                <TextInput style={styles.input} placeholder="Ej. 22" placeholderTextColor={commonColors.textTertiary} keyboardType="numeric" value={ecoSemanas} onChangeText={setEcoSemanas} />
              </Field>
              <Field label="Resultado">
                <TextInput style={styles.input} placeholder="Ej. Normal, sin alteraciones" placeholderTextColor={commonColors.textTertiary} value={ecoResultado} onChangeText={setEcoResultado} />
              </Field>
              <Field label="Hallazgos (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Detalle de hallazgos..." placeholderTextColor={commonColors.textTertiary} multiline value={ecoHallazgos} onChangeText={setEcoHallazgos} />
              </Field>
            </>
          )}

          {openForm === 'odontograma' && (
            <>
              <Field label="Estado de salud bucal">
                <TextInput style={styles.input} placeholder="Ej. Buena higiene, gingivitis leve" placeholderTextColor={commonColors.textTertiary} value={dentEstado} onChangeText={setDentEstado} />
              </Field>
              <Field label="Caries detectadas (opcional)">
                <TextInput style={styles.input} placeholder="Ej. 2 piezas con caries" placeholderTextColor={commonColors.textTertiary} value={dentCaries} onChangeText={setDentCaries} />
              </Field>
              <Field label="Tratamientos realizados (opcional)">
                <TextInput style={[styles.input, { height: 70 }]} placeholder="Ej. Profilaxis, obturación..." placeholderTextColor={commonColors.textTertiary} multiline value={dentTratamientos} onChangeText={setDentTratamientos} />
              </Field>
            </>
          )}
        </View>
      </AppModal>
    </ScreenLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  subtitle: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.md2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md2, marginBottom: spacing.sm2, ...shadows.card },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.bodyMd, color: commonColors.text },
  cardDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: commonColors.overlay, justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: commonColors.surface, borderRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { ...typography.h3, color: commonColors.text, marginBottom: 20 },
  helper: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 19 },
  fieldGroup: { gap: 6 },
  inputLabel: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  input: { borderWidth: 1, borderColor: commonColors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, ...typography.bodySm, fontSize: 15, color: commonColors.text, backgroundColor: commonColors.surfaceAlt },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { flex: 1, ...typography.bodySm, color: commonColors.textSecondary, marginRight: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: commonColors.surfaceAlt },
  cancelBtnText: { ...typography.button, fontSize: 15, color: commonColors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: PINK },
  saveBtnText: { ...typography.button, fontSize: 15, color: obstetraColors.onPrimary },
  segmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  segment: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: commonColors.border, backgroundColor: commonColors.surface },
  segmentActive: { backgroundColor: obstetraColors.primaryLight, borderColor: PINK },
  segmentText: { ...typography.caption, color: commonColors.textSecondary },
  segmentTextActive: { color: PINK, fontFamily: typography.label.fontFamily },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardWeb: {
    width: '48%',
    minWidth: 280,
    flexGrow: 1,
    marginBottom: 0,
  },
});
