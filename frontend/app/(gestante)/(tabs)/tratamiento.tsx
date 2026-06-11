import React from 'react';
import {
  View, StyleSheet, Text, FlatList, RefreshControl,
  TouchableOpacity, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, CheckCircle, Clock, Info } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useToast } from '../../../src/components/ui';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useTreatments, useLogTreatment } from '../../../src/services/api-queries';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

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

export default function TratamientoScreen(): React.ReactElement {
  const { data: treatments, isLoading, refetch, isRefetching } = useTreatments();
  const { mutate: logTreatment } = useLogTreatment();
  const toast = useToast();

  useRefetchOnFocus([refetch]);

  if (isLoading) return <LoadingScreen message="Cargando tu tratamiento..." />;

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
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mi Tratamiento</Text>
          {semanaGestacional && (
            <Text style={styles.headerSubtitle}>Semana {semanaGestacional} de gestación</Text>
          )}
        </SafeAreaView>
      </View>

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
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.display,
    color: commonColors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.body,
    color: commonColors.textSecondary,
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
    paddingBottom: spacing.xl,
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
