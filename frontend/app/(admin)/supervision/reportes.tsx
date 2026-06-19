/**
 * VITMATERNA - Admin: Supervisión de Reportes (solo lectura + exportar)
 * KPIs clínicos y MINSA globales, con exportación PDF/CSV.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ArrowLeft, Download, Sheet, Users, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react-native';
import api from '../../../src/services/api';
import { AutoGrid, useToast } from '../../../src/components/ui';
import { WebMaxWidth } from '../../../src/components/web';
import { ChartBar, type ChartBarDatum } from '../../../src/components/ui/ChartBar';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { buildClinicReportHtml } from '../../../src/utils/reportTemplate';
import { exportPdf } from '../../../src/utils/exportPdf';
import { exportExcel } from '../../../src/utils/exportExcel';
import { commonColors, adminColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = adminColors.primary;

interface ReportData {
  totalGestantes: number; averageAdherence: number; alertasActivas: number;
  con6Controles: number; enAltoRiesgo: number;
  gestantesMenorAdherencia: { nombre: string; pct: number; riesgo: string }[];
  kpisMinsa: { label: string; pct: number; meta: number }[];
  attendanceStats: { month: string; attended: number; missed: number }[];
  riskDistribution: { name: string; population: number; color: string }[];
}

export default function AdminReportesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const [exporting, setExporting] = React.useState(false);
  const [exportingXlsx, setExportingXlsx] = React.useState(false);
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['clinic-reports'],
    queryFn: async (): Promise<ReportData> => (await api.get('/reports/clinic')).data.data as ReportData,
  });

  const exportPDF = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      const html = buildClinicReportHtml({
        title: 'Reporte Clínico de Gestantes', subtitle: 'Resumen de indicadores (administración)',
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
      const stamp = new Date().toISOString().slice(0, 10);
      const ok = await exportPdf({ html, fileName: `vitmaterna_reporte_admin_${stamp}`, dialogTitle: 'Compartir reporte VITMATERNA' });
      if (ok) toast.success('Reporte listo', 'Se generó el PDF del reporte.');
      else toast.error('No se pudo generar', 'Error al crear el PDF.');
    } catch { toast.error('No se pudo generar', 'Error al crear el PDF.'); }
    finally { setExporting(false); }
  };

  const exportXLSX = async () => {
    if (!data || exportingXlsx) return;
    setExportingXlsx(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const ok = await exportExcel(`vitmaterna_reporte_admin_${stamp}`, [
        {
          name: 'Resumen',
          colWidths: [28, 16],
          rows: [
            ['Métrica', 'Valor'],
            ['Total gestantes', data.totalGestantes],
            ['Adherencia promedio (%)', data.averageAdherence],
            ['Con 6+ controles', data.con6Controles],
            ['En alto riesgo', data.enAltoRiesgo],
            ['Generado', new Date().toLocaleString('es-PE')],
          ],
        },
        {
          name: 'Indicadores MINSA',
          colWidths: [32, 12, 12, 10],
          rows: [
            ['Indicador', 'Valor (%)', 'Meta (%)', 'Cumple'],
            ...(data.kpisMinsa || []).map((k) => [k.label, k.pct, k.meta, k.pct >= k.meta ? 'Sí' : 'No']),
          ],
        },
        {
          name: 'Pacientes prioritarias',
          colWidths: [32, 16, 12],
          rows: [
            ['Gestante', 'Adherencia (%)', 'Riesgo'],
            ...(data.gestantesMenorAdherencia || []).map((g) => [g.nombre, g.pct, g.riesgo]),
          ],
        },
      ]);
      if (ok) toast.success('Excel listo', 'Se generó el archivo .xlsx del reporte.');
      else toast.error('No se pudo exportar', 'No fue posible generar el Excel.');
    } catch { toast.error('No se pudo exportar', 'Error al crear el Excel.'); }
    finally { setExportingXlsx(false); }
  };

  const riskBars: ChartBarDatum[] = (data?.riskDistribution || []).map((r) => ({ label: r.name, value: r.population, color: r.color }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)'))} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Volver" accessibilityRole="button">
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title} numberOfLines={1}>Reportes</Text>
              <Text style={styles.subtitle} numberOfLines={1}>Indicadores globales</Text>
            </View>
          </View>

          {/* Exportación en su propia fila (responsive, sin cortes). */}
          <View style={styles.exportRow}>
            <TouchableOpacity style={styles.expBtn} onPress={exportXLSX} disabled={exportingXlsx} accessibilityRole="button" accessibilityLabel="Exportar Excel">
              {exportingXlsx ? <ActivityIndicator size="small" color={commonColors.white} /> : <Sheet size={18} color={commonColors.white} />}
              <Text style={styles.expBtnText}>Excel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.expBtn} onPress={exportPDF} disabled={exporting} accessibilityRole="button" accessibilityLabel="Exportar PDF">
              {exporting ? <ActivityIndicator size="small" color={commonColors.white} /> : <Download size={18} color={commonColors.white} />}
              <Text style={styles.expBtnText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={{ padding: spacing.lg }}><DashboardSkeleton count={2} /></View>
      ) : (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}>
          <WebMaxWidth width="wide">
          <AutoGrid minColumnWidth={150} maxColumns={4} style={{ marginBottom: spacing.lg }}>
            {[
              { icon: Users, label: 'Pacientes', value: data?.totalGestantes || 0, color: BRAND, bg: adminColors.primaryLight },
              { icon: TrendingUp, label: 'Adherencia', value: `${data?.averageAdherence || 0}%`, color: semanticColors.success, bg: semanticColors.successLight },
              { icon: CheckCircle, label: '6+ controles', value: data?.con6Controles || 0, color: semanticColors.info, bg: semanticColors.infoLight },
              { icon: AlertTriangle, label: 'Alto riesgo', value: data?.enAltoRiesgo || 0, color: semanticColors.danger, bg: semanticColors.dangerLight },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <View key={label} style={styles.kpi}>
                <View style={[styles.kpiIcon, { backgroundColor: bg }]}><Icon size={20} color={color} /></View>
                <Text style={[styles.kpiValue, { color }]}>{value}</Text>
                <Text style={styles.kpiLabel}>{label}</Text>
              </View>
            ))}
          </AutoGrid>

          <Text style={styles.sectionTitle}>Indicadores MINSA</Text>
          <View style={styles.card}>
            {(data?.kpisMinsa || []).map((k) => {
              const ok = k.pct >= k.meta;
              return (
                <View key={k.label} style={styles.minsaRow}>
                  <View style={styles.minsaHead}>
                    <Text style={styles.minsaLabel}>{k.label}</Text>
                    <Text style={[styles.minsaPct, { color: ok ? semanticColors.success : semanticColors.danger }]}>{k.pct}% <Text style={styles.minsaMeta}>/ {k.meta}%</Text></Text>
                  </View>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, k.pct)}%`, backgroundColor: ok ? semanticColors.success : semanticColors.danger }]} /></View>
                </View>
              );
            })}
          </View>

          {riskBars.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Distribución de riesgo</Text>
              <View style={styles.card}><ChartBar data={riskBars} height={160} showValues /></View>
            </>
          )}
          </WebMaxWidth>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  exportRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  expBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 8 },
  expBtnText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  kpi: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { ...typography.h2 },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg, marginLeft: 4 },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  minsaRow: { marginBottom: spacing.md },
  minsaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  minsaLabel: { ...typography.bodySmall, fontWeight: '600', color: commonColors.text, flex: 1 },
  minsaPct: { ...typography.bodySmall, fontWeight: '700' },
  minsaMeta: { ...typography.caption, color: commonColors.textTertiary, fontWeight: '500' },
  bar: { height: 8, backgroundColor: commonColors.surfaceAlt, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
});
