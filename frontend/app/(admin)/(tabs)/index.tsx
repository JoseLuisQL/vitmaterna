/**
 * VITMATERNA - Admin: Inicio (Dashboard de control)
 *
 * Rediseño F2: panel claro y no saturado. En vez de 14 KPIs dispersos, prioriza
 * un resumen ejecutivo (4 cifras clave), una acción directa (obstetras por
 * aprobar) y el estado del sistema en una tarjeta compacta. Lo secundario se
 * consulta en sus pantallas. Comprensible de un vistazo.
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Users, Baby, Calendar, AlertTriangle, BookOpen, ChevronRight,
  UserCheck, BellRing, BarChart3, Menu,
} from 'lucide-react-native';
import { AutoGrid, PressableScale, IconButton } from '../../../src/components/ui';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useAdminDashboard } from '../../../src/services/admin-queries';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { useResponsive } from '../../../src/theme/responsive';

const BRAND = adminColors.primary;

/** KPI compacto del resumen ejecutivo. */
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

/** Fila de la tarjeta "Estado del sistema". */
function StatusRow({
  icon: Icon, label, value, valueColor, last,
}: { icon: any; label: string; value: string; valueColor?: string; last?: boolean }) {
  return (
    <View style={[styles.statusRow, !last && styles.statusRowBorder]}>
      <Icon size={18} color={commonColors.textSecondary} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={[styles.statusValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
    </View>
  );
}

export default function AdminInicioScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { open: openSidebar } = useSidebar();
  const { webShell } = useResponsive();
  const { data, isLoading, refetch, isRefetching } = useAdminDashboard();

  const d = data;
  // Pendientes de aprobación de TODOS los roles (issue #7). Fallback al conteo
  // de obstetras si el backend aún no expone el total general.
  const pendientes = d?.usuarios.pendientes ?? d?.usuarios.obstetrasPendientes ?? 0;
  const fecha = new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <ScreenLayout
      role="admin"
      title={`Hola, ${user?.firstName || 'Administrador'}`}
      subtitle={fecha}
      loading={isLoading}
      refreshing={isRefetching}
      onRefresh={refetch}
      accentColor={BRAND}
      width="full"
      actions={
        webShell ? undefined : (
          <>
            <NotificationBell href="/(admin)/avisos" color={commonColors.white} />
            <IconButton icon={Menu} onPress={openSidebar} accessibilityLabel="Abrir menú" variant="onColor" />
          </>
        )
      }
    >
      {/* Acción directa: usuarios pendientes de aprobación (cualquier rol) */}
      {pendientes > 0 && (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => router.push('/(admin)/(tabs)/usuarios')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${pendientes} cuentas por aprobar`}
        >
          <View style={styles.alertIcon}><UserCheck size={22} color={semanticColors.warning} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.alertTitle}>{pendientes} cuenta{pendientes > 1 ? 's' : ''} por aprobar</Text>
            <Text style={styles.alertText}>Toca para revisar y aprobar las cuentas pendientes</Text>
          </View>
          <ChevronRight size={20} color={commonColors.textTertiary} />
        </TouchableOpacity>
      )}

      {/* Resumen ejecutivo: 4 cifras clave */}
      <Text style={styles.sectionTitle}>Resumen</Text>
      <AutoGrid minColumnWidth={150} maxColumns={4}>
        <Kpi icon={Users} label="Usuarios" value={d?.usuarios.total ?? 0} color={BRAND} bg={adminColors.primaryLight} />
        <Kpi icon={Baby} label="Gestantes activas" value={d?.gestantes.activas ?? 0} color={semanticColors.success} bg={semanticColors.successLight} />
        <Kpi icon={AlertTriangle} label="Alto riesgo" value={d?.gestantes.altoRiesgo ?? 0} color={semanticColors.danger} bg={semanticColors.dangerLight} />
        <Kpi icon={Calendar} label="Citas hoy" value={d?.citas.hoy ?? 0} color={semanticColors.info} bg={semanticColors.infoLight} />
      </AutoGrid>

      {/* En el portal web, "Estado del sistema" y "Gestión" comparten fila
          (2 columnas) para aprovechar el ancho. En móvil van apilados. */}
      <View style={webShell ? styles.twoCol : undefined}>
        <View style={webShell ? styles.col : undefined}>
          {/* Estado del sistema: lo informativo, compacto */}
          <Text style={styles.sectionTitle}>Estado del sistema</Text>
          <View style={styles.statusCard}>
            <StatusRow
              icon={AlertTriangle}
              label="Alertas pendientes"
              value={String(d?.alertas.pendientes ?? 0)}
              valueColor={(d?.alertas.pendientes ?? 0) > 0 ? semanticColors.danger : commonColors.textSecondary}
            />
            <StatusRow
              icon={BookOpen}
              label="Contenido publicado"
              value={`${d?.contenido.publicado ?? 0} de ${d?.contenido.total ?? 0}`}
            />
            <StatusRow
              icon={BellRing}
              label="SMS"
              value={d?.notificaciones.smsConfigurado ? 'Activo' : 'Modo prueba'}
              valueColor={d?.notificaciones.smsConfigurado ? semanticColors.success : commonColors.textTertiary}
            />
            <StatusRow
              icon={BellRing}
              label="WhatsApp"
              value={d?.notificaciones.whatsappConfigurado ? 'Activo' : 'Modo prueba'}
              valueColor={d?.notificaciones.whatsappConfigurado ? semanticColors.success : commonColors.textTertiary}
              last
            />
          </View>
        </View>

        <View style={webShell ? styles.col : undefined}>
          {/* Accesos rápidos (3) */}
          <Text style={styles.sectionTitle}>Gestión</Text>
          <View style={styles.quickGrid}>
            <PressableScale style={styles.quickBtn} onPress={() => router.push('/(admin)/(tabs)/usuarios')}>
              <Users size={22} color={BRAND} /><Text style={styles.quickText}>Usuarios</Text>
            </PressableScale>
            <PressableScale style={styles.quickBtn} onPress={() => router.push('/(admin)/(tabs)/contenido')}>
              <BookOpen size={22} color={BRAND} /><Text style={styles.quickText}>Contenido</Text>
            </PressableScale>
            <PressableScale style={styles.quickBtn} onPress={() => router.push('/(admin)/supervision/reportes')}>
              <BarChart3 size={22} color={BRAND} /><Text style={styles.quickText}>Reportes</Text>
            </PressableScale>
          </View>
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: semanticColors.warningLight, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.sm, borderWidth: 1, borderColor: semanticColors.warning },
  alertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  alertText: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.lg, marginLeft: 4 },

  kpi: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  kpiIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  kpiValue: { ...typography.h2, color: commonColors.text },
  kpiLabel: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  statusCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  statusRowBorder: { borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  statusLabel: { ...typography.bodySmall, color: commonColors.text, flex: 1 },
  statusValue: { ...typography.label, fontWeight: '700', color: commonColors.textSecondary },

  twoCol: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
  quickGrid: { flexDirection: 'row', gap: spacing.sm },
  quickBtn: { flex: 1, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  quickText: { ...typography.caption, fontWeight: '600', color: commonColors.text },
});
