import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, ChevronRight as ChevronRightSmall, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { typography } from '../../../src/theme/typography';
import { useTodayAppointments } from '../../../src/services/api-queries';
import { NuevaCitaModal } from '../../../src/components/obstetra/NuevaCitaModal';

export default function CronogramaScreen(): React.ReactElement {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [modalVisible, setModalVisible] = useState(false);
  
  const { data: appointments, isLoading, refetch, isRefetching } = useTodayAppointments();

  const handlePrevDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() - 1);
    setSelectedDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + 1);
    setSelectedDate(newDate);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.headerWrapper}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Cronograma</Text>
          <Text style={styles.headerSubtitle}>Tus citas programadas</Text>
        </SafeAreaView>
      </View>

      <View style={styles.dateSelectorContainer}>
        <View style={styles.dateSelector}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.iconButton} activeOpacity={0.7}>
            <ChevronLeft size={24} color="#64748B" />
          </TouchableOpacity>
          <View style={styles.dateTextContainer}>
            <CalendarIcon size={16} color="#BE185D" />
            <Text style={styles.currentDateText}>
              {selectedDate.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^\w/, c => c.toUpperCase())}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNextDay} style={styles.iconButton} activeOpacity={0.7}>
            <ChevronRight size={24} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    // Map status from API to variant
    const statusMap: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      'confirmed': 'success',
      'pending': 'warning',
      'cancelled': 'danger'
    };
    const variant = statusMap[item.status] || 'default';
    const statusText = item.status === 'confirmed' ? 'Asistida' : item.status === 'pending' ? 'Programada' : 'Cancelada';

    return (
      <TouchableOpacity style={styles.appointmentCard} activeOpacity={0.7}>
        <View style={styles.timeLine}>
          <Text style={styles.timeText}>
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[0]}
          </Text>
          <Text style={styles.timeAmPm}>
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[1] || ''}
          </Text>
        </View>
        <View style={styles.appointmentContent}>
          <View style={styles.appointmentHeaderRow}>
            <Text style={styles.patientName} numberOfLines={1}>{item.patientName || 'Paciente'}</Text>
            <AppBadge label={statusText} variant={variant} />
          </View>
          <Text style={styles.appointmentType}>{item.type || 'Control Prenatal'}</Text>
          <View style={styles.infoRow}>
            <MapPin size={12} color="#94A3B8" />
            <Text style={styles.infoText}>{item.location || 'Consultorio 102'}</Text>
          </View>
        </View>
        <ChevronRightSmall size={20} color="#CBD5E1" />
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: 40, paddingHorizontal: 20 }}>
      {isLoading ? (
        <LoadingScreen message="Cargando citas..." />
      ) : (
        <EmptyState
          icon={CalendarIcon as any}
          title="Sin citas programadas"
          description="No tienes citas agendadas para este día."
          themeColor="#BE185D"
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#BE185D" />}
      />

      <TouchableOpacity 
        style={styles.fab} 
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <NuevaCitaModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerContainer: { marginBottom: 12 },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }), fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), fontSize: 16, color: '#64748B' },
  dateSelectorContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 64,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 8,
  },
  iconButton: { padding: 8 },
  dateTextContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currentDateText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  listContent: { paddingBottom: 100 },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F8FAFC',
  },
  timeLine: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: '#F1F5F9',
    minWidth: 70,
  },
  timeText: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '800', color: '#BE185D' },
  timeAmPm: { fontFamily: typography.caption.fontFamily, fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  appointmentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientName: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1, marginRight: 8 },
  appointmentType: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  infoText: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8' },
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
    zIndex: 999,
  },
});
