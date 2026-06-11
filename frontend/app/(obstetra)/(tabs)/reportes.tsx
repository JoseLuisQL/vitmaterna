import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, Dimensions, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { Download, Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react-native';
import api from '../../../src/services/api';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

const BRAND = obstetraColors.primary;
const screenWidth = Dimensions.get('window').width - 40; // 20 padding horizontal

/** Convierte un color hex (#RRGGBB) a rgba() para react-native-chart-kit. */
const hexToRgba = (hex: string, opacity = 1): string => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

interface ReportData {
  totalGestantes: number;
  averageAdherence: number;
  alertasActivas: number;
  con6Controles: number;
  enAltoRiesgo: number;
  gestantesMenorAdherencia: { nombre: string; pct: number; riesgo: string }[];
  kpisMinsa: { label: string; pct: number; meta: number }[];
  attendanceStats: { month: string; attended: number; missed: number }[];
  riskDistribution: { name: string; population: number; color: string; legendFontColor: string; legendFontSize: number }[];
}

function AdherenciaBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? riskColors.riskGreen : pct >= 50 ? riskColors.riskYellow : riskColors.riskRed;
  return (
    <View style={barStyles.track}>
      <View style={[barStyles.fill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const barStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: commonColors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

function RiesgoSemaforo({ nivel }: { nivel: string }) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    verde: { bg: riskColors.riskGreenLight, text: riskColors.riskGreen },
    amarillo: { bg: riskColors.riskYellowLight, text: riskColors.riskYellow },
    rojo: { bg: riskColors.riskRedLight, text: riskColors.riskRed },
  };
  const c = colorMap[nivel] || colorMap.verde;
  return (
    <View style={[semaforoStyles.badge, { backgroundColor: c.bg }]}>
      <View style={[semaforoStyles.dot, { backgroundColor: c.text }]} />
    </View>
  );
}
const semaforoStyles = StyleSheet.create({
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
});

export default function ReportesScreen(): React.ReactElement {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-reports'],
    queryFn: async (): Promise<ReportData> => {
      const res = await api.get('/reports/clinic');
      return res.data.data as ReportData;
    },
  });

  const exportPDF = async () => {
    if (!data) return;
    try {
      const html = `<html><body style="font-family:Arial;padding:40px">
        <h1 style="color:${BRAND}">Reporte VitMaterna</h1>
        <p>Fecha: ${new Date().toLocaleDateString('es-PE')}</p>
        <h2>Resumen</h2>
        <ul>
          <li>Total gestantes: ${data.totalGestantes}</li>
          <li>Adherencia promedio: ${data.averageAdherence}%</li>
          <li>En alto riesgo: ${data.enAltoRiesgo}</li>
          <li>Con 6+ controles: ${data.con6Controles}</li>
        </ul>
        <h2>Indicadores MINSA</h2>
        <ul>${data.kpisMinsa.map((k) => `<li>${k.label}: ${k.pct}% (meta: ${k.meta}%)</li>`).join('')}</ul>
      </body></html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch {
      Alert.alert('Error', 'No se pudo generar el reporte PDF.');
    }
  };

  if (isLoading) return <LoadingScreen message="Cargando reportes..." />;

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <View style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <Text style={styles.pageTitle}>Reportes</Text>
            <Text style={styles.pageSubtitle}>Estadísticas y KPIs</Text>
          </SafeAreaView>
        </View>
        <View style={styles.errorWrap}>
          <AlertTriangle size={48} color={semanticColors.danger} />
          <Text style={styles.errorTitle}>No se pudieron cargar los reportes</Text>
          <Text style={styles.errorText}>
            Ocurrió un problema al obtener las estadísticas del servidor.
            Verifica tu conexión e inténtalo de nuevo.
          </Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={styles.retryBtnText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const chartConfig = {
    backgroundColor: commonColors.surface,
    backgroundGradientFrom: commonColors.surface,
    backgroundGradientTo: commonColors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => hexToRgba(BRAND, opacity),
    labelColor: (opacity = 1) => hexToRgba(commonColors.textSecondary, opacity),
    style: { borderRadius: 24 },
    propsForDots: { r: '4', strokeWidth: '2', stroke: BRAND },
    propsForBackgroundLines: { strokeDasharray: '', stroke: commonColors.border },
  };

  const barData = {
    labels: data?.attendanceStats.map((s) => s.month) || [],
    datasets: [{ data: data?.attendanceStats.map((s) => s.attended) || [] }],
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.pageTitle}>Reportes</Text>
              <Text style={styles.pageSubtitle}>Estadísticas y KPIs</Text>
            </View>
            <TouchableOpacity style={styles.exportBtn} onPress={exportPDF} activeOpacity={0.7}>
              <Download size={18} color={BRAND} />
              <Text style={styles.exportBtnText}>Exportar PDF</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}>
        {/* KPIs principales */}
        <View style={styles.kpiGrid}>
          {[
            { icon: Users, label: 'Pacientes', value: data?.totalGestantes || 0, color: BRAND, bg: obstetraColors.primaryLight },
            { icon: TrendingUp, label: 'Adherencia', value: `${data?.averageAdherence || 0}%`, color: semanticColors.success, bg: semanticColors.successLight },
            { icon: CheckCircle, label: '6+ controles', value: data?.con6Controles || 0, color: semanticColors.info, bg: semanticColors.infoLight },
            { icon: AlertTriangle, label: 'Alto riesgo', value: data?.enAltoRiesgo || 0, color: semanticColors.danger, bg: semanticColors.dangerLight },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <View key={label} style={styles.kpiCard}>
              <View style={[styles.kpiIconWrap, { backgroundColor: bg }]}>
                <Icon size={20} color={color} />
              </View>
              <Text style={[styles.kpiValue, { color }]}>{value}</Text>
              <Text style={styles.kpiLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Indicadores MINSA */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Indicadores MINSA / ENDES</Text>
          {data?.kpisMinsa.map((kpi) => (
            <View key={kpi.label} style={styles.kpiRow}>
              <View style={styles.kpiRowHeader}>
                <Text style={styles.kpiRowLabel}>{kpi.label}</Text>
                <View style={styles.kpiRowValues}>
                  <Text style={[styles.kpiRowPct, { color: kpi.pct >= kpi.meta ? semanticColors.success : semanticColors.danger }]}>{kpi.pct}%</Text>
                  <Text style={styles.kpiRowMeta}>/ {kpi.meta}%</Text>
                </View>
              </View>
              <AdherenciaBar pct={kpi.pct} />
            </View>
          ))}
        </View>

        {/* Gráfica distribución por riesgo */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Distribución por Riesgo</Text>
          <PieChart
            data={data?.riskDistribution || []}
            width={screenWidth - 48}
            height={180}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
          />
        </View>

        {/* Gráfica asistencia */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Asistencia a Citas (2026)</Text>
          <BarChart
            data={barData}
            width={screenWidth - 48}
            height={200}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={{ borderRadius: 16, marginTop: 16, marginLeft: -16 }}
            showValuesOnTopOfBars
          />
        </View>

        {/* Tabla de menor adherencia */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pacientes con atención prioritaria</Text>
          <Text style={styles.cardSubtitle}>Menor adherencia registrada</Text>
          {data?.gestantesMenorAdherencia.map((g, i) => (
            <View key={i} style={[styles.adherenciaRow, i < (data.gestantesMenorAdherencia.length - 1) && styles.adherenciaRowBorder]}>
              <RiesgoSemaforo nivel={g.riesgo} />
              <Text style={styles.adherenciaNombre}>{g.nombre}</Text>
              <View style={[styles.adherenciaPctWrap, { backgroundColor: g.pct >= 80 ? riskColors.riskGreenLight : g.pct >= 50 ? riskColors.riskYellowLight : riskColors.riskRedLight }]}>
                <Text style={[styles.adherenciaPct, { color: g.pct >= 80 ? riskColors.riskGreen : g.pct >= 50 ? riskColors.riskYellow : riskColors.riskRed }]}>{g.pct}%</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: {
    paddingBottom: 40,
    backgroundColor: commonColors.surface,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderBottomWidth: 1,
    borderColor: commonColors.border,
  },
  safeAreaHeader: { paddingHorizontal: 24, paddingTop: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pageTitle: { ...typography.h1, color: commonColors.text },
  pageSubtitle: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: 4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: commonColors.surface, borderRadius: 99, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: commonColors.border },
  exportBtnText: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: BRAND },
  content: { paddingHorizontal: 20, paddingBottom: 48, marginTop: -24 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  kpiCard: { width: (screenWidth - 12) / 2, padding: 16, backgroundColor: commonColors.surface, borderRadius: 24, borderWidth: 1, borderColor: commonColors.border },
  kpiIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  kpiValue: { ...typography.h2, marginBottom: 2 },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary },
  card: { backgroundColor: commonColors.surface, borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: commonColors.border },
  cardTitle: { ...typography.h3, color: commonColors.text, marginBottom: 4 },
  cardSubtitle: { ...typography.bodySmall, color: commonColors.textSecondary, marginBottom: 20 },
  kpiRow: { marginBottom: 20 },
  kpiRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  kpiRowLabel: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.text, flex: 1, marginRight: 12 },
  kpiRowValues: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiRowPct: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, fontWeight: '800' },
  kpiRowMeta: { ...typography.caption, color: commonColors.textTertiary },
  adherenciaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
  adherenciaRowBorder: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  adherenciaNombre: { flex: 1, ...typography.bodyMedium, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.text },
  adherenciaPctWrap: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 99 },
  adherenciaPct: { ...typography.label, fontWeight: '800' },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  errorTitle: { ...typography.h3, color: commonColors.text, textAlign: 'center' },
  errorText: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: { backgroundColor: BRAND, borderRadius: 99, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  retryBtnText: { ...typography.button, color: obstetraColors.onPrimary },
});
