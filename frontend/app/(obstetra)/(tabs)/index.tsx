import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Users, AlertCircle, CheckCircle, TrendingUp, ChevronRight, Activity } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { useAuthStore } from '../../../src/store/authStore';
import { useObstetraDashboard, useTodayAppointments } from '../../../src/services/api-queries';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { typography } from '../../../src/theme/typography';

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
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
              <TrendingUp size={20} color="#BE185D" />
            </View>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {[
            { id: 'citas', label: 'Citas Hoy', value: appointmentsToday, icon: Calendar, color: '#BE185D', bg: '#FDF2F8' },
            { id: 'pacientes', label: 'Pacientes', value: totalPatients, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
            { id: 'alertas', label: 'Alertas', value: alerts, icon: AlertCircle, color: '#EF4444', bg: '#FEF2F2' },
            { id: 'completadas', label: 'Completadas', value: completed, icon: CheckCircle, color: '#10B981', bg: '#ECFDF5' },
          ].map((item) => (
            <View key={item.id} style={styles.statCard}>
              <View style={styles.statTop}>
                <View style={[styles.statIconWrap, { backgroundColor: item.bg }]}>
                  <item.icon size={18} color={item.color} strokeWidth={2.5} />
                </View>
                <Text style={styles.statValue}>{item.value}</Text>
              </View>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Distribución de Riesgo</Text>
        <View style={styles.riskCard}>
          <View style={styles.riskRow}>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.riskCount}>{riskDistribution.low || 0}</Text>
              <Text style={styles.riskLabel}>Bajo</Text>
            </View>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.riskCount}>{riskDistribution.medium || 0}</Text>
              <Text style={styles.riskLabel}>Medio</Text>
            </View>
            <View style={styles.riskItem}>
              <View style={[styles.riskDot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.riskCount}>{riskDistribution.high || 0}</Text>
              <Text style={styles.riskLabel}>Alto</Text>
            </View>
          </View>
          <View style={styles.riskBarContainer}>
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.low, 1), backgroundColor: '#10B981' }]} />
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.medium, 1), backgroundColor: '#F59E0B' }]} />
            <View style={[styles.riskBarSegment, { flex: Math.max(riskDistribution.high, 1), backgroundColor: '#EF4444' }]} />
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
        <Activity size={32} color="#94A3B8" />
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
            <ChevronRight size={20} color="#CBD5E1" />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
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
  greeting: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), fontSize: 16, color: '#64748B', marginBottom: 4 },
  name: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }), fontSize: 32, fontWeight: '800', color: '#0F172A', letterSpacing: -0.5 },
  avatarWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: typography.h2.fontFamily, fontSize: 24, fontWeight: '800', color: '#BE185D' },
  topCardsWrapper: { paddingHorizontal: 20 },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  todayTitle: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  todayDate: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#64748B', textTransform: 'capitalize' },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24, gap: 12 },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  statTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statIconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: typography.h2.fontFamily, fontSize: 26, fontWeight: '800', color: '#0F172A' },
  statLabel: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 13, fontWeight: '600', color: '#64748B' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, marginTop: 8 },
  sectionTitle: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  sectionLink: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '700', color: '#BE185D' },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  riskItem: { alignItems: 'center', flex: 1 },
  riskDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 8 },
  riskCount: { fontFamily: typography.h2.fontFamily, fontSize: 24, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  riskLabel: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5 },
  riskBarContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  riskBarSegment: { height: '100%' },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  timeLine: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    minWidth: 70,
  },
  timeText: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#BE185D' },
  timeAmPm: { fontFamily: typography.caption.fontFamily, fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientName: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  appointmentType: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B' },
});
