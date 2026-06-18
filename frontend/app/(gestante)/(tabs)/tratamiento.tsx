import React from 'react';
import {
  View, StyleSheet, Text, FlatList, RefreshControl,
  TouchableOpacity, StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, CheckCircle, Clock, Info } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { ProgressRing } from '../../../src/components/ui/ProgressRing';
import { ChartBar, type ChartBarDatum } from '../../../src/components/ui/ChartBar';
import { useToast } from '../../../src/components/ui';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useTreatments, useLogTreatment, useAdherenceGamification } from '../../../src/services/api-queries';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';

const BRAND = gestanteColors.primary;

const INDICACIONES: Record<string, string> = {
  Sulfato: 'Tomar con jugo de naranja para mejor absorción. No tomar con leche o té.',
  Calcio: 'No tomar al mismo tiempo que el hierro. Tomar con agua.',
  Ácido: 'Tomar preferentemente con el desayuno.',
  Calcio_Carbonato: 'Separar del hierro por al menos 2 horas. Tomar con agua.',
};

function getIndicacion(nombre: string): string {
  const key = Object.keys(INDICACIONES).find((k) => nombre.includes(k));
  return key ? INDICACIONES[key] : 'Tomar según indicaciones de su obstetra.';
}

function AdherenciaBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? semanticColors.success : pct >= 50 ? semanticColors.warning : semanticColors.danger;
  return (
    <View>
      <View style={adhStyles.track}>
        <View style={[adhStyles.fill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[adhStyles.pctLabel, { color }]}>{pct}% Adherencia</Text>
    </View>
  );
}

const adhStyles = StyleSheet.create({
  track: { height: 12, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: borderRadius.full },
  pctLabel: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', marginTop: spacing.sm },
});

function CalendarioConsumo({ diasTomados, diasOmitidos }: { diasTomados: string[]; diasOmitidos?: string[] }) {
  const hoy = new Date();
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (29 - i));
    const fecha = d.toISOString().split('T')[0];
    const tomado = diasTomados.includes(fecha);
    const omitido = diasOmitidos?.includes(fecha) || false;
    return { fecha, tomado, omitido, dia: d.getDate() };
  });

  return (
    <View>
      <View style={calStyles.grid}>
        {dias.map((d) => (
          <View
            key={d.fecha}
            style={[
              calStyles.day,
              d.tomado ? calStyles.dayTaken : d.omitido ? calStyles.dayMissed : calStyles.dayEmpty,
            ]}
          >
            <Text style={[calStyles.dayText, d.tomado ? calStyles.dayTextTaken : calStyles.dayTextOther]}>
              {d.dia}
            </Text>
          </View>
        ))}
      </View>
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: semanticColors.success }]} />
          <Text style={calStyles.legendText}>Tomado</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: semanticColors.dangerLight }]} />
          <Text style={calStyles.legendText}>Omitido</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: commonColors.surfaceAlt }]} />
          <Text style={calStyles.legendText}>Sin dato</Text>
        </View>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm + 4 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayTaken: { backgroundColor: semanticColors.success },
  dayMissed: { backgroundColor: semanticColors.dangerLight },
  dayEmpty: { backgroundColor: commonColors.surfaceAlt },
  dayText: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '600' },
  dayTextTaken: { color: commonColors.surface },
  dayTextOther: { color: commonColors.textSecondary },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0.1, color: commonColors.textSecondary },
});

interface AdherenceReport {
  adherencePercentage: number;
  totalSupplements: number;
  takenSupplements: number;
  history: { date: string; taken: number; total: number }[];
}

/**
 * Resumen de adherencia (anillo + últimos 7 días). Antes vivía en la pantalla
 * "Mi Progreso" (tab oculto, ya eliminado); ahora se integra aquí para que toda
 * la información del tratamiento esté en un solo lugar.
 */
function ResumenAdherencia(): React.ReactElement | null {
  const { data } = useQuery({
    queryKey: ['adherence'],
    queryFn: async () => {
      const res = await api.get('/reports/adherence');
      return res.data.data as AdherenceReport;
    },
  });

  const adherence = data?.adherencePercentage ?? 0;
  const history = data?.history ?? [];
  const chartData: ChartBarDatum[] = React.useMemo(
    () =>
      history.slice(-7).map((h) => ({
        label: h.date.substring(8, 10),
        value: h.total > 0 ? Math.round((h.taken / h.total) * 100) : 0,
      })),
    [history],
  );

  if (!data) return null;

  return (
    <View style={progresoStyles.card}>
      <Text style={progresoStyles.cardTitle}>Mi Progreso</Text>
      {/* Anillo + resumen en una fila: compacto y de lectura rápida. */}
      <View style={progresoStyles.topRow}>
        <ProgressRing value={adherence} size={96} strokeWidth={10} color={BRAND} sublabel="adherencia" />
        <View style={progresoStyles.summaryBox}>
          <Text style={progresoStyles.summaryValue}>{data.takenSupplements ?? 0}</Text>
          <Text style={progresoStyles.summaryLabel}>de {data.totalSupplements ?? 0} dosis tomadas</Text>
        </View>
      </View>
      {chartData.length > 0 && (
        <View style={progresoStyles.chartSection}>
          <Text style={progresoStyles.chartTitle}>Últimos 7 días</Text>
          <ChartBar data={chartData} color={BRAND} maxValue={100} height={120} showValues yUnit="%" style={{ marginTop: spacing.xs }} />
        </View>
      )}
    </View>
  );
}

const progresoStyles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardTitle: { ...typography.bodyMedium, fontFamily: typography.h3.fontFamily, fontWeight: '700', color: commonColors.text, marginBottom: spacing.sm2 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryBox: {
    flex: 1,
    backgroundColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
  },
  summaryValue: { ...typography.numeric, fontSize: 26, color: BRAND },
  summaryLabel: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  chartSection: { marginTop: spacing.md },
  chartTitle: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: commonColors.textSecondary, marginBottom: 2 },
});

/**
 * Tarjeta de gamificación: racha de días consecutivos + logros desbloqueados.
 * Refuerza el hábito de toma diaria (Objetivo 2: adherencia). Los datos los
 * calcula el servidor (utils/gamification.ts); aquí solo se muestran.
 */
function RachaCard(): React.ReactElement | null {
  const { data: gamificacion } = useAdherenceGamification();
  if (!gamificacion || gamificacion.totalDiasTomados === 0) return null;

  const { rachaActual, mejorRacha, logros, mensaje } = gamificacion;

  return (
    <View
      style={rachaStyles.card}
      accessible
      accessibilityLabel={`Racha actual: ${rachaActual} días. ${mensaje}`}
    >
      <View style={rachaStyles.headerRow}>
        <View style={rachaStyles.flameWrap}>
          <Text style={rachaStyles.flame}>🔥</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={rachaStyles.streakNumber}>
            {rachaActual} <Text style={rachaStyles.streakUnit}>día{rachaActual === 1 ? '' : 's'} seguidos</Text>
          </Text>
          <Text style={rachaStyles.streakBest}>Mejor racha: {mejorRacha} días</Text>
        </View>
      </View>

      <Text style={rachaStyles.message}>{mensaje}</Text>

      <View style={rachaStyles.badgesRow}>
        {logros.map((l) => (
          <View
            key={l.id}
            style={[rachaStyles.badge, !l.desbloqueado && rachaStyles.badgeLocked]}
            accessible
            accessibilityLabel={`${l.titulo}: ${l.descripcion}. ${l.desbloqueado ? 'Desbloqueado' : 'Bloqueado'}`}
          >
            <Text style={[rachaStyles.badgeIcon, !l.desbloqueado && rachaStyles.badgeIconLocked]}>{l.icono}</Text>
            <Text style={[rachaStyles.badgeLabel, !l.desbloqueado && rachaStyles.badgeLabelLocked]} numberOfLines={1}>
              {l.titulo}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const rachaStyles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: gestanteColors.primaryLight,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flameWrap: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: gestanteColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flame: { fontSize: 28 },
  streakNumber: { ...typography.numeric, fontSize: 28, color: BRAND },
  streakUnit: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  streakBest: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  message: { ...typography.bodySm, color: commonColors.text, marginTop: spacing.sm2, marginBottom: spacing.sm },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  badgeLocked: { backgroundColor: commonColors.background, opacity: 0.55 },
  badgeIcon: { fontSize: 14 },
  badgeIconLocked: { opacity: 0.5 },
  badgeLabel: { ...typography.caption, fontWeight: '700', color: BRAND },
  badgeLabelLocked: { color: commonColors.textSecondary },
});

export default function TratamientoScreen(): React.ReactElement {
  const { data: treatments, isLoading, refetch, isRefetching } = useTreatments();
  const { mutate: logTreatment } = useLogTreatment();
  const toast = useToast();

  useRefetchOnFocus([refetch]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={gestanteColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerWrapper}
        >
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <Text style={styles.headerTitle}>Mi Tratamiento</Text>
          </SafeAreaView>
        </LinearGradient>
        <View style={[styles.contentWrapper, { paddingTop: spacing.lg }]}>
          <ListSkeleton count={4} />
        </View>
      </View>
    );
  }

  function handleRegistrar(id: string, nombre: string, yaTomado: boolean) {
    if (yaTomado) return;
    // La actualización es optimista: adherencia, calendario y progreso se
    // refrescan al instante vía la mutación; aquí solo damos feedback.
    logTreatment(id, {
      onSuccess: () => toast.success('Consumo registrado', `Registraste ${nombre} para hoy.`),
      onError: () => toast.error('No se pudo registrar', 'Revisa tu conexión e inténtalo otra vez.'),
    });
  }

  const semanaGestacional = (treatments as any)?.[0]?.weekNumber || null;
  const treatmentsData = treatments || [];

  const renderHeader = () => (
    <>
      <LinearGradient
        colors={gestanteColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Mi Tratamiento</Text>
              {semanaGestacional && (
                <Text style={styles.headerSubtitle}>Semana {semanaGestacional} de gestación</Text>
              )}
            </View>
            <NotificationBell href="/(gestante)/notificaciones" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.contentWrapper}>
        {semanaGestacional && (
          <View style={styles.infoBanner}>
            <Info size={20} color={semanticColors.info} />
            <Text style={styles.infoBannerText}>
              {semanaGestacional < 14
                ? 'Está tomando Ácido Fólico para proteger el sistema nervioso del bebé.'
                : semanaGestacional < 20
                ? 'Ya inició el Sulfato Ferroso + Ácido Fólico. Continúe el tratamiento diariamente.'
                : 'Toma Sulfato Ferroso y Calcio para apoyar el desarrollo óseo del bebé.'}
            </Text>
          </View>
        )}
      </View>

      <RachaCard />
      <ResumenAdherencia />
    </>
  );

  const renderItem = ({ item }: { item: any }) => {
    const id = item.id || item._id;
    const nombre = item.medicationName || item.nombre || 'Medicamento';
    const dosis = item.dosage || item.dosis || '1 tableta';
    const frecuencia = item.frequency || item.frecuencia || 'Diario';
    const hora = item.scheduleTime || item.horaRecordatorio || '';
    const diasTomados: string[] = item.diasTomados || [];
    const diasOmitidos: string[] = item.diasOmitidos || [];
    const totalDias = item.totalDias || item.duracionDias || 30;
    const pct = typeof item.adherencia === 'number'
      ? item.adherencia
      : totalDias > 0 ? Math.round((diasTomados.length / totalDias) * 100) : 0;
    const yaRegistrado = !!item.taken;

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.pillIcon}>
            <Pill size={24} color={BRAND} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.medName}>{nombre}</Text>
            <Text style={styles.medDosis}>{dosis} · {frecuencia}</Text>
            {hora ? (
              <View style={styles.horaRow}>
                <Clock size={14} color={commonColors.textSecondary} />
                <Text style={styles.horaText}>{hora}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.registerBtn, yaRegistrado && styles.registerBtnDone]}
            onPress={() => handleRegistrar(id, nombre, yaRegistrado)}
            disabled={yaRegistrado}
          >
            <CheckCircle size={18} color={yaRegistrado ? semanticColors.success : commonColors.surface} />
            <Text style={[styles.registerBtnText, yaRegistrado && styles.registerBtnTextDone]}>
              {yaRegistrado ? 'Registrado' : 'Tomé hoy'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.adherenciaWrap}>
          <AdherenciaBar pct={pct} />
          <Text style={styles.adherenciaDays}>{diasTomados.length} de {totalDias} días registrados</Text>
        </View>

        <View style={styles.calendarioSection}>
          <Text style={styles.calendarioTitle}>Últimos 30 días</Text>
          <CalendarioConsumo diasTomados={diasTomados} diasOmitidos={diasOmitidos} />
        </View>

        <View style={styles.indicacionRow}>
          <Info size={16} color={commonColors.textSecondary} />
          <Text style={styles.indicacionText}>{getIndicacion(nombre)}</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon={Pill}
        title="Sin tratamiento activo"
        description="Tu plan de tratamiento aparecerá aquí una vez prescrito por tu obstetra."
        themeColor={BRAND}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={treatmentsData}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerTitle: {
    ...typography.display,
    color: commonColors.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
  },
  contentWrapper: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: semanticColors.infoLight,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
  },
  infoBannerText: {
    flex: 1,
    ...typography.bodySmall,
    color: semanticColors.info,
  },
  listContent: {
    paddingBottom: layout.tabBarSpace,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  pillIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: gestanteColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  medName: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: 4,
  },
  medDosis: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  horaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  horaText: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: BRAND,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  registerBtnDone: { backgroundColor: semanticColors.successLight },
  registerBtnText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
    color: commonColors.surface,
  },
  registerBtnTextDone: { color: semanticColors.success },
  divider: {
    height: 1,
    backgroundColor: commonColors.border,
    marginVertical: spacing.lg,
  },
  adherenciaWrap: { marginBottom: spacing.lg },
  adherenciaDays: {
    ...typography.caption,
    color: commonColors.textSecondary,
    marginTop: 4,
  },
  calendarioSection: { marginBottom: spacing.lg },
  calendarioTitle: {
    ...typography.bodyMedium,
    fontFamily: typography.h3.fontFamily,
    fontWeight: '700',
    color: commonColors.text,
    marginBottom: 4,
  },
  indicacionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm + 4,
    backgroundColor: commonColors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  indicacionText: {
    flex: 1,
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  emptyContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
});
