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
import { useAppointments, useUpdateAppointmentStatus } from '../../../src/services/api-queries';
import { NuevaCitaModal } from '../../../src/components/obstetra/NuevaCitaModal';

export default function CronogramaScreen(): React.ReactElement {
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'todas' | 'hoy' | 'proximas'>('hoy');
  const [modalVisible, setModalVisible] = useState(false);

  const { data: allAppointments, isLoading, refetch, isRefetching } = useAppointments();
  const { mutate: updateStatus } = useUpdateAppointmentStatus();

  // Filter Logic natively matching backend returned data
  const processedAppointments = React.useMemo(() => {
    if (!allAppointments) return [];
    const todayStr = new Date().toISOString().split('T')[0];

    return allAppointments.filter((app: any) => {
      const appDateStr = new Date(app.date).toISOString().split('T')[0];

      switch (filterMode) {
        case 'hoy':
          return appDateStr === todayStr;
        case 'proximas':
          return appDateStr >= todayStr && (app.status === 'programada' || app.status === 'confirmada' || app.status === 'reprogramada');
        case 'todas':
        default:
          return true;
      }
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allAppointments, filterMode]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.headerWrapper}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Cronograma</Text>
          <Text style={styles.headerSubtitle}>Gestión de citas y pacientes</Text>
        </SafeAreaView>
      </View>

      <View style={styles.tabsWrapper}>
        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'todas' && styles.tabButtonActive]}
          onPress={() => setFilterMode('todas')}
        >
          <Text style={[styles.tabText, filterMode === 'todas' && styles.tabTextActive]}>Todas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'hoy' && styles.tabButtonActive]}
          onPress={() => setFilterMode('hoy')}
        >
          <Text style={[styles.tabText, filterMode === 'hoy' && styles.tabTextActive]}>Hoy</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, filterMode === 'proximas' && styles.tabButtonActive]}
          onPress={() => setFilterMode('proximas')}
        >
          <Text style={[styles.tabText, filterMode === 'proximas' && styles.tabTextActive]}>Próximas</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    // Map status from API to variant
    const statusMap: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      'programada': 'warning',
      'confirmada': 'success',
      'asistida': 'success',
      'reprogramada': 'warning',
      'no_asistida': 'danger',
      'cancelada': 'danger'
    };
    const variant = statusMap[item.status] || 'default';

    const labelMap: Record<string, string> = {
      'programada': 'Programada',
      'confirmada': 'Confirmada',
      'asistida': 'Asistida',
      'reprogramada': 'Reprogramada',
      'no_asistida': 'No Asistió',
      'cancelada': 'Cancelada'
    };
    const statusText = labelMap[item.status] || 'Desconocido';

    const handleStatusUpdate = (id: string, newStatus: 'asistida' | 'no_asistida') => {
      updateStatus({ id, status: newStatus });
    };

    const showActions = item.status === 'programada' || item.status === 'confirmada';

    return (
      <View style={styles.appointmentCard}>
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
            {!showActions && <AppBadge label={statusText} variant={variant} />}
          </View>
          <Text style={styles.appointmentType}>{item.type || 'Control Prenatal'}</Text>
          <View style={styles.infoRow}>
            <MapPin size={12} color="#94A3B8" />
            <Text style={styles.infoText}>{item.location || 'Consultorio 102'}</Text>
          </View>

          {showActions && (
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.btnAsistio]}
                onPress={() => handleStatusUpdate(item.id, 'asistida')}
              >
                <Text style={styles.btnAsistioText}>Asistió</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.btnNoAsistio]}
                onPress={() => handleStatusUpdate(item.id, 'no_asistida')}
              >
                <Text style={styles.btnNoAsistioText}>No asistió</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
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
        data={processedAppointments}
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
  tabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 12,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabButtonActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  tabText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
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
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 4 },
  infoText: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8' },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnAsistio: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  btnAsistioText: {
    color: '#166534',
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  btnNoAsistio: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  btnNoAsistioText: {
    color: '#991B1B',
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
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
