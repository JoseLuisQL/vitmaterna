import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Download, Users, TrendingUp, CheckCircle, AlertTriangle, Sheet } from 'lucide-react-native';
import api from '../../../src/services/api';
import { ChartBar, type ChartBarDatum } from '../../../src/components/ui/ChartBar';
import { ChartDonut, type DonutDatum } from '../../../src/components/ui/ChartDonut';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useToast, AutoGrid } from '../../../src/components/ui';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { useResponsive } from '../../../src/theme/responsive';
import { useAuthStore } from '../../../src/store/authStore';
import { buildClinicReportHtml } from '../../../src/utils/reportTemplate';
import { exportPdf } from '../../../src/utils/exportPdf';
import { exportExcel } from '../../../src/utils/exportExcel';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { WebMaxWidth } from '../../../src/components/web';
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
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
});

export default function ReportesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const reportesTourTarget = useTourTarget(TOUR_TARGETS.obstetraReportes);
  const exportTourTarget = useTourTarget(TOUR_TARGETS.obstetraReportesExport);
  const minsaTourTarget = useTourTarget(TOUR_TARGETS.obstetraReportesMinsa);
  const { user } = useAuthStore();
  const [exporting, setExporting] = React.useState(false);
  const [exportingXlsx, setExportingXlsx] = React.useState(false);
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
      const stamp = new Date().toISOString().slice(0, 10);
      const ok = await exportPdf({
        html,
        fileName: `vitmaterna_reporte_${stamp}`,
        dialogTitle: 'Compartir reporte VITMATERNA',
      });
      if (ok) toast.success('Reporte listo', 'Se generó el PDF del reporte clínico.');
      else toast.error('No se pudo generar', 'Ocurrió un problema al crear el reporte PDF.');
    } catch {
      toast.error('No se pudo generar', 'Ocurrió un problema al crear el reporte PDF.');
    } finally {
      setExporting(false);
    }
  };

  const exportXLSX = async () => {
    if (!data || exportingXlsx) return;
    setExportingXlsx(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const responsable = user?.lastName ? `Obst. ${user.firstName ?? ''} ${user.lastName}`.trim() : '—';
      const ok = await exportExcel(`vitmaterna_reporte_${stamp}`, [
        {
          name: 'Portada',
          colWidths: [30, 40],
          rows: [
            ['VITMATERNA'],
            ['Plataforma de salud materna prenatal'],
            [],
            ['Reporte', 'Reporte Clínico de Gestantes'],
            ['Establecimiento', 'C.S. Talavera — Apurímac'],
            ['Responsable', responsable],
            ['Generado', new Date().toLocaleString('es-PE')],
            ['Confidencialidad', 'Uso clínico autorizado'],
          ],
        },
        {
          name: 'Resumen',
          colWidths: [30, 16],
          rows: [
            ['Métrica', 'Valor'],
            ['Total gestantes', data.totalGestantes],
            ['Adherencia promedio (%)', data.averageAdherence],
            ['Con 6+ controles', data.con6Controles],
            ['En alto riesgo', data.enAltoRiesgo],
            ['Alertas activas', data.alertasActivas],
          ],
        },
        {
          name: 'Indicadores MINSA',
          colWidths: [34, 12, 12, 10],
          rows: [
            ['Indicador MINSA', 'Valor (%)', 'Meta (%)', 'Cumple'],
            ...(data.kpisMinsa || []).map((k) => [k.label, k.pct, k.meta, k.pct >= k.meta ? 'Sí' : 'No']),
          ],
        },
        {
          name: 'Distribución de riesgo',
          colWidths: [20, 12, 12],
          rows: [
            ['Nivel de riesgo', 'Gestantes', '% del total'],
            ...(data.riskDistribution || []).map((r) => {
              const tot = (data.riskDistribution || []).reduce((a, x) => a + x.population, 0) || 1;
              return [r.name, r.population, `${Math.round((r.population / tot) * 100)}%`];
            }),
          ],
        },
        {
          name: 'Pacientes prioritarias',
          colWidths: [34, 16, 12],
          rows: [
            ['Gestante', 'Adherencia (%)', 'Riesgo'],
            ...(data.gestantesMenorAdherencia || []).map((g) => [g.nombre, g.pct, g.riesgo]),
          ],
        },
      ]);
      if (ok) toast.success('Excel listo', 'Se generó el archivo .xlsx del reporte.');
      else toast.error('No se pudo exportar', 'No fue posible generar el archivo Excel.');
    } catch {
      toast.error('No se pudo exportar', 'Ocurrió un problema al crear el Excel.');
    } finally {
      setExportingXlsx(false);
    }
  };

  const attendanceData: ChartBarDatum[] =
    data?.attendanceStats.map((s) => ({ label: s.month, value: s.attended })) || [];

  const riskDonut: DonutDatum[] =
    data?.riskDistribution.map((r) => ({
      label: r.name,
      value: r.population,
      color: r.color,
    })) || [];
  const riskTotal = riskDonut.reduce((a, r) => a + r.value, 0);

  return (
    <View style={styles.container}>
      <ScreenLayout
        role="obstetra"
        title="Reportes"
        subtitle="Estadísticas y KPIs"
        showBack={router.canGoBack()}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(obstetra)/(tabs)'))}
        loading={isLoading}
        error={isError || !data}
        onRetry={() => refetch()}
        width="full"
      >
        {/* Barra de Control y Exportación */}
        <View style={styles.exportControlBar}>
          <View style={styles.exportControlTextWrap}>
            <Text style={styles.exportControlTitle}>Resumen Clínico 2026</Text>
            <Text style={styles.exportControlSub}>Exportación en formato oficial MINSA</Text>
          </View>
          <View ref={exportTourTarget} collapsable={false} style={styles.exportButtonsRow}>
            <TouchableOpacity
              style={styles.exportBtnExecutive}
              onPress={exportXLSX}
              activeOpacity={0.75}
              disabled={exportingXlsx}
              accessibilityRole="button"
              accessibilityLabel="Exportar Excel"
            >
              {exportingXlsx ? <ActivityIndicator size="small" color={BRAND} /> : <Sheet size={16} color={BRAND} />}
              <Text style={styles.exportBtnTextExecutive}>{exportingXlsx ? '...' : 'Excel'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.exportBtnExecutive, styles.exportBtnPdf]}
              onPress={exportPDF}
              activeOpacity={0.75}
              disabled={exporting}
              accessibilityRole="button"
              accessibilityLabel="Exportar PDF"
            >
              {exporting ? <ActivityIndicator size="small" color={commonColors.white} /> : <Download size={16} color={commonColors.white} />}
              <Text style={[styles.exportBtnTextExecutive, { color: commonColors.white }]}>{exporting ? '...' : 'PDF'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* KPIs principales */}
        <View ref={reportesTourTarget} collapsable={false}>
          <AutoGrid minColumnWidth={150} maxColumns={4} style={{ marginBottom: spacing.sm }}>
            {[
              { icon: Users, label: 'Pacientes', value: data?.totalGestantes || 0, color: BRAND, bg: obstetraColors.primaryLight },
              { icon: TrendingUp, label: 'Adherencia', value: `${data?.averageAdherence || 0}%`, color: semanticColors.success, bg: semanticColors.successLight },
              { icon: CheckCircle, label: '6+ controles', value: data?.con6Controles || 0, color: semanticColors.info, bg: semanticColors.infoLight },
              { icon: AlertTriangle, label: 'Alto riesgo', value: data?.enAltoRiesgo || 0, color: semanticColors.danger, bg: semanticColors.dangerLight },
            ].map(({ icon: Icon, label, value, color, bg }) => (
              <View key={label} style={[styles.kpi, { borderLeftColor: color, borderLeftWidth: 4 }]}>
                <View style={[styles.kpiIcon, { backgroundColor: bg }]}><Icon size={18} color={color} /></View>
                <Text style={[styles.kpiValue, { color }]}>{value}</Text>
                <Text style={styles.kpiLabel}>{label}</Text>
              </View>
            ))}
          </AutoGrid>
        </View>

        <View style={[webShell ? styles.twoCol : undefined, { paddingBottom: 40 }]}>
          <View style={webShell ? styles.col : undefined}>
            {/* Indicadores MINSA */}
            <Text style={styles.sectionTitle}>Indicadores MINSA / ENDES</Text>
            <View ref={minsaTourTarget} collapsable={false} style={styles.card}>
              <Text style={styles.cardCaption}>Avance porcentual respecto a las metas estratégicas.</Text>
              
              <View style={styles.minsaLegendRow}>
                <View style={styles.minsaLegendItem}>
                  <View style={[styles.minsaLegendDot, { backgroundColor: semanticColors.success }]} />
                  <Text style={styles.minsaLegendText}>Cumple meta</Text>
                </View>
                <View style={styles.minsaLegendItem}>
                  <View style={[styles.minsaLegendDot, { backgroundColor: semanticColors.danger }]} />
                  <Text style={styles.minsaLegendText}>Por debajo</Text>
                </View>
                <View style={styles.minsaLegendItem}>
                  <View style={styles.minsaLegendTick} />
                  <Text style={styles.minsaLegendText}>Marca de meta</Text>
                </View>
              </View>

              {data?.kpisMinsa.map((kpi, idx) => {
                const ok = kpi.pct >= kpi.meta;
                return (
                  <View key={kpi.label} style={[styles.minsaRow, idx === (data.kpisMinsa.length - 1) && { marginBottom: 0 }]}>
                    <View style={styles.minsaHead}>
                      <Text style={styles.minsaLabel} numberOfLines={1}>{kpi.label}</Text>
                      <Text style={[styles.minsaPct, { color: ok ? semanticColors.success : semanticColors.danger }]}>
                        {kpi.pct}% <Text style={styles.minsaMeta}>/ {kpi.meta}%</Text>
                      </Text>
                    </View>
                    <View style={styles.bar}>
                      <View style={[styles.barFill, { width: `${Math.min(100, kpi.pct)}%`, backgroundColor: ok ? semanticColors.success : semanticColors.danger }]} />
                      <View style={[styles.barMeta, { left: `${Math.min(100, kpi.meta)}%` }]} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Tabla de menor adherencia */}
            <Text style={styles.sectionTitle}>Atención prioritaria</Text>
            <View style={styles.card}>
              <Text style={styles.cardCaption}>Gestantes con menor adherencia al tratamiento suplementario.</Text>
              {(data?.gestantesMenorAdherencia?.length ?? 0) === 0 ? (
                <Text style={styles.emptyInline}>Sin pacientes prioritarias por ahora.</Text>
              ) : (
                data?.gestantesMenorAdherencia.map((g, i) => (
                  <View key={i} style={[styles.adherenciaRow, i < (data.gestantesMenorAdherencia.length - 1) && styles.adherenciaRowBorder]}>
                    <RiesgoSemaforo nivel={g.riesgo} />
                    <Text style={styles.adherenciaNombre} numberOfLines={1}>{g.nombre}</Text>
                    <View style={[styles.adherenciaPctWrap, { backgroundColor: g.pct >= 80 ? riskColors.riskGreenLight : g.pct >= 50 ? riskColors.riskYellowLight : riskColors.riskRedLight }]}>
                      <Text style={[styles.adherenciaPct, { color: g.pct >= 80 ? riskColors.riskGreen : g.pct >= 50 ? riskColors.riskYellow : riskColors.riskRed }]}>{g.pct}%</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>

          <View style={webShell ? styles.col : undefined}>
            {/* Gráfica distribución por riesgo (dona: proporción clara) */}
            {riskTotal > 0 && (
              <>
                <Text style={styles.sectionTitle}>Distribución por Riesgo</Text>
                <View style={styles.card}>
                  <Text style={styles.cardCaption}>Semáforo de riesgo de tus {riskTotal} gestantes activas.</Text>
                  <ChartDonut data={riskDonut} centerLabel="gestantes" />
                </View>
              </>
            )}

            {/* Gráfica asistencia */}
            {attendanceData.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Asistencia a Citas (2026)</Text>
                <View style={styles.card}>
                  <Text style={styles.cardCaption}>Citas atendidas por mes.</Text>
                  <ChartBar data={attendanceData} color={BRAND} height={150} showValues />
                </View>
              </>
            )}
          </View>
        </View>
      </ScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  // Header con padding fijo (sin solape de margen negativo) — igual que admin.
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },
  exportControlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card,
  },
  exportControlTextWrap: { flex: 1, minWidth: 180 },
  exportControlTitle: { ...typography.bodyMd, fontWeight: '800', color: commonColors.text },
  exportControlSub: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  exportButtonsRow: { flexDirection: 'row', gap: 10 },
  exportBtnExecutive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  exportBtnPdf: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  exportBtnTextExecutive: { ...typography.label, fontWeight: '700', color: BRAND },

  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  kpi: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md2, ...shadows.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { ...typography.h2 },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg, marginLeft: 4 },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.card },
  cardCaption: { ...typography.caption, color: commonColors.textSecondary, marginBottom: spacing.md, lineHeight: 17 },

  minsaLegendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  minsaLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  minsaLegendDot: { width: 8, height: 8, borderRadius: 4 },
  minsaLegendTick: { width: 3, height: 12, backgroundColor: '#334155', borderRadius: 1 },
  minsaLegendText: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },

  minsaRow: { marginBottom: spacing.md },
  minsaHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  minsaLabel: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, marginRight: 12 },
  minsaPct: { ...typography.bodySm, fontWeight: '700' },
  minsaMeta: { ...typography.caption, color: commonColors.textTertiary, fontWeight: '500' },
  bar: { height: 10, backgroundColor: '#F1F5F9', borderRadius: 5, position: 'relative', overflow: 'visible' },
  barFill: { height: '100%', borderRadius: 5 },
  barMeta: { position: 'absolute', top: -3, width: 3, height: 16, backgroundColor: '#334155', borderRadius: 1.5, zIndex: 2 },

  adherenciaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, paddingVertical: spacing.sm2 },
  adherenciaRowBorder: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  adherenciaNombre: { flex: 1, ...typography.bodySm, fontFamily: typography.label.fontFamily, fontWeight: '600', color: commonColors.text },
  adherenciaPctWrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
  adherenciaPct: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '800' },
  emptyInline: { ...typography.caption, color: commonColors.textSecondary, textAlign: 'center', paddingVertical: spacing.md },
  errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 16 },
  errorTitle: { ...typography.h3, color: commonColors.text, textAlign: 'center' },
  errorText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22 },
  retryBtn: { backgroundColor: BRAND, borderRadius: 99, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 },
  retryBtnText: { ...typography.button, color: obstetraColors.onPrimary },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
});
