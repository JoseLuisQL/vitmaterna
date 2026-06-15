import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Activity, Calendar, Users, AlertTriangle, ChevronRight as Chevron } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useAuthStore } from '../../../src/store/authStore';
import { useObstetraDashboard, useTodayAppointments } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = obstetraColors.primary;

/** Inicial del nombre mostrado, robusta (antes usaba charAt(4), frágil). */
function getInitial(user: { firstName?: string; lastName?: string } | null): string {
  const src = user?.lastName || user?.firstName || 'O';
  return src.trim().charAt(0).toUpperCase() || 'O';
}

export default function ObstetraDashboard(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const displayName = user?.lastName ? `Dra. ${user.lastName}` : 'Obstetra';

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats, isRefetching: isRefetchingStats } = useObstetraDashboard();
  const { data: appointments, isLoading: isApptsLoading, refetch: refetchAppts, isRefetching: isRefetchingAppts } = useTodayAppointments();

  useRefetchOnFocus([refetchStats, refetchAppts]);

  if (isStatsLoading || isApptsLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <DashboardSkeleton count={3} />
        </SafeAreaView>
      </View>
    );
  }

  const onRefresh = () => {
    refetchStats();
    refetchAppts();
  };

  const { totalPatients = 0, alerts = 0, appointmentsToday = 0, riskDistribution = { low: 0, medium: 0, high: 0 } } = stats || {};
  const isRefetching = isRefetchingStats || isRefetchingAppts;
  const totalRisk = (riskDistribution.low || 0) + (riskDistribution.medium || 0) + (riskDistribution.high || 0);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={obstetraColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerWrapper}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.greeting}>Bienvenida,</Text>
              <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.todayDate}>
                {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <NotificationBell href="/(obstetra)/notificaciones" />
              <TouchableOpacity
                style={styles.avatarWrap}
                onPress={() => router.push('/(obstetra)/(tabs)/perfil')}
                accessibilityRole="button"
                accessibilityLabel="Mi perfil"
              >
                <Text style={styles.avatarText}>{getInitial(user)}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.topCardsWrapper}>
        {/* Resumen del día: 3 KPIs accionables */}
        <View style={styles.kpiRow}>
          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.85} onPress={() => router.push('/(obstetra)/(tabs)/cronograma')}>
            <View style={[styles.kpiIcon, { backgroundColor: obstetraColors.primaryLight }]}>
              <Calendar size={20} color={BRAND} />
            </View>
            <Text style={styles.kpiValue}>{appointmentsToday}</Text>
            <Text style={styles.kpiLabel}>Citas hoy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.85} onPress={() => router.push('/(obstetra)/(tabs)/gestantes')}>
            <View style={[styles.kpiIcon, { backgroundColor: semanticColors.successLight }]}>
              <Users size={20} color={semanticColors.success} />
            </View>
            <Text style={styles.kpiValue}>{totalPatients}</Text>
            <Text style={styles.kpiLabel}>Pacientes</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.kpiCard} activeOpacity={0.85} onPress={() => router.push('/(obstetra)/(tabs)/alertas')}>
            <View style={[styles.kpiIcon, { backgroundColor: semanticColors.dangerLight }]}>
              <AlertTriangle size={20} color={semanticColors.danger} />
            </View>
            <Text style={[styles.kpiValue, alerts > 0 && { color: semanticColors.danger }]}>{alerts}</Text>
            <Text style={styles.kpiLabel}>Alertas</Text>
          </TouchableOpacity>
        </View>

        {/* Distribución de riesgo: compacta, con enlace a reportes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Distribución de riesgo</Text>
          <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/reportes')} style={styles.linkRow} accessibilityRole="button">
            <Text style={styles.sectionLink}>Ver reportes</Text>
            <Chevron size={14} color={BRAND} />
          </TouchableOpacity>
        </View>
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
          {totalRisk > 0 && (
            <View style={styles.riskBarContainer}>
              <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.low, 0.001), backgroundColor: riskColors.riskGreen }]} />
              <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.medium, 0.001), backgroundColor: riskColors.riskYellow }]} />
              <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.high, 0.001), backgroundColor: riskColors.riskRed }]} />
            </View>
          )}
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Citas de hoy</Text>
          <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/cronograma')} accessibilityRole="button">
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
                <Text style={styles.patientName} numberOfLines={1}>{item.patientName || 'Paciente'}</Text>
                <AppBadge label={item.riskLevel || 'Bajo'} variant={item.riskLevel === 'Alto' ? 'danger' : item.riskLevel === 'Medio' ? 'warning' : 'success'} />
              </View>
              <Text style={styles.appointmentType} numberOfLines={1}>{item.type || 'Control Prenatal'}</Text>
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
  flatListContent: { paddingBottom: layout.tabBarSpace },
  headerContainer: { marginBottom: spacing.sm2 },
  headerWrapper: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  greeting: { ...typography.body, color: 'rgba(255,255,255,0.9)', marginBottom: 2 },
  name: { ...typography.display, color: commonColors.white },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h2, color: commonColors.white },
  topCardsWrapper: { paddingHorizontal: spacing.lg, marginTop: -spacing.lg },
  todayDate: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', marginTop: 2 },

  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: { flex: 1, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { ...typography.h2, color: commonColors.text },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md, marginTop: spacing.sm },
  sectionTitle: { ...typography.h3, color: commonColors.text },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionLink: { ...typography.label, color: BRAND, fontWeight: '600' },

  riskCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.card },
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
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm2,
    ...shadows.card,
  },
  timeLine: { alignItems: 'center', justifyContent: 'center', paddingRight: 16, borderRightWidth: 1, borderRightColor: commonColors.borderLight, minWidth: 70 },
  timeText: { ...typography.h3, color: BRAND },
  timeAmPm: { ...typography.overline, color: commonColors.textTertiary, marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
  patientName: { ...typography.bodyMedium, color: commonColors.text, flex: 1 },
  appointmentType: { ...typography.bodySmall, color: commonColors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { ...typography.bodyMedium, color: commonColors.textSecondary },
});
