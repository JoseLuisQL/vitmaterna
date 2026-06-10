import React, { useState } from 'react';
import { 
  View, StyleSheet, Text, Modal, TouchableOpacity, KeyboardAvoidingView, 
  Platform, Alert, FlatList, TextInput, ScrollView, Dimensions 
} from 'react-native';
import { Calendar, Clock, User as UserIcon, X, Search, Check, FileText } from 'lucide-react-native';
import { typography } from '../../theme/typography';
import { usePatients, useCreateAppointment } from '../../services/api-queries';
import { AppButton } from '../ui/AppButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface NuevaCitaModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NuevaCitaModal({ visible, onClose }: NuevaCitaModalProps): React.ReactElement {
  const { data: patients, isLoading: isLoadingPatients } = usePatients();
  const { mutateAsync: createAppointment, isPending } = useCreateAppointment();

  const [gestanteId, setGestanteId] = useState('');
  const [gestanteName, setGestanteName] = useState('');
  const [motivo, setMotivo] = useState('Control Prenatal');
  const [observaciones, setObservaciones] = useState('');
  const [date, setDate] = useState(new Date());
  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [timeStr, setTimeStr] = useState('10:00');
  
  const [step, setStep] = useState<'form' | 'patients'>('form');
  const [search, setSearch] = useState('');

  const MOTIVOS = ['Control Prenatal', 'Ecografía', 'Resultado Laboratorio', 'Monitoreo', 'Interconsulta'];

  const filteredPatients = patients?.filter((p: any) => 
    p.firstName?.toLowerCase().includes(search.toLowerCase()) || 
    p.lastName?.toLowerCase().includes(search.toLowerCase()) ||
    p.documentNumber?.includes(search)
  ) || [];

  const handleSelectPatient = (id: string, name: string) => {
    setGestanteId(id);
    setGestanteName(name);
    setStep('form');
  };

  const resetForm = () => {
    setGestanteId('');
    setGestanteName('');
    setMotivo('Control Prenatal');
    setObservaciones('');
    setDate(new Date());
    setStep('form');
    setSearch('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSave = async () => {
    if (!gestanteId) {
      Alert.alert('Error', 'Debe seleccionar una paciente');
      return;
    }

    const fecha = dateStr;
    const hora = timeStr;

    try {
      await createAppointment({
        gestanteId,
        fecha,
        hora,
        motivo,
        observaciones: observaciones || null, // Guardar observaciones en bd
      });
      handleClose();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'No se pudo crear la cita');
    }
  };

  const handleDateChange = (text: string) => { setDateStr(text); };
  const handleTimeChange = (text: string) => { setTimeStr(text); };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
        
        <View style={styles.bottomSheet}>
          <View style={styles.dragPill} />
          
          <View style={styles.header}>
            <Text style={styles.title}>
              {step === 'form' ? 'Programar Cita' : 'Seleccionar Paciente'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {step === 'form' ? (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              
              <Text style={styles.label}>Gestante</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setStep('patients')}>
                <View style={styles.iconBox}><UserIcon size={20} color="#BE185D" /></View>
                <Text style={[styles.selectorText, !gestanteId && { color: '#94A3B8' }]}>
                  {gestanteId ? gestanteName : 'Tocar para seleccionar paciente...'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Motivo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.motivoScroll}>
                {MOTIVOS.map(m => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.chip, motivo === m && styles.chipActive]}
                    onPress={() => setMotivo(m)}
                  >
                    <Text style={[styles.chipText, motivo === m && styles.chipTextActive]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Fecha (YYYY-MM-DD)</Text>
                  <View style={styles.inputBox}>
                    <Calendar size={18} color="#64748B" />
                    <TextInput 
                      style={styles.inputTextNative} 
                      value={dateStr} 
                      onChangeText={handleDateChange} 
                      placeholder="2026-06-08"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.label}>Hora (HH:MM)</Text>
                  <View style={styles.inputBox}>
                    <Clock size={18} color="#64748B" />
                    <TextInput 
                      style={styles.inputTextNative} 
                      value={timeStr} 
                      onChangeText={handleTimeChange}
                      placeholder="14:30"
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>
              </View>

              <Text style={styles.label}>Descripción / Consultorio</Text>
              <View style={[styles.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
                 <FileText size={18} color="#64748B" style={{ marginTop: 2 }} />
                 <TextInput 
                   style={[styles.inputTextNative, { textAlignVertical: 'top' }]} 
                   value={observaciones} 
                   onChangeText={setObservaciones}
                   placeholder="Ej: Traer resultados / Consultorio 103"
                   placeholderTextColor="#94A3B8"
                   multiline
                 />
              </View>

              {/* Removed native pickers */}

              <View style={{ marginTop: 32, marginBottom: 20 }}>
                <AppButton 
                  title="Programar Cita" 
                  onPress={handleSave} 
                  loading={isPending} 
                />
              </View>
            </ScrollView>
          ) : (
            <View style={{ flex: 1, padding: 20 }}>
              <View style={styles.searchBox}>
                <Search size={18} color="#94A3B8" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Buscar por nombre o DNI..."
                  placeholderTextColor="#94A3B8"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
              </View>
              
              <FlatList
                data={filteredPatients}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.patientItem}
                    onPress={() => handleSelectPatient(item.id, `${item.firstName} ${item.lastName}`)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{item.firstName?.[0] || ''}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{item.firstName} {item.lastName}</Text>
                      <Text style={styles.patientDoc}>DNI: {item.documentNumber}</Text>
                    </View>
                    {gestanteId === item.id && <Check size={20} color="#BE185D" />}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>No se encontraron pacientes</Text>
                }
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.9,
    minHeight: SCREEN_HEIGHT * 0.6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 24,
  },
  dragPill: {
    width: 48,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { fontFamily: typography.h3.fontFamily, fontSize: 18, fontWeight: '700', color: '#0F172A' },
  closeBtn: { padding: 4, backgroundColor: '#F8FAFC', borderRadius: 20 },
  content: { padding: 24 },
  label: { fontFamily: typography.caption.fontFamily, fontSize: 13, fontWeight: '600', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FCE7F3', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectorText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },

  motivoScroll: { flexDirection: 'row', marginBottom: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#FCE7F3',
    borderColor: '#FBCFE8',
  },
  chipText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#64748B', fontWeight: '500' },
  chipTextActive: { color: '#BE185D', fontWeight: '700' },

  row: { flexDirection: 'row' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  inputText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', fontWeight: '500' },
  inputTextNative: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', fontWeight: '500' },

  // Patients Step
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontFamily: typography.body.fontFamily, fontSize: 15, color: '#0F172A' },
  patientItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#64748B' },
  patientName: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '600', color: '#0F172A' },
  patientDoc: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8' },
  emptyText: { textAlign: 'center', marginTop: 40, fontFamily: typography.bodyMedium.fontFamily, color: '#94A3B8' },
});
