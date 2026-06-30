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
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from 'react-native';
import { ChevronRight, Activity, Calendar, Users, AlertTriangle, Menu } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { IconButton } from '../../../src/components/ui/IconButton';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useAuthStore } from '../../../src/store/authStore';
import { useObstetraDashboard, useTodayAppointments } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { useResponsive } from '../../../src/theme/responsive';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { formatHora } from '../../../src/utils/datetime';

const BRAND = obstetraColors.primary;

/** Máximo de citas a mostrar en el widget "Citas de hoy" del dashboard web. */
const DASHBOARD_TODAY_LIMIT = 8;

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

const AppointmentTimeBadge = ({ item }: { item: any }) => {
  const full = formatHora(item.hora || item.date);
  const parts = full.split(' ');
  const timePart = parts[0] || '--:--';
  const ampmPart = parts.slice(1).join('').toUpperCase().replace(/\./g, '');
  return (
    <View style={styles.timeLine}>
      <Text style={styles.timeText} numberOfLines={1}>{timePart}</Text>
      <Text style={styles.timeAmPm} numberOfLines={1}>{ampmPart}</Text>
    </View>
  );
};

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

  // Objetivos del tour guiado.
  const kpisTarget = useTourTarget(TOUR_TARGETS.obstetraKpis);
  const riskTarget = useTourTarget(TOUR_TARGETS.obstetraRisk);
  const citasHoyTarget = useTourTarget(TOUR_TARGETS.obstetraCitasHoy);
  const totalRisk = (riskDistribution.low || 0) + (riskDistribution.medium || 0) + (riskDistribution.high || 0);

  const renderHeader = () => (
    <View>
      {/* Saludo discreto */}
      <Text style={styles.greeting} numberOfLines={1}>Hola, {displayName}</Text>
      <Text style={styles.todayDate} numberOfLines={1}>{fecha}</Text>

      {/* 3 KPIs accionables, sobrios */}
      <View ref={kpisTarget} collapsable={false} style={styles.kpiRow}>
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
      <View ref={riskTarget} collapsable={false} style={styles.riskCard}>
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
      <View ref={!webShell ? citasHoyTarget : undefined} collapsable={false} style={styles.sectionHeader}>
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
      width={webShell ? 'wide' : 'full'}
      scroll={false}
      actions={
        webShell ? undefined : (
          <>
            <NotificationBell href="/(obstetra)/notificaciones" color={commonColors.white} />
            <IconButton icon={Menu} onPress={openSidebar} accessibilityLabel="Abrir menú" variant="onColor" />
          </>
        )
      }
    >
      {webShell ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.flatListContent} showsVerticalScrollIndicator={false}>
          {/* Saludo discreto */}
          <Text style={styles.greeting} numberOfLines={1}>Hola, {displayName}</Text>
          <Text style={styles.todayDate} numberOfLines={1}>{fecha}</Text>

          {/* 3 KPIs accionables, sobrios */}
          <View ref={kpisTarget} collapsable={false} style={styles.kpiRow}>
            <Kpi icon={Calendar} value={appointmentsToday} label="Citas hoy" onPress={() => router.push('/(obstetra)/(tabs)/cronograma')} />
            <Kpi icon={Users} value={totalPatients} label="Pacientes" onPress={() => router.push('/(obstetra)/(tabs)/gestantes')} />
            <Kpi icon={AlertTriangle} value={alerts} label="Alertas" alert onPress={() => router.push('/(obstetra)/notificaciones')} />
          </View>

          {/* Distribución de riesgo y Citas de hoy side-by-side */}
          <View style={styles.twoCol}>
            <View style={styles.col}>
              <View style={[styles.sectionHeader, { marginTop: 0 }]}>
                <Text style={styles.sectionTitle}>Distribución de riesgo</Text>
                <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/reportes')} accessibilityRole="button">
                  <Text style={styles.sectionLink}>Ver reportes</Text>
                </TouchableOpacity>
              </View>
              <View ref={riskTarget} collapsable={false} style={[styles.riskCard, { flex: 1, marginBottom: 0 }]}>
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
            </View>

            <View style={styles.col}>
              <View ref={webShell ? citasHoyTarget : undefined} collapsable={false} style={[styles.sectionHeader, { marginTop: 0 }]}>
                <Text style={styles.sectionTitle}>Citas de hoy</Text>
                <TouchableOpacity onPress={() => router.push('/(obstetra)/(tabs)/cronograma')} accessibilityRole="button">
                  <Text style={styles.sectionLink}>Ver todas</Text>
                </TouchableOpacity>
              </View>
              <View style={{ gap: spacing.sm, flex: 1 }}>
                {appointments && appointments.length > 0 ? (
                  // Widget de dashboard: este es un resumen del día acotado, no un
                  // feed. Se renderiza dentro del ScrollView de dos columnas, por
                  // lo que NO se usa FlashList (anidar una lista virtualizada en un
                  // ScrollView de la misma orientación rompe la virtualización).
                  // En su lugar se acota la cantidad visible; "Ver todas" lleva al
                  // cronograma completo, evitando un render sin límite si el día
                  // tuviera muchísimas citas.
                  appointments.slice(0, DASHBOARD_TODAY_LIMIT).map((item: any) => (
                    <TouchableOpacity
                      key={item.id || item._id}
                      style={[styles.appointmentCard, { marginBottom: 0 }]}
                      activeOpacity={0.7}
                      onPress={() => item.gestanteId && router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: item.gestanteId } } as any)}
                    >
                      <AppointmentTimeBadge item={item} />
                      <View style={styles.appointmentContent}>
                        <View style={styles.appointmentHeader}>
                          <Text style={styles.patientName} numberOfLines={1}>{item.patientName || 'Paciente'}</Text>
                          <AppBadge label={item.riskLevel || 'Bajo'} variant={item.riskLevel === 'Alto' ? 'danger' : item.riskLevel === 'Medio' ? 'warning' : 'success'} />
                        </View>
                        <Text style={styles.appointmentType} numberOfLines={1}>{item.type || 'Control Prenatal'}</Text>
                        {item.observaciones ? (
                          <Text style={[styles.appointmentType, { color: commonColors.textSecondary, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
                            {item.observaciones}
                          </Text>
                        ) : null}
                      </View>
                      <ChevronRight size={20} color={commonColors.textTertiary} />
                    </TouchableOpacity>
                  ))
                ) : (
                  renderEmpty()
                )}
                {appointments && appointments.length > DASHBOARD_TODAY_LIMIT && (
                  <TouchableOpacity
                    onPress={() => router.push('/(obstetra)/(tabs)/cronograma')}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver las ${appointments.length} citas de hoy`}
                  >
                    <Text style={styles.moreLink}>
                      Ver {appointments.length - DASHBOARD_TODAY_LIMIT} citas más
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      ) : (
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
              <AppointmentTimeBadge item={item} />
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
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flatListContent: { paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  flatListWeb: { width: '100%', paddingBottom: spacing.xl },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },

  greeting: { ...typography.h3, color: commonColors.text },
  todayDate: { ...typography.bodySm, color: commonColors.textSecondary, textTransform: 'capitalize', marginTop: 2, marginBottom: spacing.lg },

  // KPIs sobrios
  kpiRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  kpiCard: {
    flex: 1,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md2,
    gap: spacing.sm,
    ...shadows.card,
  },
  kpiValue: { ...typography.h1, color: commonColors.text },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm, marginTop: spacing.sm },
  sectionTitle: { ...typography.label, fontWeight: '700', color: commonColors.text },
  sectionLink: { ...typography.caption, color: BRAND, fontWeight: '600' },
  moreLink: { ...typography.bodySm, color: BRAND, fontWeight: '600', textAlign: 'center', paddingVertical: spacing.sm },

  riskCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.sm, ...shadows.card },
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
    ...shadows.card,
  },
  timeLine: { alignItems: 'center', justifyContent: 'center', paddingRight: spacing.md, borderRightWidth: 1, borderRightColor: commonColors.borderLight, minWidth: 72 },
  timeText: { ...typography.h3, color: commonColors.text, fontWeight: '700' },
  timeAmPm: { ...typography.overline, color: commonColors.textSecondary, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
  appointmentContent: { flex: 1, paddingLeft: spacing.md, justifyContent: 'center', minWidth: 0 },
  appointmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: spacing.sm },
  patientName: { ...typography.bodyMd, fontWeight: '600', color: commonColors.text, flex: 1 },
  appointmentType: { ...typography.bodySm, color: commonColors.textSecondary },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  emptyText: { ...typography.bodyMd, color: commonColors.textSecondary },
});
