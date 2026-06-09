import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  TextInput, Linking, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  BookOpen, AlertTriangle, Calculator, Phone,
  Pill, Heart, Activity, Baby, Wind, ClipboardList,
  Frown, Thermometer, Droplets, Droplet, Zap, Eye,
  AlertCircle, Clock, Users, HeartPulse,
} from 'lucide-react-native';
import { typography } from '../../../src/theme/typography';

const CONTENIDO: Record<1 | 2 | 3, { titulo: string; icono: string; descripcion: string }[]> = {
  1: [
    { titulo: 'Importancia del Ácido Fólico', icono: 'Pill', descripcion: 'El ácido fólico previene defectos del tubo neural. Toma 500mg diariamente desde el inicio hasta la semana 14.' },
    { titulo: 'Primeros síntomas', icono: 'Heart', descripcion: 'Náuseas, fatiga y sensibilidad en los senos son normales. Consulta si hay sangrado o dolor intenso.' },
    { titulo: 'Primera ecografía', icono: 'Activity', descripcion: 'La ecografía genética del 1er trimestre detecta posibles anomalías cromosómicas y confirma la edad gestacional.' },
  ],
  2: [
    { titulo: 'Inicio del Hierro', icono: 'Pill', descripcion: 'A partir de la semana 14 inicia Sulfato Ferroso. Tómalo con jugo de naranja para mejor absorción.' },
    { titulo: 'Carbonato de Calcio', icono: 'Pill', descripcion: 'Desde la semana 20 inicia el calcio: 2 tabletas al día. Fortalece los huesos de tu bebé y previene la preeclampsia.' },
    { titulo: 'Ecografía Morfológica', icono: 'Activity', descripcion: 'La ecografía morfológica evalúa el desarrollo de los órganos del bebé y confirma el sexo si lo deseas.' },
  ],
  3: [
    { titulo: 'Bienestar Fetal', icono: 'Activity', descripcion: 'Evalúa el bienestar del bebé, líquido amniótico, posición y preparación para el parto.' },
    { titulo: 'Plan de Parto', icono: 'ClipboardList', descripcion: 'Prepara tu plan de parto: ¿Quién te acompañará? ¿Qué llevarás? Comunícalo a tu obstetra.' },
    { titulo: 'Lactancia Materna', icono: 'Heart', descripcion: 'La leche materna es el mejor alimento para tu bebé en los primeros 6 meses. Pide orientación.' },
  ],
};

const GRUPOS_ALARMAS = [
  {
    titulo: 'Durante el embarazo',
    color: '#DC2626', bg: '#FEF2F2', border: '#FECACA',
    signos: [
      { icono: 'Frown', texto: 'Vómitos frecuentes e intensos' },
      { icono: 'Thermometer', texto: 'Dolor de cabeza fuerte, fiebre o calentura' },
      { icono: 'Activity', texto: 'Pies, manos o cara hinchada' },
      { icono: 'Droplets', texto: 'Pérdida de sangre o líquido' },
      { icono: 'Baby', texto: 'El bebé no se mueve' },
    ],
  },
];

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Pill, Heart, Activity, Baby, Wind, ClipboardList,
  Frown, Thermometer, Droplets, Droplet, Zap, Eye,
  AlertCircle, Clock, Users, HeartPulse, AlertTriangle, BookOpen,
};

function DynIcon({ name, size = 20, color }: { name: string; size?: number; color: string }) {
  const Icon = ICON_MAP[name] ?? BookOpen;
  return <Icon size={size} color={color} />;
}

function CalculadoraEG() {
  const [fum, setFum] = useState('');
  const [resultado, setResultado] = useState<{ semanas: number; dias: number; trimestre: number; fpp: string; restantes: number; } | null>(null);

  function calcular() {
    if (!fum || !/^\d{4}-\d{2}-\d{2}$/.test(fum)) return;
    const fumDate = new Date(fum);
    if (isNaN(fumDate.getTime())) return;
    const hoy = new Date();
    const totalDias = Math.floor((hoy.getTime() - fumDate.getTime()) / 86400000);
    if (totalDias < 0 || totalDias > 294) return;
    const semanas = Math.floor(totalDias / 7);
    const dias = totalDias % 7;
    const fppDate = new Date(fumDate);
    fppDate.setDate(fppDate.getDate() + 7);
    fppDate.setMonth(fppDate.getMonth() - 3);
    fppDate.setFullYear(fppDate.getFullYear() + 1);
    setResultado({ semanas, dias, trimestre: semanas <= 13 ? 1 : semanas <= 27 ? 2 : 3, fpp: fppDate.toISOString().split('T')[0], restantes: Math.max(0, Math.round((fppDate.getTime() - hoy.getTime()) / 86400000)) });
  }

  return (
    <View style={styles.card}>
      <Text style={calcStyles.label}>Fecha de última menstruación (FUM)</Text>
      <Text style={calcStyles.hint}>Formato: AAAA-MM-DD</Text>
      <View style={calcStyles.row}>
        <TextInput
          style={calcStyles.input}
          value={fum}
          onChangeText={setFum}
          placeholder="2025-10-15"
          placeholderTextColor="#94A3B8"
          keyboardType="numeric"
          maxLength={10}
        />
        <TouchableOpacity style={calcStyles.btn} onPress={calcular}>
          <Text style={calcStyles.btnText}>Calcular</Text>
        </TouchableOpacity>
      </View>

      {resultado && (
        <View style={calcStyles.results}>
          <View style={calcStyles.resultGrid}>
            <View style={calcStyles.resultItem}>
              <Text style={calcStyles.resultValue}>{resultado.semanas}</Text>
              <Text style={calcStyles.resultLabel}>sem + {resultado.dias} días</Text>
            </View>
            <View style={calcStyles.resultItem}>
              <Text style={calcStyles.resultValue}>{resultado.trimestre}°</Text>
              <Text style={calcStyles.resultLabel}>trimestre</Text>
            </View>
          </View>
          <View style={calcStyles.fppBox}>
            <Text style={calcStyles.fppLabel}>Fecha Probable de Parto</Text>
            <Text style={calcStyles.fppDate}>{resultado.fpp}</Text>
            <Text style={calcStyles.fppDays}>{resultado.restantes} días restantes</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const calcStyles = StyleSheet.create({
  label: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  hint: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#64748B', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#0F172A', backgroundColor: '#F8FAFC' },
  btn: { backgroundColor: '#7C3AED', borderRadius: 16, paddingHorizontal: 24, justifyContent: 'center' },
  btnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  results: { marginTop: 24, gap: 16 },
  resultGrid: { flexDirection: 'row', gap: 16 },
  resultItem: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 20, padding: 20, alignItems: 'center' },
  resultValue: { fontFamily: typography.h1.fontFamily, fontSize: 32, fontWeight: '800', color: '#7C3AED' },
  resultLabel: { fontFamily: typography.bodySmall.fontFamily, fontSize: 13, color: '#64748B', marginTop: 4 },
  fppBox: { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 20, alignItems: 'center' },
  fppLabel: { fontFamily: typography.caption.fontFamily, fontSize: 12, fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 0.5 },
  fppDate: { fontFamily: typography.h2.fontFamily, fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  fppDays: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B', marginTop: 4 },
});

type Seccion = 'contenido' | 'alarmas' | 'calculadora';

export default function EducacionScreen(): React.ReactElement {
  const [seccion, setSeccion] = useState<Seccion>('contenido');
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(2);

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Educación</Text>
        </SafeAreaView>
      </View>

      <View style={styles.seccionBar}>
        {[
          { key: 'contenido', label: 'Guía', icon: BookOpen },
          { key: 'alarmas', label: 'Peligro', icon: AlertTriangle },
          { key: 'calculadora', label: 'Calcular EG', icon: Calculator }
        ].map(({ key, label, icon: Icon }) => (
          <TouchableOpacity
            key={key}
            style={[styles.seccionBtn, seccion === key && styles.seccionBtnActive]}
            onPress={() => setSeccion(key as Seccion)}
          >
            <Icon size={16} color={seccion === key ? '#FFFFFF' : '#64748B'} />
            <Text style={[styles.seccionBtnText, seccion === key && styles.seccionBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {seccion === 'contenido' && (
          <View>
            <View style={styles.trimestreRow}>
              {([1, 2, 3] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.trimestreBtn, trimestre === t && styles.trimestreBtnActive]}
                  onPress={() => setTrimestre(t)}
                >
                  <Text style={[styles.trimestreBtnText, trimestre === t && styles.trimestreBtnTextActive]}>{t}° Trim</Text>
                </TouchableOpacity>
              ))}
            </View>

            {CONTENIDO[trimestre].map((item, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.contenidoIconWrap}>
                  <DynIcon name={item.icono} size={24} color="#7C3AED" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.contenidoTitle}>{item.titulo}</Text>
                  <Text style={styles.contenidoDesc}>{item.descripcion}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {seccion === 'alarmas' && (
          <View>
            {GRUPOS_ALARMAS.map((grupo) => (
              <View key={grupo.titulo} style={[styles.alarmaCard, { borderColor: grupo.border, backgroundColor: grupo.bg }]}>
                <Text style={[styles.alarmaHeaderText, { color: grupo.color }]}>{grupo.titulo}</Text>
                {grupo.signos.map((signo, i) => (
                  <View key={i} style={styles.signoRow}>
                    <DynIcon name={signo.icono} size={18} color={grupo.color} />
                    <Text style={[styles.signoText, { color: grupo.color }]}>{signo.texto}</Text>
                  </View>
                ))}
              </View>
            ))}

            <TouchableOpacity style={styles.emergencyCard} onPress={() => Linking.openURL('tel:083421800')}>
              <View style={styles.emergencyIconWrap}>
                <Phone size={24} color="#FFFFFF" />
              </View>
              <View style={styles.emergencyInfo}>
                <Text style={styles.emergencyLabel}>Hospital / Centro de Salud</Text>
                <Text style={styles.emergencyPhone}>083 – 421800</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {seccion === 'calculadora' && <CalculadoraEG />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  seccionBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  seccionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 99,
  },
  seccionBtnActive: { backgroundColor: '#7C3AED' },
  seccionBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 13, fontWeight: '700', color: '#64748B' },
  seccionBtnTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },
  trimestreRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  trimestreBtn: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: '#E2E8F0', alignItems: 'center' },
  trimestreBtnActive: { backgroundColor: '#F5F3FF' },
  trimestreBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '700', color: '#64748B' },
  trimestreBtnTextActive: { color: '#7C3AED' },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    gap: 16,
  },
  contenidoIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  contenidoTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  contenidoDesc: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B', lineHeight: 22 },
  alarmaCard: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1 },
  alarmaHeaderText: { fontFamily: typography.h2.fontFamily, fontSize: 18, fontWeight: '800', marginBottom: 16 },
  signoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  signoText: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '600' },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', borderRadius: 24, padding: 20, gap: 16 },
  emergencyIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  emergencyInfo: { flex: 1 },
  emergencyLabel: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#FECACA' },
  emergencyPhone: { fontFamily: typography.h2.fontFamily, fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 4 },
});
