import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  TextInput, Linking, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, AlertTriangle, Calculator, Phone,
  Pill, Heart, Activity, Baby, Wind, ClipboardList,
  Frown, Thermometer, Droplets, Droplet, Zap, Eye,
  AlertCircle, Clock, Users, HeartPulse,
} from 'lucide-react-native';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { useEducation, EducationContentItem } from '../../../src/services/api-queries';

const BRAND = gestanteColors.primary;

// Asigna un icono según la categoría del contenido publicado por el admin
function iconoPorCategoria(categoria?: string, tipo?: string): string {
  const c = (categoria || '').toLowerCase();
  if (c.includes('nutri')) return 'Heart';
  if (c.includes('suplement') || c.includes('medic')) return 'Pill';
  if (c.includes('ecograf') || c.includes('control') || c.includes('clinic')) return 'Activity';
  if (c.includes('parto') || c.includes('lactancia') || c.includes('bebe')) return 'Baby';
  if (c.includes('alarma') || c.includes('peligro')) return 'AlertTriangle';
  if ((tipo || '').toLowerCase() === 'video') return 'Activity';
  return 'BookOpen';
}

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
    color: semanticColors.danger, bg: semanticColors.dangerLight, border: semanticColors.danger,
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
          placeholderTextColor={commonColors.textTertiary}
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
  label: { ...typography.bodyMedium, fontFamily: typography.h3.fontFamily, fontWeight: '700', color: commonColors.text, marginBottom: 4 },
  hint: { ...typography.caption, color: commonColors.textSecondary, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm + 4 },
  input: { flex: 1, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 52, ...typography.bodyMedium, color: commonColors.text, backgroundColor: commonColors.background },
  btn: { backgroundColor: BRAND, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  btnText: { ...typography.button, color: commonColors.surface },
  results: { marginTop: spacing.lg, gap: spacing.md },
  resultGrid: { flexDirection: 'row', gap: spacing.md },
  resultItem: { flex: 1, backgroundColor: commonColors.background, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  resultValue: { ...typography.display, color: BRAND },
  resultLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 4 },
  fppBox: { backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center' },
  fppLabel: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5 },
  fppDate: { ...typography.h2, color: commonColors.text, marginTop: spacing.sm },
  fppDays: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: 4 },
});

type Seccion = 'contenido' | 'alarmas' | 'calculadora';

export default function EducacionScreen(): React.ReactElement {
  const [seccion, setSeccion] = useState<Seccion>('contenido');
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(2);

  const { data: eduData } = useEducation();

  // Agrupar el contenido publicado por el admin según su trimestre.
  // El contenido sin trimestre (general) se muestra en todos.
  const contenidoBackend = React.useMemo(() => {
    const items = eduData?.contents || [];
    return items
      .filter((c: EducationContentItem) => c.trimestre == null || c.trimestre === trimestre)
      .map((c: EducationContentItem) => ({
        titulo: c.titulo,
        icono: iconoPorCategoria(c.categoria, c.tipo),
        descripcion: c.contenido,
      }));
  }, [eduData, trimestre]);

  // Si el backend tiene contenido para este trimestre, se usa; si no, el estático.
  const contenidoMostrado =
    contenidoBackend.length > 0 ? contenidoBackend : CONTENIDO[trimestre];

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
            <Icon size={16} color={seccion === key ? commonColors.surface : commonColors.textSecondary} />
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

            {contenidoMostrado.map((item, i) => (
              <View key={i} style={styles.card}>
                <View style={styles.contenidoIconWrap}>
                  <DynIcon name={item.icono} size={24} color={BRAND} />
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
                <Phone size={24} color={commonColors.surface} />
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
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: spacing.lg,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.display,
    color: commonColors.text,
    marginBottom: spacing.sm,
  },
  seccionBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.full,
    padding: 4,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  seccionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.full,
  },
  seccionBtnActive: { backgroundColor: BRAND },
  seccionBtnText: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: commonColors.textSecondary },
  seccionBtnTextActive: { color: commonColors.surface },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  trimestreRow: { flexDirection: 'row', gap: spacing.sm + 4, marginBottom: spacing.lg },
  trimestreBtn: { flex: 1, paddingVertical: spacing.sm + 4, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt, alignItems: 'center' },
  trimestreBtnActive: { backgroundColor: gestanteColors.primaryLight },
  trimestreBtnText: { ...typography.label, color: commonColors.textSecondary },
  trimestreBtnTextActive: { color: BRAND },
  card: {
    flexDirection: 'row',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    gap: spacing.md,
  },
  contenidoIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: gestanteColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  contenidoTitle: { ...typography.bodyMedium, fontFamily: typography.h3.fontFamily, fontWeight: '700', color: commonColors.text, marginBottom: 4 },
  contenidoDesc: { ...typography.bodySmall, color: commonColors.textSecondary, lineHeight: 22 },
  alarmaCard: { borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1 },
  alarmaHeaderText: { ...typography.h3, marginBottom: spacing.md },
  signoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginBottom: spacing.sm + 4 },
  signoText: { flex: 1, ...typography.bodySmall, fontFamily: typography.bodyMedium.fontFamily, fontWeight: '600' },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: semanticColors.danger, borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.md },
  emergencyIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  emergencyInfo: { flex: 1 },
  emergencyLabel: { ...typography.bodySmall, color: semanticColors.dangerLight },
  emergencyPhone: { ...typography.h2, color: commonColors.surface, marginTop: 4 },
});
