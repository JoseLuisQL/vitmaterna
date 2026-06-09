import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Text, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { StatusChip } from '../../../src/components/ui/StatusChip';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useAppointments } from '../../../src/services/api-queries';
import { typography } from '../../../src/theme/typography';

type Tab = 'upcoming' | 'past';

export default function CitasScreen(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const { data, isLoading, refetch } = useAppointments();

  if (isLoading) {
    return <LoadingScreen message="Cargando citas..." />;
  }

  const appointments = data || [];
  const now = new Date();

  const filteredAppointments = appointments.filter((app: any) => {
    const appDate = new Date(app.date);
    if (activeTab === 'upcoming') {
      return appDate >= now;
    } else {
      return appDate < now;
    }
  });

  const renderHeader = () => (
    <View style={{ paddingBottom: 16 }}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mis Citas</Text>
        </SafeAreaView>
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Próximas
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Pasadas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateContainer}>
          <Text style={styles.monthText}>
            {new Date(item.date).toLocaleString('es-ES', { month: 'short' }).toUpperCase()}
          </Text>
          <Text style={styles.dayText}>{new Date(item.date).getDate()}</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.typeText}>{item.type || 'Control Prenatal'}</Text>
          <View style={styles.infoRow}>
            <Clock size={14} color="#64748B" />
            <Text style={styles.infoText}>
              {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <MapPin size={14} color="#64748B" />
            <Text style={styles.infoText}>{item.location || 'Consultorio 102'}</Text>
          </View>
        </View>
        <StatusChip status={item.status || 'confirmed'} />
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={{ marginTop: 40, paddingHorizontal: 20 }}>
      <EmptyState
        icon={Calendar}
        title={activeTab === 'upcoming' ? "Sin citas programadas" : "No hay citas pasadas"}
        description={activeTab === 'upcoming' 
          ? "Aquí aparecerán tus próximas citas de control prenatal." 
          : "Aún no tienes un historial de citas pasadas."}
        themeColor="#7C3AED"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredAppointments}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7C3AED" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 99,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 99,
  },
  activeTab: {
    backgroundColor: '#7C3AED',
  },
  tabText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateContainer: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    marginRight: 16,
  },
  monthText: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '700',
    color: '#7C3AED',
  },
  dayText: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 22,
    fontWeight: '800',
    color: '#7C3AED',
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  typeText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    color: '#64748B',
  },
});
