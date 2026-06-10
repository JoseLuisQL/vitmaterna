import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, Search, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { usePatients } from '../../../src/services/api-queries';
import { typography } from '../../../src/theme/typography';

export default function GestantesScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'todas' | 'bajo' | 'medio' | 'alto'>('todas');
  const router = useRouter();

  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: patients, isLoading, refetch } = usePatients(debouncedSearch);

  const processedPatients = React.useMemo(() => {
    if (!patients) return [];
    let p = patients;

    switch (filterMode) {
      case 'bajo':
        p = p.filter((x: any) => x.riskLevel === 'Bajo');
        break;
      case 'medio':
        p = p.filter((x: any) => x.riskLevel === 'Medio');
        break;
      case 'alto':
        p = p.filter((x: any) => x.riskLevel === 'Alto');
        break;
      case 'todas':
      default:
        break;
    }
    return p;
  }, [patients, filterMode]);

  const renderHeader = () => (
    <View style={{ paddingBottom: 16 }}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Gestantes</Text>
          <Text style={styles.headerSubtitle}>Tus pacientes asignadas</Text>
        </SafeAreaView>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
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
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={[styles.tabText, filterMode === 'bajo' && styles.tabTextActive]}>Sin riesgo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'medio' && styles.tabButtonActive]}
            onPress={() => setFilterMode('medio')}
          >
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={[styles.tabText, filterMode === 'medio' && styles.tabTextActive]}>Moderado</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, filterMode === 'alto' && styles.tabButtonActive]}
            onPress={() => setFilterMode('alto')}
          >
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={[styles.tabText, filterMode === 'alto' && styles.tabTextActive]}>Alto</Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isLoading && processedPatients.length > 0 && (
        <Text style={styles.resultsCount}>
          {processedPatients.length} gestante(s) encontradas
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
                <View style={[styles.dotSm, { backgroundColor: item.riskLevel === 'Alto' ? '#EF4444' : item.riskLevel === 'Medio' ? '#F59E0B' : '#10B981' }]} />
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
            </View>

            {item.estimatedDueDate && (
              <Text style={styles.fppText}>FPP: {new Date(item.estimatedDueDate).toISOString().split('T')[0]}</Text>
            )}
          </View>
          <ChevronRight size={20} color="#94A3B8" />
        </View>
        <View style={styles.riskBarContainer}>
          <LinearGradient
            colors={['#10B981', '#F59E0B', '#EF4444']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.riskBar, { width: `${Math.min(((item.currentWeek || 0) / 40) * 100, 100)}%` }]}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: 40, paddingHorizontal: 20 }}>
      {isLoading ? (
        <Text style={styles.loadingText}>Buscando pacientes...</Text>
      ) : (
        <EmptyState
          icon={Baby as any}
          title="Sin resultados"
          description={search ? "No se encontraron pacientes con esa búsqueda." : "Aún no tienes pacientes asignadas a tu cargo."}
          themeColor="#BE185D"
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={processedPatients}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#BE185D" />}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/(obstetra)/gestante/nueva' as any)}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }), fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), fontSize: 16, color: '#64748B' },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  searchInput: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#0F172A' },
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
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#1E293B',
    borderColor: '#1E293B',
  },
  tabText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  resultsCount: {
    color: '#64748B',
    fontFamily: typography.body.fontFamily,
    fontSize: 13,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: -8,
  },
  listContent: { paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 12, paddingHorizontal: 16 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { fontFamily: typography.h3.fontFamily, fontSize: 16, fontWeight: '800', color: '#BE185D' },
  info: { flex: 1, marginRight: 12 },
  name: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  details: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#64748B', marginBottom: 8 },
  cardBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  riskBadgeLow: { backgroundColor: '#ECFDF5' },
  riskBadgeMedium: { backgroundColor: '#FEF3C7' },
  riskBadgeHigh: { backgroundColor: '#FEF2F2' },
  dotSm: { width: 4, height: 4, borderRadius: 2, marginRight: 4 },
  riskBadgeText: { fontFamily: typography.caption.fontFamily, fontSize: 12, fontWeight: '600' },
  riskBadgeTextLow: { color: '#047857' },
  riskBadgeTextMedium: { color: '#B45309' },
  riskBadgeTextHigh: { color: '#B91C1C' },
  gestationalBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gestationalBadgeText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: '#475569',
    fontWeight: '600'
  },
  fppText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    color: '#64748B',
  },
  riskBarContainer: {
    height: 4,
    backgroundColor: '#F1F5F9',
    width: '100%',
    overflow: 'hidden',
  },
  riskBar: {
    height: '100%',
  },
  loadingText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#94A3B8', textAlign: 'center' },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#BE185D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BE185D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
