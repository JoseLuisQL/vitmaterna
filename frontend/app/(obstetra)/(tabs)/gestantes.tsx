import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TouchableOpacity, TextInput, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Baby, Search, ChevronRight, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { typography } from '../../../src/theme/typography';
import { usePatients } from '../../../src/services/api-queries';

export default function GestantesScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  const router = useRouter();
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: patients, isLoading, refetch } = usePatients(debouncedSearch);

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
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
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
          <Text style={styles.details}>DNI: {item.documentNumber} • Edad: {item.age || 28}</Text>
        </View>
        <AppBadge 
          label={item.riskLevel || 'Bajo'} 
          variant={item.riskLevel === 'Alto' ? 'danger' : item.riskLevel === 'Medio' ? 'warning' : 'success'} 
        />
        <ChevronRight size={20} color="#94A3B8" style={{ marginLeft: 12 }} />
      </View>
    </TouchableOpacity>
  );

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
        data={patients}
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
  listContent: { paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#BE185D' },
  info: { flex: 1, marginRight: 12 },
  name: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  details: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#64748B' },
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
