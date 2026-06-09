import React, { useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Text, Platform, StatusBar, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { StatusChip } from '../../../src/components/ui/StatusChip';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useAppointments, useConfirmAppointment, useRescheduleAppointment } from '../../../src/services/api-queries';
import { typography } from '../../../src/theme/typography';

type Tab = 'upcoming' | 'past';

export default function CitasScreen(): React.ReactElement {
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const { data, isLoading, refetch } = useAppointments();

  // Mutations
  const { mutate: confirmAppointment } = useConfirmAppointment();
  const { mutate: rescheduleAppointment, isPending: isRescheduling } = useRescheduleAppointment();

  // Modal States
  const [isRescheduleModalVisible, setIsRescheduleModalVisible] = useState(false);
  const [selectedApptId, setSelectedApptId] = useState('');
  const [newFecha, setNewFecha] = useState('');
  const [newHora, setNewHora] = useState('');
  const [motivo, setMotivo] = useState('');

  const handleConfirm = (id: string) => {
    Alert.alert(
      'Confirmar Asistencia',
      '¿Estás segura de que asistirás a esta cita?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Confirmar',
          onPress: () => {
            confirmAppointment(id, {
              onSuccess: () => Alert.alert('Éxito', 'Cita confirmada correctamente.'),
              onError: () => Alert.alert('Error', 'No se pudo confirmar la cita.')
            });
          }
        }
      ]
    );
  };

  const handleRescheduleSubmit = () => {
    if (!newFecha || !newHora || !motivo) {
      return Alert.alert('Error', 'Todos los campos son obligatorios para solicitar reprogramación.');
    }
    
    rescheduleAppointment({
      id: selectedApptId,
      data: {
        fecha: newFecha,
        hora: newHora,
        motivoReprogramacion: motivo
      }
    }, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Solicitud de reprogramación enviada.');
        setIsRescheduleModalVisible(false);
        setNewFecha('');
        setNewHora('');
        setMotivo('');
      },
      onError: () => {
        Alert.alert('Error', 'No se pudo solicitar la reprogramación.');
      }
    });
  };

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

      {activeTab === 'upcoming' && (item.status === 'programada' || item.status === 'scheduled') && (
        <View style={styles.cardActions}>
          <TouchableOpacity 
            style={styles.rescheduleBtn} 
            onPress={() => {
              setSelectedApptId(item.id);
              setIsRescheduleModalVisible(true);
            }}
          >
            <Text style={styles.rescheduleBtnText}>Reprogramar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.confirmBtn} 
            onPress={() => handleConfirm(item.id)}
          >
            <Text style={styles.confirmBtnText}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      )}
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

      {/* ── MODAL: REPROGRAMAR CITA ── */}
      <Modal
        visible={isRescheduleModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRescheduleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Solicitar Reprogramación</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Nueva Fecha</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD  ej. 2026-06-25"
                  value={newFecha}
                  onChangeText={setNewFecha}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Nueva Hora</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="HH:MM  ej. 10:30"
                  value={newHora}
                  onChangeText={setNewHora}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Motivo de la Reprogramación</Text>
                <TextInput
                  style={[styles.textInput, { height: 80 }]}
                  placeholder="Escribe el motivo aquí..."
                  multiline
                  value={motivo}
                  onChangeText={setMotivo}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsRescheduleModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleRescheduleSubmit} disabled={isRescheduling}>
                {isRescheduling ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Enviar Solicitud</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  rescheduleBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rescheduleBtnText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '85%',
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  inputFieldGroup: {
    gap: 6,
    marginBottom: 12,
  },
  inputLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  saveBtnText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
