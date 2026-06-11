import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TrendingUp, ChevronRight, Activity } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { KpiCard } from '../../../src/components/ui/KpiCard';
import { useAuthStore } from '../../../src/store/authStore';
import { useObstetraDashboard, useTodayAppointments } from '../../../src/services/api-queries';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

const BRAND = obstetraColors.primary;

export default function ObstetraDashboard(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.lastName ? `Dra. ${user.lastName}` : 'Obstetra';

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats, isRefetching: isRefetchingStats } = useObstetraDashboard();
  const { data: appointments, isLoading: isApptsLoading, refetch: refetchAppts, isRefetching: isRefetchingAppts } = useTodayAppointments();

  if (isStatsLoading || isApptsLoading) {
    return <LoadingScreen message="Cargando panel..." />;
  }

  const onRefresh = () => {
    refetchStats();
    refetchAppts();
  };

  const { totalPatients = 0, alerts = 0, appointmentsToday = 0, completed = 0, riskDistribution = { low: 0, medium: 0, high: 0 } } = stats || {};
  const isRefetching = isRefetchingStats || isRefetchingAppts;

  const renderHeader = () => (
    <View style={styles.headerContainer}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.headerWrapper}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Bienvenida,</Text>
              <Text style={styles.name}>{displayName}</Text>
            </View>
            <View style={styles.avatarWrap}>
              <Text style={styles.avatarText}>{displayName.charAt(4) || 'O'}</Text>
            </View>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.topCardsWrapper}>
        <View style={styles.todayCard}>
          <View style={styles.todayHeader}>
            <View>
              <Text style={styles.todayTitle}>Resumen del Día</Text>
              <Text style={styles.todayDate}>
                {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.iconCircle}>
              <TrendingUp size={20} color={BRAND} />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statsRow}>
            <KpiCard label="Citas Hoy" value={appointmentsToday} />
            <KpiCard label="Pacientes" value={totalPatients} />
          </View>
          <View style={styles.statsRow}>
            <KpiCard
              label="Alertas"
              value={alerts}
              badge={alerts > 0 ? 'Pendientes' : undefined}
              badgeTone={alerts > 0 ? 'negative' : 'neutral'}
            />
            <KpiCard
              label="Completadas"
              value={completed}
              badge={completed > 0 ? 'Hoy' : undefined}
              badgeTone="positive"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Distribución de Riesgo</Text>
        <View style={styles.riskCard}>
          <View style={styles.riskRow}>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskGreen }]} />
              <Text style={styles.riskCount}>{riskDistribution.low || 0}</Text>
              <Text style={styles.riskLabel}>Bajo</Text>
            </View>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskYellow }]} />
              <Text style={styles.riskCount}>{riskDistribution.medium || 0}</Text>
              <Text style={styles.riskLabel}>Medio</Text>
            </View>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskRed }]} />
              <Text style={styles.riskCount}>{riskDistribution.high || 0}</Text>
              <Text style={styles.riskLabel}>Alto</Text>
            </View>
          </View>
          <View style={styles.riskBarContainer}>
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.low, 1), backgroundColor: riskColors.riskGreen }]} />
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.medium, 1), backgroundColor: riskColors.riskYellow }]} />
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.high, 1), backgroundColor: riskColors.riskRed }]} />
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Próximas Citas</Text>
          <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/cronograma')}>
            <Text style={styles.sectionLink}>Ver todas</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Activity size={32} color={commonColors.textTertiary} />
      </View>
      <Text style={styles.emptyText}>No tienes citas programadas para hoy.</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id || item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        refreshing={isRefetching}
        onRefresh={onRefresh}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.appointmentCard}
            activeOpacity={0.7}
            onPress={() => item.gestanteId && router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: item.gestanteId } } as any)}
          >
            <View style={styles.timeLine}>
              <Text style={styles.timeText}>
                {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[0]}
              </Text>
              <Text style={styles.timeAmPm}>
                {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[1] || ''}
              </Text>
            </View>
            <View style={styles.appointmentContent}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.patientName}>{item.patientName || 'Paciente'}</Text>
                <AppBadge label={item.riskLevel || 'Bajo'} variant={item.riskLevel === 'Alto' ? 'danger' : item.riskLevel === 'Medio' ? 'warning' : 'success'} />
              </View>
              <Text style={styles.appointmentType}>{item.type || 'Control Prenatal'}</Text>
            </View>
            <ChevronRight size={20} color={commonColors.textTertiary} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  flatListContent: { paddingBottom: 100 },
  headerContainer: { marginBottom: 12 },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { ...typography.body, color: commonColors.textSecondary, marginBottom: 4 },
  name: { ...typography.display, color: commonColors.text },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h2, color: BRAND },
  topCardsWrapper: { paddingHorizontal: 20 },
  todayCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayTitle: { ...typography.h3, color: commonColors.text, marginBottom: 4 },
  todayDate: { ...typography.bodySmall, color: commonColors.textSecondary, textTransform: 'capitalize' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  statsGrid: { marginBottom: 24, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: 16 },
  sectionLink: { ...typography.label, color: BRAND },
  riskCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  riskItem: { alignItems: 'center', flex: 1 },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  riskCount: { ...typography.h2, color: commonColors.text, marginBottom: 2 },
  riskLabel: { ...typography.caption, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  riskBarContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  riskBarSegment: { height: '100%' },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  timeLine: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: commonColors.borderLight,
    minWidth: 70,
  },
  timeText: { ...typography.h3, color: BRAND },
  timeAmPm: { ...typography.overline, color: commonColors.textTertiary, marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientName: { ...typography.bodyMedium, color: commonColors.text, flex: 1, marginRight: 8 },
  appointmentType: { ...typography.bodySmall, color: commonColors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { ...typography.bodyMedium, color: commonColors.textSecondary },
});
