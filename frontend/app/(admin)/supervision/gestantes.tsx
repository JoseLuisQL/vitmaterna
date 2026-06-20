/**
 * VITMATERNA - Admin: Supervisión de Gestantes (solo lectura)
 * Lista global de gestantes del sistema con buscador y filtro de riesgo.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, StatusBar } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, Search, X, Baby } from 'lucide-react-native';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { DataTable, type DataTableColumn } from '../../../src/components/web';
import { usePatients } from '../../../src/services/api-queries';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { useResponsive } from '../../../src/theme/responsive';
import { commonColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = adminColors.primary;
const RISKS = [
  { key: null, label: 'Todas' },
  { key: 'Bajo', label: 'Bajo' },
  { key: 'Medio', label: 'Medio' },
  { key: 'Alto', label: 'Alto' },
] as const;

export default function AdminGestantesScreen(): React.ReactElement {
  const router = useRouter();
  const { webShell } = useResponsive();
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState<string | null>(null);
  const { data: patients = [], isLoading } = usePatients();
  const debouncedSearch = useDebouncedValue(search, 400);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (patients as any[]).filter((p) => {
      if (risk && p.riskLevel !== risk) return false;
      if (q && !(`${p.firstName} ${p.lastName} ${p.documentNumber || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [patients, debouncedSearch, risk]);

  const riskBadge = (lvl?: string) => (
    <AppBadge label={lvl || 'Bajo'} variant={lvl === 'Alto' ? 'danger' : lvl === 'Medio' ? 'warning' : 'success'} size="sm" />
  );

  // ── PORTAL WEB: tabla densa ──
  if (webShell) {
    const columns: DataTableColumn<any>[] = [
      {
        key: 'nombre', header: 'Gestante', flex: 2,
        sortValue: (p) => `${p.firstName} ${p.lastName}`.toLowerCase(),
        render: (p) => (
          <View style={styles.tableUserCell}>
            <View style={styles.tableAvatar}><Text style={styles.avatarText}>{(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}</Text></View>
            <Text style={styles.tableName} numberOfLines={1}>{p.firstName} {p.lastName}</Text>
          </View>
        ),
      },
      { key: 'dni', header: 'DNI', width: 120, sortValue: (p) => p.documentNumber || '', render: (p) => p.documentNumber || '—' },
      { key: 'sem', header: 'Semanas', width: 110, align: 'center', sortValue: (p) => p.currentWeek || 0, render: (p) => (p.currentWeek ? `${p.currentWeek} sem` : '—') },
      { key: 'riesgo', header: 'Riesgo', width: 120, align: 'center', sortValue: (p) => p.riskLevel || 'Bajo', render: (p) => riskBadge(p.riskLevel) },
    ];

    return (
      <View style={styles.container}>
        <ScreenLayout
          role="admin"
          title="Gestantes"
          subtitle={`${patients.length} registradas · solo lectura`}
          showBack
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)'))}
          width="full"
          accentColor={BRAND}
          scroll={false}
        >
          <View style={styles.webToolbar}>
            <View style={styles.webSearchBox}>
              <Search size={18} color={commonColors.textTertiary} />
              <TextInput style={styles.webSearchInput} value={search} onChangeText={setSearch} placeholder="Buscar por nombre o DNI…" placeholderTextColor={commonColors.textTertiary} />
              {search ? <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}><X size={16} color={commonColors.textTertiary} /></TouchableOpacity> : null}
            </View>
            <View style={styles.filterRow}>
              {RISKS.map((r) => (
                <TouchableOpacity key={String(r.key)} style={[styles.filterChip, risk === r.key && styles.filterChipActive]} onPress={() => setRisk(r.key)}>
                  <Text style={[styles.filterChipText, risk === r.key && styles.filterChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <DataTable
            columns={columns}
            data={isLoading ? [] : filtered}
            keyExtractor={(p) => p.id}
            loading={isLoading}
            emptyIcon={Baby}
            emptyTitle="Sin gestantes"
            emptyMessage={search || risk ? 'No hay gestantes con ese filtro.' : 'Aún no hay gestantes registradas.'}
            emptyAccent={BRAND}
          />
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)'))} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} accessibilityLabel="Volver" accessibilityRole="button">
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Gestantes</Text>
              <Text style={styles.subtitle}>{patients.length} registradas · solo lectura</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <FlashList
        data={isLoading ? [] : filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <View style={styles.searchBox}>
              <Search size={18} color={commonColors.textTertiary} />
              <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Buscar por nombre o DNI…" placeholderTextColor={commonColors.textTertiary} />
              {search ? <TouchableOpacity onPress={() => setSearch('')} hitSlop={10}><X size={16} color={commonColors.textTertiary} /></TouchableOpacity> : null}
            </View>
            <View style={styles.filterRow}>
              {RISKS.map((r) => (
                <TouchableOpacity key={String(r.key)} style={[styles.filterChip, risk === r.key && styles.filterChipActive]} onPress={() => setRisk(r.key)}>
                  <Text style={[styles.filterChipText, risk === r.key && styles.filterChipTextActive]}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
              <Text style={styles.meta}>DNI: {item.documentNumber || '—'}{item.currentWeek ? ` · ${item.currentWeek} sem` : ''}</Text>
            </View>
            <AppBadge label={item.riskLevel || 'Bajo'} variant={item.riskLevel === 'Alto' ? 'danger' : item.riskLevel === 'Medio' ? 'warning' : 'success'} />
          </View>
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? <View style={{ paddingTop: spacing.lg }}><ListSkeleton count={6} /></View>
            : <View style={{ marginTop: 60 }}><EmptyState icon={Baby} title="Sin gestantes" description={search || risk ? 'No hay gestantes con ese filtro.' : 'Aún no hay gestantes registradas.'} themeColor={BRAND} /></View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: {},
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: layout.tabBarSpace },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surface, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 46, marginBottom: spacing.md, borderWidth: 1, borderColor: commonColors.border },
  searchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  filterChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  filterChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  filterChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  filterChipTextActive: { color: commonColors.white },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm2, borderWidth: 1, borderColor: commonColors.border, ...shadows.card },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.bodyMedium, fontWeight: '700', color: BRAND },
  name: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  meta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  // ── Portal web ──
  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  webSearchBox: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 44 },
  webSearchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text, outlineWidth: 0 } as any,
  tableUserCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },
});
