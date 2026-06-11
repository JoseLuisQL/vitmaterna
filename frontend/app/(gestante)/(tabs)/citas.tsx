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
  Modal,
  TextInput
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../../src/store/authStore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = gestanteColors.primary;

interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime?: string;
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
  
  // Reschedule Modal state
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    fecha: '',
    hora: '',
    motivoReprogramacion: ''
  });

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments');
      if (response.data?.data) {
        const mapped = response.data.data.map((app: any) => ({
          id: app.id,
          appointmentDate: app.fecha,
          appointmentTime: app.hora,
          type: app.motivo,
          status: app.estado ? app.estado.toUpperCase() : 'PROGRAMADA',
          notes: app.observaciones,
          professional: app.obstetra?.user ? {
            firstName: app.obstetra.user.firstName,
            lastName: app.obstetra.user.lastName,
            specialty: 'Obstetra'
          } : undefined,
          clinic: app.clinic || { name: 'Consultorio Principal' }
        }));
        setAppointments(mapped);
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
      await api.patch(`/appointments/${id}/status`, { estado: 'confirmada' });
      fetchAppointments();
      alert('Cita confirmada correctamente.');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      alert('Hubo un error al confirmar la cita.');
    }
  };

  const handleReschedule = async () => {
    if (!selectedAppointmentId) return;
    try {
      await api.patch(`/appointments/${selectedAppointmentId}/reschedule`, rescheduleData);
      setRescheduleModalVisible(false);
      setRescheduleData({ fecha: '', hora: '', motivoReprogramacion: '' });
      fetchAppointments();
      alert('Tu cita ha sido reprogramada exitosamente.');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      alert('Hubo un error al reprogramar la cita. Verifica el formato Fecha(YYYY-MM-DD) y Hora(HH:MM)');
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
      (app) => app.status === 'ASISTIDA' || app.status === 'CANCELADA' || app.status === 'NO_ASISTIDA'
    );
  }, [sortedAppointments]);

  const displayedAppointments = activeTab === 'upcoming' ? upcomingAppointments : historyAppointments;

  // Find the exact next upcoming appointment
  const nextAppointment = upcomingAppointments.length > 0 ? upcomingAppointments[0] : null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PROGRAMADA':
        return { bg: semanticColors.infoLight, text: semanticColors.info, icon: 'calendar-outline' };
      case 'CONFIRMADA':
        return { bg: semanticColors.successLight, text: semanticColors.success, icon: 'checkmark-circle-outline' };
      case 'ASISTIDA':
        return { bg: gestanteColors.primaryLight, text: gestanteColors.primary, icon: 'flag-outline' };
      case 'CANCELADA':
      case 'NO_ASISTIDA':
        return { bg: semanticColors.dangerLight, text: semanticColors.danger, icon: 'close-circle-outline' };
      case 'REPROGRAMADA':
        return { bg: semanticColors.warningLight, text: semanticColors.warning, icon: 'time-outline' };
      default:
        return { bg: commonColors.surfaceAlt, text: commonColors.textSecondary, icon: 'information-circle-outline' };
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
      <Ionicons name="calendar-clear-outline" size={64} color={commonColors.textTertiary} />
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
          <View style={styles.nextBadge}>
            <Text style={styles.nextBadgeText}>Siguiente Control</Text>
          </View>
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
              <Ionicons name="time-outline" size={14} color={commonColors.textSecondary} /> {formatTime(item.appointmentTime || item.appointmentDate)}
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
              <Ionicons name="person-outline" size={16} color={BRAND} />
            </View>
            <Text style={styles.infoText}>{professionalName}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <View style={styles.iconBox}>
              <Ionicons name="location-outline" size={16} color={BRAND} />
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
              onPress={() => {
                setSelectedAppointmentId(item.id);
                setRescheduleModalVisible(true);
              }}
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
        <ActivityIndicator size="large" color={BRAND} />
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
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      />

      <Modal
        visible={rescheduleModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reprogramar Cita</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva Fecha (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 2026-06-15"
                value={rescheduleData.fecha}
                onChangeText={(text) => setRescheduleData({...rescheduleData, fecha: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nueva Hora (HH:MM)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ej. 10:30"
                value={rescheduleData.hora}
                onChangeText={(text) => setRescheduleData({...rescheduleData, hora: text})}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Motivo de Reprogramación</Text>
              <TextInput
                style={[styles.modalInput, { height: 80 }]}
                placeholder="Agrega el motivo brevemente"
                multiline
                value={rescheduleData.motivoReprogramacion}
                onChangeText={(text) => setRescheduleData({...rescheduleData, motivoReprogramacion: text})}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.modalBtnCancel} 
                onPress={() => setRescheduleModalVisible(false)}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalBtnSubmit} 
                onPress={handleReschedule}
              >
                <Text style={styles.modalBtnSubmitText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: commonColors.background,
  },
  loadingText: {
    marginTop: spacing.sm + 4,
    ...typography.bodyMedium,
    color: commonColors.textSecondary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
  },
  headerTitle: {
    ...typography.h1,
    color: commonColors.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: commonColors.background,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm + 4,
    borderRadius: borderRadius.xl,
    backgroundColor: commonColors.surfaceAlt,
  },
  activeTab: {
    backgroundColor: BRAND,
  },
  tabText: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: typography.label.fontWeight,
    color: commonColors.textSecondary,
  },
  activeTabText: {
    color: commonColors.surface,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: spacing.sm,
  },
  badgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  badgeInactive: {
    backgroundColor: commonColors.border,
  },
  badgeText: {
    ...typography.overline,
    letterSpacing: 0,
  },
  badgeTextActive: {
    color: commonColors.surface,
  },
  badgeTextInactive: {
    color: commonColors.textSecondary,
  },
  listContainer: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardNext: {
    borderColor: BRAND,
    borderWidth: 2,
  },
  nextBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: BRAND,
    zIndex: 1,
  },
  nextBadgeText: {
    ...typography.overline,
    color: commonColors.surface,
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
    backgroundColor: commonColors.background,
    borderRadius: borderRadius.lg,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    minWidth: 70,
  },
  dateMonth: {
    ...typography.caption,
    fontFamily: typography.overline.fontFamily,
    fontWeight: typography.overline.fontWeight,
    color: commonColors.textSecondary,
    marginBottom: 2,
  },
  dateDay: {
    ...typography.h2,
    color: commonColors.text,
  },
  cardHeaderRight: {
    alignItems: 'flex-end',
  },
  timeText: {
    ...typography.bodySmall,
    fontFamily: typography.label.fontFamily,
    fontWeight: typography.label.fontWeight,
    color: commonColors.textSecondary,
    marginBottom: spacing.sm,
    display: 'flex',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
  },
  statusText: {
    ...typography.overline,
    letterSpacing: 0,
    marginLeft: 4,
  },
  cardDivider: {
    height: 1,
    backgroundColor: commonColors.border,
    marginVertical: spacing.md,
  },
  cardBody: {},
  appointmentType: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: gestanteColors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm + 4,
  },
  infoText: {
    ...typography.bodySmall,
    fontFamily: typography.bodyMedium.fontFamily,
    fontWeight: typography.bodyMedium.fontWeight,
    color: commonColors.textSecondary,
    flex: 1,
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm + 4,
    backgroundColor: commonColors.background,
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: commonColors.borderStrong,
  },
  notesText: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
    gap: spacing.sm + 4,
  },
  btnReschedule: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center',
  },
  btnRescheduleText: {
    color: commonColors.textSecondary,
    ...typography.button,
    fontSize: 15,
  },
  btnConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: BRAND,
    alignItems: 'center',
  },
  btnConfirmText: {
    color: commonColors.surface,
    ...typography.button,
    fontSize: 15,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: commonColors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  modalTitle: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    ...typography.label,
    color: commonColors.textSecondary,
    marginBottom: spacing.sm,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    ...typography.bodySmall,
    fontSize: 15,
    color: commonColors.text,
    backgroundColor: commonColors.background,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm + 4,
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: commonColors.textSecondary,
    ...typography.button,
    fontSize: 15,
  },
  modalBtnSubmit: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    backgroundColor: BRAND,
    alignItems: 'center',
  },
  modalBtnSubmitText: {
    color: commonColors.surface,
    ...typography.button,
    fontSize: 15,
  },
});
