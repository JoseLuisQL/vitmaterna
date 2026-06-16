/**
 * VITMATERNA - Admin: Supervisión de Citas (solo lectura)
 * Agenda global del sistema con filtro por estado.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useAppointments } from '../../../src/services/api-queries';
import { commonColors, adminColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = adminColors.primary;
const FILTERS = [
  { key: 'todas', label: 'Todas' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'hoy', label: 'Hoy' },
] as const;

const STATUS_VARIANT: Record<string, any> = {
  asistida: 'success', confirmada: 'success', programada: 'info',
  reprogramada: 'warning', solicitud_reprogramacion: 'warning',
  no_asistida: 'danger', cancelada: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  asistida: 'Asistida', confirmada: 'Confirmada', programada: 'Programada',
  reprogramada: 'Reprogramada', solicitud_reprogramacion: 'Solicita reprog.',
  no_asistida: 'No asistió', cancelada: 'Cancelada',
};

export default function AdminCitasScreen(): React.ReactElement {
  const router = useRouter();
  const [filter, setFilter] = useState<'todas' | 'proximas' | 'hoy'>('todas');
  const { data: appointments = [], isLoading } = useAppointments();

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (appointments as any[])
      .filter((a) => {
        const d = new Date(a.date).toISOString().split('T')[0];
        if (filter === 'hoy') return d === today;
        if (filter === 'proximas') return d >= today;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, filter]);

  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)'))} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Volver" accessibilityRole="button">
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Citas</Text>
              <Text style={styles.subtitle}>Agenda global · solo lectura</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlatList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.filterRow}>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
                <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.dateBox}><Calendar size={18} color={BRAND} /><Text style={styles.dateText}>{fmt(item.date)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.patientName || 'Paciente'}</Text>
              <Text style={styles.meta}>{item.type || 'Control Prenatal'}</Text>
            </View>
            <AppBadge label={STATUS_LABEL[item.status] || item.status} variant={STATUS_VARIANT[item.status] || 'default'} />
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? <View style={{ paddingTop: spacing.lg }}><ListSkeleton count={6} /></View>
            : <View style={{ marginTop: 60 }}><EmptyState icon={Calendar} title="Sin citas" description="No hay citas con ese filtro." themeColor={BRAND} /></View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: layout.tabBarSpace },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  filterChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  filterChipTextActive: { color: commonColors.white },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm2, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  dateBox: { alignItems: 'center', gap: 2, minWidth: 64 },
  dateText: { ...typography.caption, fontWeight: '700', color: BRAND },
  name: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  meta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
});
