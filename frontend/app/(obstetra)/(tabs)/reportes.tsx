import React from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useRouter } from 'expo-router';
import { Download, Users, TrendingUp, CheckCircle, AlertTriangle, ArrowLeft, Sheet } from 'lucide-react-native';
import api from '../../../src/services/api';
import { ChartBar, type ChartBarDatum } from '../../../src/components/ui/ChartBar';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useToast, AutoGrid } from '../../../src/components/ui';
import { useAuthStore } from '../../../src/store/authStore';
import { buildClinicReportHtml } from '../../../src/utils/reportTemplate';
import { buildCsv, exportTextFile } from '../../../src/utils/exportFile';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

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
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuthStore();
  const [exporting, setExporting] = React.useState(false);
  const [exportingCsv, setExportingCsv] = React.useState(false);
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-reports'],
    queryFn: async (): Promise<ReportData> => {
      const res = await api.get('/reports/clinic');
      return res.data.data as ReportData;
    },
  });

  const exportPDF = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const html = buildClinicReportHtml({
        title: 'Reporte Clínico de Gestantes',
        subtitle: 'Resumen de indicadores de seguimiento prenatal',
        preparedBy: user?.lastName ? `Obst. ${user.firstName ?? ''} ${user.lastName}`.trim() : undefined,
        kpis: [
          { label: 'Pacientes', value: data.totalGestantes },
          { label: 'Adherencia prom.', value: `${data.averageAdherence}%` },
          { label: '6+ controles', value: data.con6Controles },
          { label: 'Alto riesgo', value: data.enAltoRiesgo },
        ],
        minsa: (data.kpisMinsa || []).map((k) => ({ label: k.label, pct: k.pct, meta: k.meta })),
        risk: (data.riskDistribution || []).map((r) => ({ label: r.name, count: r.population, color: r.color })),
        priority: (data.gestantesMenorAdherencia || []).map((g) => ({ nombre: g.nombre, pct: g.pct, riesgo: g.riesgo })),
      });
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf', dialogTitle: 'Compartir reporte VITMATERNA' });
    } catch {
      toast.error('No se pudo generar', 'Ocurrió un problema al crear el reporte PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = async () => {
    if (!data || exportingCsv) return;
    setExportingCsv(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      // Sección 1: indicadores MINSA. Sección 2: pacientes prioritarias.
      const minsaCsv = buildCsv(
        ['Indicador MINSA', 'Valor (%)', 'Meta (%)', 'Cumple'],
        (data.kpisMinsa || []).map((k) => [k.label, k.pct, k.meta, k.pct >= k.meta ? 'Sí' : 'No']),
      );
      const priorityCsv = buildCsv(
        ['Gestante', 'Adherencia (%)', 'Riesgo'],
        (data.gestantesMenorAdherencia || []).map((g) => [g.nombre, g.pct, g.riesgo]),
      );
      const resumen = buildCsv(
        ['Métrica', 'Valor'],
        [
          ['Total gestantes', data.totalGestantes],
          ['Adherencia promedio (%)', data.averageAdherence],
          ['Con 6+ controles', data.con6Controles],
          ['En alto riesgo', data.enAltoRiesgo],
        ],
      );
      const content = [
        'VITMATERNA — Reporte Clínico',
        `Generado,${new Date().toLocaleString('es-PE')}`,
        '',
        'RESUMEN',
        resumen,
        '',
        'INDICADORES MINSA',
        minsaCsv,
        '',
        'PACIENTES PRIORITARIAS',
        priorityCsv,
      ].join('\r\n');
      const ok = await exportTextFile(`vitmaterna_reporte_${stamp}.csv`, content, 'text/csv');
      if (!ok) toast.error('No se pudo exportar', 'No fue posible generar el archivo CSV.');
    } catch {
      toast.error('No se pudo exportar', 'Ocurrió un problema al crear el CSV.');
    } finally {
      setExportingCsv(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <Text style={styles.pageTitle}>Reportes</Text>
            <Text style={styles.pageSubtitle}>Estadísticas y KPIs</Text>
          </SafeAreaView>
        </LinearGradient>
        <View style={[styles.content, { marginTop: spacing.lg }]}>
          <DashboardSkeleton count={2} />
        </View>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <Text style={styles.pageTitle}>Reportes</Text>
            <Text style={styles.pageSubtitle}>Estadísticas y KPIs</Text>
          </SafeAreaView>
        </LinearGradient>
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

  const attendanceData: ChartBarDatum[] =
    data?.attendanceStats.map((s) => ({ label: s.month, value: s.attended })) || [];

  const riskBars: ChartBarDatum[] =
    data?.riskDistribution.map((r) => ({
      label: r.name,
      value: r.population,
      color: r.color,
    })) || [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(obstetra)/(tabs)'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.pageTitle}>Reportes</Text>
              <Text style={styles.pageSubtitle}>Estadísticas y KPIs</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.exportBtn} onPress={exportCSV} activeOpacity={0.7} disabled={exportingCsv}>
                {exportingCsv ? (
                  <ActivityIndicator size="small" color={commonColors.white} />
                ) : (
                  <Sheet size={18} color={commonColors.white} />
                )}
                <Text style={styles.exportBtnText}>{exportingCsv ? '…' : 'CSV'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportBtn} onPress={exportPDF} activeOpacity={0.7} disabled={exporting}>
                {exporting ? (
                  <ActivityIndicator size="small" color={commonColors.white} />
                ) : (
                  <Download size={18} color={commonColors.white} />
                )}
                <Text style={styles.exportBtnText}>{exporting ? '…' : 'PDF'}</Text>
              </TouchableOpacity>
              <NotificationBell href="/(obstetra)/notificaciones" />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}>
        {/* KPIs principales */}
        <AutoGrid minColumnWidth={150} maxColumns={4} style={{ marginBottom: spacing.lg }}>
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
        </AutoGrid>

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
        {riskBars.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Distribución por Riesgo</Text>
            <ChartBar data={riskBars} height={160} showValues style={{ marginTop: spacing.sm }} />
          </View>
        )}

        {/* Gráfica asistencia */}
        {attendanceData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Asistencia a Citas (2026)</Text>
            <ChartBar data={attendanceData} color={BRAND} height={180} showValues style={{ marginTop: spacing.sm }} />
          </View>
        )}

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
    borderBottomLeftRadius: borderRadius.xxxl,
    borderBottomRightRadius: borderRadius.xxxl,
  },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pageTitle: { ...typography.h1, color: commonColors.white },
  pageSubtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 10 },
  exportBtnText: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: commonColors.white },
  content: { paddingHorizontal: spacing.lg, paddingBottom: layout.tabBarSpace, marginTop: -24 },
  kpiCard: { padding: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, ...shadows.card },
  kpiIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm2 },
  kpiValue: { ...typography.numericMd, marginBottom: 2 },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.md, ...shadows.card },
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
