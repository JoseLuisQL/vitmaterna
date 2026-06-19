import React, { useState } from 'react';
import { View, StyleSheet, Text, RefreshControl, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Baby, Search, ChevronRight, Plus, AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { DataTable, type DataTableColumn } from '../../../src/components/web';
import { usePatientsInfinite } from '../../../src/services/api-queries';
import { useResponsive } from '../../../src/theme/responsive';
import { commonColors, obstetraColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';

const BRAND = obstetraColors.primary;

/** Mapea el filtro visual al nivel de riesgo que entiende el backend. */
const RISK_FILTER_MAP: Record<'todas' | 'bajo' | 'medio' | 'alto', 'verde' | 'amarillo' | 'rojo' | undefined> = {
  todas: undefined,
  bajo: 'verde',
  medio: 'amarillo',
  alto: 'rojo',
};

export default function GestantesScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todas' | 'bajo' | 'medio' | 'alto'>('todas');
  const router = useRouter();
  const { webShell } = useResponsive();

  const debouncedSearch = useDebouncedValue(search, 400);

  const {
    data, isLoading, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = usePatientsInfinite(debouncedSearch, RISK_FILTER_MAP[filterMode]);

  // Aplana todas las páginas cargadas (orden del backend: última registrada primero).
  // El filtro de riesgo ya viene aplicado por el backend, así que NO se vuelve a
  // filtrar en cliente (eso causaba conteos falsos sobre páginas no cargadas).
  const processedPatients = React.useMemo(
    () => (data?.pages || []).flatMap((pg: any) => pg.items),
    [data],
  );

  // Total real de coincidencias (del backend), no solo lo cargado en memoria.
  const totalCount = React.useMemo(
    () => (data?.pages?.[0] as any)?.total ?? processedPatients.length,
    [data, processedPatients.length],
  );

  const renderHeader = () => (
    <View style={{ paddingBottom: 16 }}>
      <LinearGradient
        colors={obstetraColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gestantes</Text>
              <Text style={styles.headerSubtitle}>Tus pacientes asignadas</Text>
            </View>
            <NotificationBell href="/(obstetra)/notificaciones" />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={commonColors.textTertiary} style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={commonColors.textTertiary}
          />
        </View>
      </View>

      <View style={styles.filtersScrollWrapper}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'todas' && styles.tabButtonActive]}
            onPress={() => setFilterMode('todas')}
          >
            <Text style={[styles.tabText, filterMode === 'todas' && styles.tabTextActive]}>Todas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'bajo' && styles.tabButtonActive]}
            onPress={() => setFilterMode('bajo')}
          >
            <View style={[styles.dot, { backgroundColor: riskColors.riskGreen }]} />
            <Text style={[styles.tabText, filterMode === 'bajo' && styles.tabTextActive]}>Sin riesgo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'medio' && styles.tabButtonActive]}
            onPress={() => setFilterMode('medio')}
          >
            <View style={[styles.dot, { backgroundColor: riskColors.riskYellow }]} />
            <Text style={[styles.tabText, filterMode === 'medio' && styles.tabTextActive]}>Moderado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'alto' && styles.tabButtonActive]}
            onPress={() => setFilterMode('alto')}
          >
            <View style={[styles.dot, { backgroundColor: riskColors.riskRed }]} />
            <Text style={[styles.tabText, filterMode === 'alto' && styles.tabTextActive]}>Alto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isLoading && totalCount > 0 && (
        <Text style={styles.resultsCount}>
          {totalCount} gestante(s) encontradas
        </Text>
      )}
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(obstetra)/gestante/${item.id || item._id}` as any)}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
            <Text style={styles.details}>DNI {item.documentNumber} {item.historiaClinica ? `· HC-${item.historiaClinica}` : ''}</Text>

            <View style={styles.cardBadges}>
              <View style={[styles.riskBadge,
              item.riskLevel === 'Alto' ? styles.riskBadgeHigh :
                item.riskLevel === 'Medio' ? styles.riskBadgeMedium : styles.riskBadgeLow]}>
                <View style={[styles.dotSm, { backgroundColor: item.riskLevel === 'Alto' ? riskColors.riskRed : item.riskLevel === 'Medio' ? riskColors.riskYellow : riskColors.riskGreen }]} />
                <Text style={[styles.riskBadgeText,
                item.riskLevel === 'Alto' ? styles.riskBadgeTextHigh :
                  item.riskLevel === 'Medio' ? styles.riskBadgeTextMedium : styles.riskBadgeTextLow]}>
                  {item.riskLevel === 'Alto' ? 'Alto riesgo' : item.riskLevel === 'Medio' ? 'Riesgo moderado' : 'Sin riesgo'}
                </Text>
              </View>

              {item.currentWeek && (
                <View style={styles.gestationalBadge}>
                  <Text style={styles.gestationalBadgeText}>Sem {item.currentWeek} · {item.currentTrimester}° trim.</Text>
                </View>
              )}

              {/* Predicción de inasistencia: solo se muestra si es medio/alto,
                  para destacar a quién priorizar (seguimiento/visita). */}
              {item.noShowRisk && item.noShowRisk.level !== 'bajo' && (
                <View
                  style={[
                    styles.noShowBadge,
                    item.noShowRisk.level === 'alto' ? styles.noShowBadgeHigh : styles.noShowBadgeMedium,
                  ]}
                  accessibilityLabel={`Riesgo de inasistencia ${item.noShowRisk.level}. ${item.noShowRisk.motivos?.[0] ?? ''}`}
                >
                  <AlertTriangle
                    size={12}
                    color={item.noShowRisk.level === 'alto' ? riskColors.riskRed : riskColors.riskYellow}
                  />
                  <Text
                    style={[
                      styles.noShowBadgeText,
                      item.noShowRisk.level === 'alto' ? styles.riskBadgeTextHigh : styles.riskBadgeTextMedium,
                    ]}
                  >
                    {item.noShowRisk.level === 'alto' ? 'Riesgo de faltar' : 'Posible falta'}
                  </Text>
                </View>
              )}
            </View>

            {item.estimatedDueDate && (
              <Text style={styles.fppText}>FPP: {new Date(item.estimatedDueDate).toISOString().split('T')[0]}</Text>
            )}
          </View>
          <ChevronRight size={20} color={commonColors.textTertiary} />
        </View>
        <View style={styles.riskBarContainer}>
          <View
            style={[styles.riskBar, { width: `${Math.min(((item.currentWeek || 0) / 40) * 100, 100)}%` }]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : (
        <EmptyState
          icon={Baby as any}
          title="Sin resultados"
          description={search ? "No se encontraron pacientes con esa búsqueda." : "Aún no tienes pacientes asignadas a tu cargo."}
          themeColor={BRAND}
        />
      )}
    </View>
  );

  // ── PORTAL WEB: tabla densa de pacientes ──
  if (webShell) {
    const riskMeta = (lvl?: string) =>
      lvl === 'Alto'
        ? { label: 'Alto riesgo', variant: 'danger' as const }
        : lvl === 'Medio'
          ? { label: 'Riesgo moderado', variant: 'warning' as const }
          : { label: 'Sin riesgo', variant: 'success' as const };

    const WEB_FILTERS = [
      { key: 'todas', label: 'Todas' },
      { key: 'bajo', label: 'Sin riesgo' },
      { key: 'medio', label: 'Moderado' },
      { key: 'alto', label: 'Alto' },
    ] as const;

    const columns: DataTableColumn<any>[] = [
      {
        key: 'nombre', header: 'Gestante', flex: 2,
        sortValue: (p) => `${p.firstName} ${p.lastName}`.toLowerCase(),
        render: (p) => (
          <View style={styles.tableUserCell}>
            <View style={styles.tableAvatar}><Text style={styles.tableAvatarText}>{(p.firstName?.[0] || '') + (p.lastName?.[0] || '')}</Text></View>
            <Text style={styles.tableName} numberOfLines={1}>{p.firstName} {p.lastName}</Text>
          </View>
        ),
      },
      { key: 'dni', header: 'DNI / HC', width: 140, sortValue: (p) => p.documentNumber || '', render: (p) => `${p.documentNumber || '—'}${p.historiaClinica ? ` · HC-${p.historiaClinica}` : ''}` },
      { key: 'sem', header: 'Semanas', width: 120, align: 'center', sortValue: (p) => p.currentWeek || 0, render: (p) => (p.currentWeek ? `Sem ${p.currentWeek}${p.currentTrimester ? ` · ${p.currentTrimester}°` : ''}` : '—') },
      { key: 'riesgo', header: 'Riesgo', width: 150, sortValue: (p) => p.riskLevel || 'Bajo', render: (p) => { const m = riskMeta(p.riskLevel); return <AppBadge label={m.label} variant={m.variant} size="sm" />; } },
      { key: 'fpp', header: 'FPP', width: 120, sortValue: (p) => p.estimatedDueDate || '', render: (p) => (p.estimatedDueDate ? new Date(p.estimatedDueDate).toISOString().split('T')[0] : '—') },
    ];

    return (
      <View style={styles.container}>
        <ScreenLayout
          role="obstetra"
          title="Gestantes"
          subtitle="Tus pacientes asignadas"
          width="full"
          accentColor={BRAND}
          scroll={false}
        >
          <View style={styles.webToolbar}>
            <View style={styles.webSearchBox}>
              <Search size={18} color={commonColors.textTertiary} />
              <TextInput style={styles.webSearchInput} value={search} onChangeText={setSearch} placeholder="Buscar por nombre o DNI..." placeholderTextColor={commonColors.textTertiary} />
            </View>
            <View style={styles.webFilterRow}>
              {WEB_FILTERS.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.webChip, filterMode === f.key && styles.webChipActive]} onPress={() => setFilterMode(f.key as any)}>
                  <Text style={[styles.webChipText, filterMode === f.key && styles.webChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.webCreateBtn} onPress={() => router.push('/(obstetra)/gestante/nueva' as any)} activeOpacity={0.85}>
              <Plus size={18} color={commonColors.white} />
              <Text style={styles.webCreateText}>Nueva gestante</Text>
            </TouchableOpacity>
          </View>

          <DataTable
            columns={columns}
            data={processedPatients}
            keyExtractor={(p) => p.id || p._id}
            loading={isLoading}
            onRowPress={(p) => router.push(`/(obstetra)/gestante/${p.id || p._id}` as any)}
            emptyIcon={Baby as any}
            emptyTitle="Sin resultados"
            emptyMessage={search ? 'No se encontraron pacientes con esa búsqueda.' : 'Aún no tienes pacientes asignadas a tu cargo.'}
            emptyAccent={BRAND}
          />
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlashList
        data={processedPatients}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
        onEndReached={() => { if (hasNextPage && !isFetchingNextPage) fetchNextPage(); }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? <ActivityIndicator size="small" color={BRAND} style={{ marginVertical: spacing.lg }} /> : null
        }
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(obstetra)/gestante/nueva' as any)}>
        <Plus size={28} color={obstetraColors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },

  // ── Portal web ──
  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  webSearchBox: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 44 },
  webSearchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text, outlineWidth: 0 } as any,
  webFilterRow: { flexDirection: 'row', gap: spacing.sm },
  webChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  webChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  webChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  webChipTextActive: { color: commonColors.white },
  webCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: BRAND, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, height: 44 },
  webCreateText: { ...typography.button, color: commonColors.white, fontSize: 14 },
  tableUserCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tableAvatarText: { ...typography.caption, fontWeight: '700', color: BRAND },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },

  headerWrapper: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)' },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    height: 56,
    ...shadows.card,
  },
  searchInput: { flex: 1, ...typography.bodyMedium, color: commonColors.text },
  filtersScrollWrapper: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  tabsWrapper: {
    flexDirection: 'row',
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm2,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
    ...shadows.card,
  },
  tabButtonActive: {
    backgroundColor: BRAND,
  },
  tabText: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  tabTextActive: {
    color: obstetraColors.onPrimary,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  resultsCount: {
    color: commonColors.textSecondary,
    ...typography.caption,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: -8,
  },
  listContent: { paddingBottom: layout.tabBarSpace },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingTop: spacing.md,
    overflow: 'hidden',
    ...shadows.card,
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 12, paddingHorizontal: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { ...typography.h3, color: BRAND },
  info: { flex: 1, marginRight: 12 },
  name: { ...typography.bodyMedium, color: commonColors.text, marginBottom: 2 },
  details: { ...typography.caption, color: commonColors.textSecondary, marginBottom: 8 },
  cardBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskBadgeLow: { backgroundColor: riskColors.riskGreenLight },
  riskBadgeMedium: { backgroundColor: riskColors.riskYellowLight },
  riskBadgeHigh: { backgroundColor: riskColors.riskRedLight },
  dotSm: { width: 4, height: 4, borderRadius: 2, marginRight: 4 },
  riskBadgeText: { ...typography.overline, letterSpacing: 0.1 },
  riskBadgeTextLow: { color: riskColors.riskGreen },
  riskBadgeTextMedium: { color: riskColors.riskYellow },
  riskBadgeTextHigh: { color: riskColors.riskRed },
  noShowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  noShowBadgeMedium: { backgroundColor: riskColors.riskYellowLight },
  noShowBadgeHigh: { backgroundColor: riskColors.riskRedLight },
  noShowBadgeText: { ...typography.overline, letterSpacing: 0.1 },
  gestationalBadge: {
    backgroundColor: commonColors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gestationalBadgeText: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
  },
  fppText: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
  },
  riskBarContainer: {
    height: 4,
    backgroundColor: commonColors.surfaceAlt,
    width: '100%',
    overflow: 'hidden',
  },
  riskBar: {
    height: '100%',
    backgroundColor: BRAND,
  },
  loadingText: { ...typography.bodyMedium, color: commonColors.textTertiary, textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...coloredGlow(BRAND),
  },
});
