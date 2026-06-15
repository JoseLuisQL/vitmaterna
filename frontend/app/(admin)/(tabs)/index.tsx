/**
 * VITMATERNA - Admin: Inicio (Dashboard de control)
 *
 * Pantalla principal del administrador: resumen del estado del sistema con KPIs
 * globales, pendientes de aprobación con acción directa y accesos rápidos a la
 * gestión. Es el punto de partida del panel.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Users, Baby, Calendar, AlertTriangle, BookOpen, Bell, UserCheck, ChevronRight,
  ShieldCheck, FileText,
} from 'lucide-react-native';
import { AutoGrid } from '../../../src/components/ui';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useAdminDashboard } from '../../../src/services/admin-queries';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = adminColors.primary;

function Kpi({ icon: Icon, label, value, color, bg }: { icon: any; label: string; value: number | string; color: string; bg: string }) {
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: bg }]}>
        <Icon size={20} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

export default function AdminInicioScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, refetch, isRefetching } = useAdminDashboard();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ padding: spacing.lg }}>
          <DashboardSkeleton count={3} />
        </SafeAreaView>
      </View>
    );
  }

  const d = data;
  const pendientes = d?.usuarios.obstetrasPendientes ?? 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.greeting}>Panel de administración</Text>
          <Text style={styles.name}>Hola, {user?.firstName || 'Administrador'}</Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
      >
        {/* Pendiente de aprobación (acción directa) */}
        {pendientes > 0 && (
          <TouchableOpacity style={styles.alertCard} onPress={() => router.push('/(admin)/(tabs)/usuarios')} activeOpacity={0.8}>
            <View style={styles.alertIcon}><UserCheck size={22} color={semanticColors.warning} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{pendientes} obstetra{pendientes > 1 ? 's' : ''} por aprobar</Text>
              <Text style={styles.alertText}>Revisa y activa las cuentas pendientes</Text>
            </View>
            <ChevronRight size={20} color={commonColors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* KPIs de usuarios */}
        <Text style={styles.sectionTitle}>Usuarios</Text>
        <AutoGrid minColumnWidth={150} maxColumns={4}>
          <Kpi icon={Users} label="Total usuarios" value={d?.usuarios.total ?? 0} color={BRAND} bg={adminColors.primaryLight} />
          <Kpi icon={UserCheck} label="Obstetras" value={d?.usuarios.obstetras ?? 0} color={semanticColors.info} bg={semanticColors.infoLight} />
          <Kpi icon={Baby} label="Gestantes" value={d?.usuarios.gestantes ?? 0} color={semanticColors.success} bg={semanticColors.successLight} />
          <Kpi icon={ShieldCheck} label="Admins" value={d?.usuarios.admins ?? 0} color={commonColors.textSecondary} bg={commonColors.surfaceAlt} />
        </AutoGrid>

        {/* KPIs clínicos / operativos */}
        <Text style={styles.sectionTitle}>Actividad clínica</Text>
        <AutoGrid minColumnWidth={150} maxColumns={4}>
          <Kpi icon={Baby} label="Gestantes activas" value={d?.gestantes.activas ?? 0} color={semanticColors.success} bg={semanticColors.successLight} />
          <Kpi icon={AlertTriangle} label="Alto riesgo" value={d?.gestantes.altoRiesgo ?? 0} color={semanticColors.danger} bg={semanticColors.dangerLight} />
          <Kpi icon={Calendar} label="Citas hoy" value={d?.citas.hoy ?? 0} color={semanticColors.info} bg={semanticColors.infoLight} />
          <Kpi icon={AlertTriangle} label="Alertas pendientes" value={d?.alertas.pendientes ?? 0} color={semanticColors.warning} bg={semanticColors.warningLight} />
        </AutoGrid>

        {/* Contenido educativo */}
        <Text style={styles.sectionTitle}>Contenido educativo</Text>
        <AutoGrid minColumnWidth={150} maxColumns={3}>
          <Kpi icon={BookOpen} label="Publicados" value={d?.contenido.publicado ?? 0} color={BRAND} bg={adminColors.primaryLight} />
          <Kpi icon={FileText} label="Total recursos" value={d?.contenido.total ?? 0} color={commonColors.textSecondary} bg={commonColors.surfaceAlt} />
          <Kpi icon={BookOpen} label="Vistas totales" value={d?.contenido.vistasTotales ?? 0} color={semanticColors.info} bg={semanticColors.infoLight} />
        </AutoGrid>

        {/* Estado de notificaciones */}
        <Text style={styles.sectionTitle}>Canales de notificación</Text>
        <TouchableOpacity style={styles.channelsCard} onPress={() => router.push('/(admin)/(tabs)/notificaciones')} activeOpacity={0.8}>
          <View style={styles.channelRow}>
            <Bell size={18} color={BRAND} />
            <Text style={styles.channelLabel}>SMS</Text>
            <View style={[styles.statusDot, { backgroundColor: d?.notificaciones.smsConfigurado ? semanticColors.success : commonColors.textTertiary }]} />
            <Text style={styles.channelStatus}>{d?.notificaciones.smsConfigurado ? 'Activo' : 'Modo prueba'}</Text>
          </View>
          <View style={styles.channelRow}>
            <Bell size={18} color={BRAND} />
            <Text style={styles.channelLabel}>WhatsApp</Text>
            <View style={[styles.statusDot, { backgroundColor: d?.notificaciones.whatsappConfigurado ? semanticColors.success : commonColors.textTertiary }]} />
            <Text style={styles.channelStatus}>{d?.notificaciones.whatsappConfigurado ? 'Activo' : 'Modo prueba'}</Text>
          </View>
          <Text style={styles.channelHint}>Toca para configurar credenciales y probar</Text>
        </TouchableOpacity>

        {/* Accesos rápidos */}
        <Text style={styles.sectionTitle}>Gestión</Text>
        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(admin)/(tabs)/usuarios')} activeOpacity={0.8}>
            <Users size={22} color={BRAND} /><Text style={styles.quickText}>Usuarios</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(admin)/(tabs)/contenido')} activeOpacity={0.8}>
            <BookOpen size={22} color={BRAND} /><Text style={styles.quickText}>Contenido</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => router.push('/(admin)/(tabs)/mas')} activeOpacity={0.8}>
            <ShieldCheck size={22} color={BRAND} /><Text style={styles.quickText}>Más</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingBottom: spacing.xl, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  greeting: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)' },
  name: { ...typography.display, color: commonColors.white, marginTop: 2 },
  date: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', textTransform: 'capitalize', marginTop: 2 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace, marginTop: -spacing.lg },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: semanticColors.warningLight, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: semanticColors.warning },
  alertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  alertText: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg, marginLeft: 4 },
  kpi: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { ...typography.h2, color: commonColors.text },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  channelsCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, borderWidth: 1, borderColor: commonColors.border, gap: spacing.sm },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  channelLabel: { ...typography.bodyMedium, color: commonColors.text, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  channelStatus: { ...typography.caption, color: commonColors.textSecondary },
  channelHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: 4 },
  quickGrid: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { flex: 1, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: commonColors.border },
  quickText: { ...typography.caption, fontWeight: '600', color: commonColors.text },
});
