import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../../src/store/authStore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../../src/services/api';

interface Appointment {
  id: string;
  appointmentDate: string;
  type: string;
  status: string;
  notes?: string;
  professional?: {
    firstName: string;
    lastName: string;
    specialty: string;
  };
  clinic?: {
    name: string;
  };
}

export default function AppointmentsScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments/my-appointments');
      if (response.data?.data) {
        setAppointments(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleConfirmAppointment = async (id: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status: 'CONFIRMADA' });
      fetchAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
      alert('Hubo un error al confirmar la cita.');
    }
  };

  // Sort and filter logic
  const sortedAppointments = useMemo(() => {
    return [...appointments].sort(
      (a, b) =>
        new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime()
    );
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    return sortedAppointments.filter(
      (app) => app.status === 'PROGRAMADA' || app.status === 'CONFIRMADA' || app.status === 'REPROGRAMADA'
    );
  }, [sortedAppointments]);

  const historyAppointments = useMemo(() => {
    return sortedAppointments.filter(
      (app) => app.status === 'COMPLETADA' || app.status === 'CANCELADA' || app.status === 'NO_ASISTIO'
    );
  }, [sortedAppointments]);

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  // Find the exact next upcoming appointment
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADA':
        return { bg: '#E3F2FD', text: '#1976D2', icon: 'calendar-outline' };
      case 'CONFIRMADA':
        return { bg: '#E8F5E9', text: '#2E7D32', icon: 'checkmark-circle-outline' };
      case 'COMPLETADA':
        return { bg: '#F3E5F5', text: '#7B1FA2', icon: 'flag-outline' };
      case 'CANCELADA':
      case 'NO_ASISTIO':
        return { bg: '#FFEBEE', text: '#D32F2F', icon: 'close-circle-outline' };
      case 'REPROGRAMADA':
        return { bg: '#FFF3E0', text: '#F57C00', icon: 'time-outline' };
      default:
        return { bg: '#F5F5F5', text: '#757575', icon: 'information-circle-outline' };
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch {
      return 'Hora no definida';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return 'Fecha no definida';
    }
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="calendar-clear-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' ? 'No tienes citas próximas' : 'No hay historial de citas'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming' 
          ? 'Las citas de tus controles prenatales aparecerán aquí una vez que sean programadas por tu obstetra.'
          : 'Aún no has completado ninguna cita de control prenatal.'}
      </Text>
    </View>
  );

  const renderAppointmentCard = ({ item, index }: { item: Appointment; index: number }) => {
    const isNext = activeTab === 'upcoming' && index === 0;
    const statusInfo = getStatusColor(item.status);
    const professionalName = item.professional 
      ? `Obst. ${item.professional.firstName} ${item.professional.lastName}` 
      : 'Profesional no asignado';
    const clinicName = item.clinic?.name || 'Consultorio Principal';
    
    // Only the NEXT appointment can be confirmed or rescheduled
    const showActions = isNext && item.status === 'PROGRAMADA';

    return (
      <View style={[styles.card, isNext && styles.cardNext]}>
        {isNext && (
          <LinearGradient
            colors={['#EC4899', '#F43F5E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBadge}
          >
            <Text style={styles.nextBadgeText}>Siguiente Control</Text>
          </LinearGradient>
        )}
        
        <View style={styles.cardHeader}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateMonth}>
              {format(parseISO(item.appointmentDate), 'MMM', { locale: es }).toUpperCase()}
            </Text>
            <Text style={styles.dateDay}>
              {format(parseISO(item.appointmentDate), 'dd')}
            </Text>
          </View>
          
          <View style={styles.cardHeaderRight}>
            <Text style={styles.timeText}>
              <Ionicons name="time-outline" size={14} color="#64748B" /> {formatTime(item.appointmentDate)}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
              <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.text} />
              <Text style={[styles.statusText, { color: statusInfo.text }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardBody}>
          <Text style={styles.appointmentType}>{item.type}</Text>
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={16} color="#EC4899" />
            </View>
            <Text style={styles.infoText}>{professionalName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="location-outline" size={16} color="#EC4899" />
            </View>
            <Text style={styles.infoText}>{clinicName}</Text>
          </View>
          
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}
        </View>

        {showActions && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={styles.btnReschedule}
              onPress={() => alert('Para reprogramar tu cita, por favor contacta directamente a tu centro de salud o mediante la sección de Mensajes.')}
            >
              <Text style={styles.btnRescheduleText}>Reprogramar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.btnConfirm}
              onPress={() => handleConfirmAppointment(item.id)}
            >
              <Text style={styles.btnConfirmText}>Confirmar Cita</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EC4899" />
        <Text style={styles.loadingText}>Cargando tus citas...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mis Citas</Text>
        <Text style={styles.headerSubtitle}>
          Control de tu embarazo paso a paso
        </Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Próximas
          </Text>
          {upcomingAppointments.length > 0 && (
            <View style={[styles.badge, activeTab === 'upcoming' ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={[styles.badgeText, activeTab === 'upcoming' ? styles.badgeTextActive : styles.badgeTextInactive]}>
                {upcomingAppointments.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Historial
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayedAppointments}
        keyExtractor={(item) => item.id}
        renderItem={renderAppointmentCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#EC4899']}
            tintColor="#EC4899"
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 28,
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F8FAFC',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
  },
  activeTab: {
    backgroundColor: '#EC4899',
  },
  tabText: {
    fontSize: 15,
    color: '#64748B',
    fontFamily: 'Inter-SemiBold',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeInactive: {
    backgroundColor: '#E2E8F0',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  badgeTextInactive: {
    color: '#64748B',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardNext: {
    borderColor: '#FCE7F3',
    borderWidth: 2,
    shadowColor: '#EC4899',
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  nextBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    zIndex: 1,
  },
  nextBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  dateContainer: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 70,
  },
  dateMonth: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 24,
    color: '#0F172A',
    fontFamily: 'Inter-Black',
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 16,
  },
  cardBody: {},
  appointmentType: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FDF2F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#475569',
    fontFamily: 'Inter-Medium',
    flex: 1,
  },
  notesContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#CBD5E1',
  },
  notesText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  btnReschedule: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  btnRescheduleText: {
    color: '#475569',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#EC4899',
    alignItems: 'center',
  },
  btnConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    color: '#334155',
    fontFamily: 'Inter-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
