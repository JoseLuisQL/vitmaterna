/**
 * VITMATERNA — Obstetra: Inicio (panel de trabajo)
 *
 * Rediseño minimalista y ordenado, alineado con el dashboard del administrador:
 *   - Header estandarizado (ScreenLayout), sin solapamientos ni avatar recargado.
 *   - 3 KPIs accionables, sobrios (icono neutro, sin fondos de color).
 *   - Distribución de riesgo compacta y discreta (acento solo donde aporta).
 *   - Citas de hoy en lista clara.
 * Evita la sobrecarga visual y de color; los textos se ajustan sin cortarse.
 */
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ChevronRight, Activity, Calendar, Users, AlertTriangle, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useAuthStore } from '../../../src/store/authStore';
import { useObstetraDashboard, useTodayAppointments } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { useResponsive } from '../../../src/theme/responsive';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';

const BRAND = obstetraColors.primary;

/** KPI sobrio: icono neutro + cifra + etiqueta. Acento opcional solo en la cifra. */
function Kpi({
  icon: Icon, value, label, onPress, alert,
}: { icon: any; value: number; label: string; onPress: () => void; alert?: boolean }) {
  return (
    <TouchableOpacity style={styles.kpiCard} activeOpacity={0.85} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${value} ${label}`}>
      <Icon size={20} color={alert && value > 0 ? semanticColors.danger : commonColors.textSecondary} />
      <Text style={[styles.kpiValue, alert && value > 0 && { color: semanticColors.danger }]} numberOfLines={1}>{value}</Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function ObstetraDashboard(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { open: openSidebar } = useSidebar();
  const { webShell } = useResponsive();
  // Nombre real, sin prefijos asumidos (no se asume "Dra.").
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim() || 'Obstetra';
  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  const { data: stats, isLoading: isStatsLoading, refetch: refetchStats, isRefetching: isRefetchingStats } = useObstetraDashboard();
  const { data: appointments, isLoading: isApptsLoading, refetch: refetchAppts, isRefetching: isRefetchingAppts } = useTodayAppointments();

  useRefetchOnFocus([refetchStats, refetchAppts]);

  const onRefresh = () => {
    refetchStats();
    refetchAppts();
  };

  const { totalPatients = 0, alerts = 0, appointmentsToday = 0, riskDistribution = { low: 0, medium: 0, high: 0 } } = stats || {};
  const isRefetching = isRefetchingStats || isRefetchingAppts;
  const totalRisk = (riskDistribution.low || 0) + (riskDistribution.medium || 0) + (riskDistribution.high || 0);

  const renderHeader = () => (
    <View>
      {/* Saludo discreto */}
      <Text style={styles.greeting} numberOfLines={1}>Hola, {displayName}</Text>
      <Text style={styles.todayDate} numberOfLines={1}>{fecha}</Text>

      {/* 3 KPIs accionables, sobrios */}
      <View style={styles.kpiRow}>
        <Kpi icon={Calendar} value={appointmentsToday} label="Citas hoy" onPress={() => router.push('/(obstetra)/(tabs)/cronograma')} />
        <Kpi icon={Users} value={totalPatients} label="Pacientes" onPress={() => router.push('/(obstetra)/(tabs)/gestantes')} />
        <Kpi icon={AlertTriangle} value={alerts} label="Alertas" alert onPress={() => router.push('/(obstetra)/notificaciones')} />
      </View>

      {/* Distribución de riesgo: discreta, una sola tarjeta */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Distribución de riesgo</Text>
        <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/reportes')} accessibilityRole="button">
          <Text style={styles.sectionLink}>Ver reportes</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.riskCard}>
        <View style={styles.riskRow}>
          <View style={styles.riskItem}>
            <Text style={styles.riskCount}>{riskDistribution.low || 0}</Text>
            <View style={styles.riskLabelRow}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskGreen }]} />
              <Text style={styles.riskLabel}>Bajo</Text>
            </View>
          </View>
          <View style={styles.riskItem}>
            <Text style={styles.riskCount}>{riskDistribution.medium || 0}</Text>
            <View style={styles.riskLabelRow}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskYellow }]} />
              <Text style={styles.riskLabel}>Medio</Text>
            </View>
          </View>
          <View style={styles.riskItem}>
            <Text style={styles.riskCount}>{riskDistribution.high || 0}</Text>
            <View style={styles.riskLabelRow}>
              <View style={[styles.riskDot, { backgroundColor: riskColors.riskRed }]} />
              <Text style={styles.riskLabel}>Alto</Text>
            </View>
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

      {/* Citas de hoy */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Citas de hoy</Text>
        <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/cronograma')} accessibilityRole="button">
          <Text style={styles.sectionLink}>Ver todas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Activity size={28} color={commonColors.textTertiary} />
      </View>
      <Text style={styles.emptyText}>No tienes citas programadas para hoy.</Text>
    </View>
  );

  return (
    <ScreenLayout
      role="obstetra"
      title="Inicio"
      subtitle="Panel de trabajo"
      loading={isStatsLoading || isApptsLoading}
      accentColor={BRAND}
      width="full"
      scroll={false}
      actions={
        webShell ? undefined : (
          <>
            <NotificationBell href="/(obstetra)/notificaciones" color={commonColors.white} />
            <TouchableOpacity
              onPress={openSidebar}
              style={styles.menuBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Abrir menú"
            >
              <Menu size={22} color={commonColors.white} />
            </TouchableOpacity>
          </>
        )
      }
    >
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id || item._id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.flatListContent, webShell && styles.flatListWeb]}
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
              <Text style={styles.timeText} numberOfLines={1}>
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
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flatListContent: { paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  flatListWeb: { width: '100%', paddingBottom: spacing.xl },
  menuBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },

  greeting: { ...typography.h3, color: commonColors.text },
  todayDate: { ...typography.bodySm, color: commonColors.textSecondary, textTransform: 'capitalize', marginTop: 2, marginBottom: spacing.lg },

  // KPIs sobrios
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    gap: spacing.sm,
  },
  kpiValue: { ...typography.h1, color: commonColors.text },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.label, fontWeight: '700', color: commonColors.text },
  sectionLink: { ...typography.caption, color: BRAND, fontWeight: '600' },

  riskCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: commonColors.border },
  riskRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  riskItem: { alignItems: 'center', flex: 1, gap: 6 },
  riskCount: { ...typography.h2, color: commonColors.text },
  riskLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  riskDot: { width: 8, height: 8, borderRadius: 4 },
  riskLabel: { ...typography.caption, color: commonColors.textSecondary },
  riskBarContainer: { flexDirection: 'row', height: 6, borderRadius: borderRadius.full, overflow: 'hidden' },
  riskBarSegment: { height: '100%' },

  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  timeLine: { alignItems: 'center', justifyContent: 'center', paddingRight: spacing.md, borderRightWidth: 1, borderRightColor: commonColors.borderLight, minWidth: 64 },
  timeText: { ...typography.h3, color: commonColors.text },
  timeAmPm: { ...typography.overline, color: commonColors.textTertiary, marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: spacing.md, justifyContent: 'center', minWidth: 0 },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
  patientName: { ...typography.bodyMedium, fontWeight: '600', color: commonColors.text, flex: 1 },
  appointmentType: { ...typography.bodySmall, color: commonColors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyText: { ...typography.bodyMedium, color: commonColors.textSecondary },
});
