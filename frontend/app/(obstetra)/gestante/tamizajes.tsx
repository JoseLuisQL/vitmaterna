import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, Switch, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft, Plus, Brain, ShieldAlert, Stethoscope, Apple, Scale,
} from 'lucide-react-native';
import {
  useCreatePathology,
  useCreateMentalHealthScreening,
  useCreateViolenceScreening,
  useCreateNutritionalCounseling,
  useCreateWeightRecord,
} from '../../../src/services/api-queries';
import { typography } from '../../../src/theme/typography';

const PINK = '#BE185D';
const hoy = () => new Date().toISOString().split('T')[0];

type FormKey = 'patologia' | 'mental' | 'violencia' | 'nutricion' | 'peso';

export default function TamizajesScreen(): React.ReactElement {
  const router = useRouter();
  const { id, nombre } = useLocalSearchParams<{ id: string; nombre?: string }>();
  const gestanteId = id || '';

  const [openForm, setOpenForm] = useState<FormKey | null>(null);

  // Mutations
  const pathology = useCreatePathology();
  const mental = useCreateMentalHealthScreening();
  const violence = useCreateViolenceScreening();
  const nutrition = useCreateNutritionalCounseling();
  const weight = useCreateWeightRecord();

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

  const closeAndReset = () => {
    setOpenForm(null);
    setCie10(''); setPatDesc('');
    setP118(''); setP1922(''); setP23(false); setP2428(''); setMentalObs('');
    setVioPuntaje(''); setVioObs('');
    setNutHist(''); setNutAnimales(false); setNutMenestras(false); setNutFrutas(false); setNutSal(false); setNutAcuerdos('');
    setPesoSemana(''); setPesoKg('');
  };

  const ok = (msg: string) => { Alert.alert('Registrado', msg); closeAndReset(); };
  const fail = () => Alert.alert('Error', 'No se pudo guardar el registro. Inténtalo de nuevo.');

  const guardarPatologia = () => {
    if (!cie10.trim()) return Alert.alert('Error', 'El código CIE-10 es requerido.');
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
    if (!semana || semana < 0) return Alert.alert('Error', 'Ingresa una semana gestacional válida.');
    if (!kg || kg <= 0) return Alert.alert('Error', 'Ingresa un peso válido.');
    weight.mutate(
      { gestanteId, egSemanas: semana, peso: kg, fecha: hoy() },
      { onSuccess: () => ok('Registro de peso guardado.'), onError: fail }
    );
  };

  const isSaving =
    pathology.isPending || mental.isPending || violence.isPending ||
    nutrition.isPending || weight.isPending;

  const CARDS: { key: FormKey; label: string; desc: string; icon: any; color: string; bg: string }[] = [
    { key: 'mental', label: 'Tamizaje SRQ-18', desc: 'Salud mental', icon: Brain, color: '#7C3AED', bg: '#F5F3FF' },
    { key: 'violencia', label: 'Tamizaje de violencia', desc: 'Detección y derivación', icon: ShieldAlert, color: '#DC2626', bg: '#FEF2F2' },
    { key: 'patologia', label: 'Patología (CIE-10)', desc: 'Diagnóstico materno', icon: Stethoscope, color: '#2563EB', bg: '#EFF6FF' },
    { key: 'nutricion', label: 'Consejería nutricional', desc: 'Hábitos y acuerdos', icon: Apple, color: '#059669', bg: '#ECFDF5' },
    { key: 'peso', label: 'Registro de peso', desc: 'Ganancia por semana', icon: Scale, color: '#D97706', bg: '#FFFBEB' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView edges={['top']}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tamizajes y registros</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {nombre ? <Text style={styles.patientName}>{nombre}</Text> : null}
        <Text style={styles.subtitle}>Selecciona el registro clínico que deseas añadir.</Text>

        {CARDS.map(({ key, label, desc, icon: Icon, color, bg }) => (
          <TouchableOpacity key={key} style={styles.card} onPress={() => setOpenForm(key)} activeOpacity={0.7}>
            <View style={[styles.cardIcon, { backgroundColor: bg }]}>
              <Icon size={24} color={color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{label}</Text>
              <Text style={styles.cardDesc}>{desc}</Text>
            </View>
            <Plus size={20} color="#94A3B8" />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── MODAL ── */}
      <Modal visible={openForm !== null} transparent animationType="fade" onRequestClose={closeAndReset}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              {openForm === 'patologia' && 'Registrar Patología (CIE-10)'}
              {openForm === 'mental' && 'Tamizaje SRQ-18 (Salud Mental)'}
              {openForm === 'violencia' && 'Tamizaje de Violencia'}
              {openForm === 'nutricion' && 'Consejería Nutricional'}
              {openForm === 'peso' && 'Registro de Peso'}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              {openForm === 'patologia' && (
                <>
                  <Field label="Código CIE-10">
                    <TextInput style={styles.input} placeholder="Ej. O990" value={cie10} onChangeText={setCie10} autoCapitalize="characters" />
                  </Field>
                  <Field label="Descripción (opcional)">
                    <TextInput style={[styles.input, { height: 80 }]} placeholder="Descripción del diagnóstico..." multiline value={patDesc} onChangeText={setPatDesc} />
                  </Field>
                </>
              )}

              {openForm === 'mental' && (
                <>
                  <Text style={styles.helper}>Ingresa los puntajes obtenidos en cada bloque del cuestionario SRQ-18.</Text>
                  <Field label="Puntaje preguntas 1–18 (trastorno mental)">
                    <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={p118} onChangeText={setP118} />
                  </Field>
                  <Field label="Puntaje preguntas 19–22 (psicótico)">
                    <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={p1922} onChangeText={setP1922} />
                  </Field>
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Pregunta 23 (convulsivo): Sí</Text>
                    <Switch value={p23} onValueChange={setP23} trackColor={{ true: PINK }} />
                  </View>
                  <Field label="Puntaje preguntas 24–28 (alcoholismo)">
                    <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={p2428} onChangeText={setP2428} />
                  </Field>
                  <Field label="Observaciones (opcional)">
                    <TextInput style={[styles.input, { height: 70 }]} placeholder="Notas..." multiline value={mentalObs} onChangeText={setMentalObs} />
                  </Field>
                </>
              )}

              {openForm === 'violencia' && (
                <>
                  <Text style={styles.helper}>Cuestionario de 8 preguntas (8–24 puntos). Tamizaje positivo si el puntaje es ≥ 15.</Text>
                  <Field label="Puntaje total (8–24)">
                    <TextInput style={styles.input} placeholder="0" keyboardType="numeric" value={vioPuntaje} onChangeText={setVioPuntaje} />
                  </Field>
                  <Field label="Observaciones (opcional)">
                    <TextInput style={[styles.input, { height: 70 }]} placeholder="Notas..." multiline value={vioObs} onChangeText={setVioObs} />
                  </Field>
                </>
              )}

              {openForm === 'nutricion' && (
                <>
                  <Field label="Historial alimentario (opcional)">
                    <TextInput style={[styles.input, { height: 70 }]} placeholder="Describe la alimentación habitual..." multiline value={nutHist} onChangeText={setNutHist} />
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
                    <TextInput style={[styles.input, { height: 70 }]} placeholder="Acuerdos con la gestante..." multiline value={nutAcuerdos} onChangeText={setNutAcuerdos} />
                  </Field>
                </>
              )}

              {openForm === 'peso' && (
                <>
                  <Field label="Semana gestacional">
                    <TextInput style={styles.input} placeholder="Ej. 20" keyboardType="numeric" value={pesoSemana} onChangeText={setPesoSemana} />
                  </Field>
                  <Field label="Peso (kg)">
                    <TextInput style={styles.input} placeholder="Ej. 62.5" keyboardType="numeric" value={pesoKg} onChangeText={setPesoKg} />
                  </Field>
                </>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeAndReset} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                disabled={isSaving}
                onPress={() => {
                  if (openForm === 'patologia') guardarPatologia();
                  else if (openForm === 'mental') guardarMental();
                  else if (openForm === 'violencia') guardarViolencia();
                  else if (openForm === 'nutricion') guardarNutricion();
                  else if (openForm === 'peso') guardarPeso();
                }}
              >
                {isSaving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.saveBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  headerTitle: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#0F172A' },
  content: { padding: 20, paddingBottom: 48 },
  patientName: { fontFamily: typography.h2.fontFamily, fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  subtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B', marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  cardIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cardDesc: { fontFamily: typography.bodySmall.fontFamily, fontSize: 13, color: '#64748B', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 20 },
  helper: { fontFamily: typography.bodySmall.fontFamily, fontSize: 13, color: '#64748B', lineHeight: 19 },
  fieldGroup: { gap: 6 },
  inputLabel: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '600', color: '#334155' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  switchLabel: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#334155', marginRight: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: '#F1F5F9' },
  cancelBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '700', color: '#475569' },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: PINK },
  saveBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});
