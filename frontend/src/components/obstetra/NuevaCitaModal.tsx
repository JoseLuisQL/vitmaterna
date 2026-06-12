import React, { useState, useMemo } from 'react';
import { 
  View, StyleSheet, Text, TouchableOpacity,
  Alert, FlatList, TextInput, ScrollView, ActivityIndicator, Dimensions 
} from 'react-native';
import { User as UserIcon, Search, Check, FileText } from 'lucide-react-native';
import { commonColors, obstetraColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { shadows } from '../../theme/shadows';
import {
  usePatients,
  useCreateAppointment,
  useAppointmentAvailability,
} from '../../services/api-queries';
import { AppModal, AppButton } from '../ui';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND = obstetraColors.primary;

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
  const [modalidad, setModalidad] = useState<'establecimiento' | 'domiciliaria'>('establecimiento');
  const [observaciones, setObservaciones] = useState('');
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [timeStr, setTimeStr] = useState<string | null>(null);

  const [step, setStep] = useState<'form' | 'patients'>('form');
  const [search, setSearch] = useState('');

  const { data: slots = [], isLoading: slotsLoading } = useAppointmentAvailability(dateStr);

  const MOTIVOS = ['Control Prenatal', 'Ecografía', 'Resultado Laboratorio', 'Monitoreo', 'Interconsulta'];

  // Próximos 21 días para elegir fecha.
  const dateOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 21 }, (_, i) => {
      const d = addDays(today, i);
      return {
        value: format(d, 'yyyy-MM-dd'),
        dow: format(d, 'EEE', { locale: es }),
        day: format(d, 'd'),
        month: format(d, 'MMM', { locale: es }),
      };
    });
  }, []);

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
    setModalidad('establecimiento');
    setObservaciones('');
    setDateStr(null);
    setTimeStr(null);
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
    if (!dateStr || !timeStr) {
      Alert.alert('Error', 'Debe seleccionar una fecha y un horario disponible');
      return;
    }

    try {
      await createAppointment({
        gestanteId,
        fecha: dateStr,
        hora: timeStr,
        motivo,
        modalidad,
        observaciones: observaciones || null, // Guardar observaciones en bd
      });
      handleClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'No se pudo crear la cita';
      Alert.alert('Error', msg);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title={step === 'form' ? 'Programar Cita' : 'Seleccionar Paciente'}
      scroll={step === 'form'}
      footer={
        step === 'form' ? (
          <AppButton
            title="Programar Cita"
            onPress={handleSave}
            loading={isPending}
            themeColor={BRAND}
            style={{ flex: 1 }}
          />
        ) : undefined
      }
    >
      {step === 'form' ? (
        <View>
          <Text style={styles.label}>Gestante</Text>
          <TouchableOpacity style={styles.selector} onPress={() => setStep('patients')}>
            <View style={styles.iconBox}><UserIcon size={20} color={BRAND} /></View>
            <Text style={[styles.selectorText, !gestanteId && { color: commonColors.textTertiary }]}>
              {gestanteId ? gestanteName : 'Tocar para seleccionar paciente...'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>Modalidad</Text>
          <View style={styles.modalidadRow}>
            <TouchableOpacity
              style={[styles.modalidadBtn, modalidad === 'establecimiento' && styles.modalidadBtnActive]}
              onPress={() => setModalidad('establecimiento')}
            >
              <Text style={[styles.modalidadText, modalidad === 'establecimiento' && styles.modalidadTextActive]}>Establecimiento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalidadBtn, modalidad === 'domiciliaria' && styles.modalidadBtnActive]}
              onPress={() => { setModalidad('domiciliaria'); if (motivo === 'Control Prenatal') setMotivo('Visita domiciliaria'); }}
            >
              <Text style={[styles.modalidadText, modalidad === 'domiciliaria' && styles.modalidadTextActive]}>Domiciliaria</Text>
            </TouchableOpacity>
          </View>
          {modalidad === 'domiciliaria' && (
            <Text style={styles.modalidadHint}>El obstetra acudirá al domicilio de la gestante (previa coordinación). No bloquea la agenda del consultorio.</Text>
          )}

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

          <Text style={styles.label}>Fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
            {dateOptions.map((d) => {
              const active = dateStr === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => {
                    setDateStr(d.value);
                    setTimeStr(null);
                  }}
                >
                  <Text style={[styles.dateChipDow, active && styles.dateChipTextActive]}>{d.dow}</Text>
                  <Text style={[styles.dateChipDay, active && styles.dateChipTextActive]}>{d.day}</Text>
                  <Text style={[styles.dateChipMonth, active && styles.dateChipTextActive]}>{d.month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Horario disponible</Text>
          {!dateStr ? (
            <Text style={styles.helperText}>Primero selecciona una fecha.</Text>
          ) : slotsLoading ? (
            <ActivityIndicator color={BRAND} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.slotsGrid}>
              {slots.filter((s: any) => s.disponible).length === 0 ? (
                <Text style={styles.helperText}>No hay horarios disponibles ese día.</Text>
              ) : (
                slots.map((s: any) => {
                  const active = timeStr === s.hora;
                  return (
                    <TouchableOpacity
                      key={s.hora}
                      disabled={!s.disponible}
                      style={[styles.slotChip, !s.disponible && styles.slotChipDisabled, active && styles.slotChipActive]}
                      onPress={() => setTimeStr(s.hora)}
                    >
                      <Text style={[styles.slotText, !s.disponible && styles.slotTextDisabled, active && styles.slotTextActive]}>
                        {s.hora}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          <Text style={styles.label}>Descripción / Consultorio</Text>
          <View style={[styles.inputBox, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
             <FileText size={18} color={commonColors.textSecondary} style={{ marginTop: 2 }} />
             <TextInput 
               style={[styles.inputTextNative, { textAlignVertical: 'top' }]} 
               value={observaciones} 
               onChangeText={setObservaciones}
               placeholder="Ej: Traer resultados / Consultorio 103"
               placeholderTextColor={commonColors.textTertiary}
               multiline
             />
          </View>

          {/* Removed native pickers */}
        </View>
      ) : (
        <View>
          <View style={styles.searchBox}>
            <Search size={18} color={commonColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o DNI..."
              placeholderTextColor={commonColors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
          </View>
          
          <FlatList
            data={filteredPatients}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
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
                {gestanteId === item.id && <Check size={20} color={BRAND} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No se encontraron pacientes</Text>
            }
          />
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: commonColors.overlay },
  bottomSheet: {
    backgroundColor: commonColors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: SCREEN_HEIGHT * 0.9,
    minHeight: SCREEN_HEIGHT * 0.6,
    ...shadows.lg,
  },
  dragPill: {
    width: 48,
    height: 4,
    backgroundColor: commonColors.border,
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
    borderBottomColor: commonColors.borderLight,
  },
  title: { ...typography.h3, color: commonColors.text },
  closeBtn: { padding: 4, backgroundColor: commonColors.surfaceAlt, borderRadius: 20 },
  content: { padding: 24 },
  label: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
  
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  iconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  selectorText: { ...typography.bodyMedium, color: commonColors.text, flex: 1 },

  modalidadRow: { flexDirection: 'row', gap: 8 },
  modalidadBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center' },
  modalidadBtnActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  modalidadText: { ...typography.label, color: commonColors.textSecondary, fontWeight: '600' },
  modalidadTextActive: { color: BRAND, fontWeight: '700' },
  modalidadHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: 6 },
  motivoScroll: { flexDirection: 'row', marginBottom: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: obstetraColors.primaryLight,
    borderColor: BRAND,
  },
  chipText: { ...typography.label, color: commonColors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: BRAND, fontWeight: '700' },

  row: { flexDirection: 'row' },
  helperText: { ...typography.bodySmall, color: commonColors.textTertiary, paddingVertical: 8 },
  dateScroll: { flexDirection: 'row', marginBottom: 4 },
  dateChip: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    marginRight: 8,
    minWidth: 54,
  },
  dateChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  dateChipDow: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipDay: { ...typography.h3, color: commonColors.text },
  dateChipMonth: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipTextActive: { color: obstetraColors.onPrimary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  slotChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  slotChipDisabled: { opacity: 0.4 },
  slotText: { ...typography.bodySmall, color: commonColors.text },
  slotTextActive: { color: obstetraColors.onPrimary, fontWeight: '700' },
  slotTextDisabled: { color: commonColors.textTertiary, textDecorationLine: 'line-through' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    gap: 8,
  },
  inputText: { ...typography.bodyMedium, color: commonColors.text },
  inputTextNative: { flex: 1, ...typography.bodyMedium, fontSize: 15, color: commonColors.text },

  // Patients Step
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: 16, paddingHorizontal: 16, height: 48, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, ...typography.body, fontSize: 15, color: commonColors.text },
  patientItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { ...typography.bodyMedium, color: commonColors.textSecondary },
  patientName: { ...typography.bodyMedium, color: commonColors.text },
  patientDoc: { ...typography.caption, color: commonColors.textTertiary },
  emptyText: { textAlign: 'center', marginTop: 40, ...typography.bodyMedium, color: commonColors.textTertiary },
});
