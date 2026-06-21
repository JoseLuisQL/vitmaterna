import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity,
  FlatList, TextInput, ScrollView, ActivityIndicator, Dimensions,
} from 'react-native';
import { User as UserIcon, Search, Check, FileText, Calendar, Clock, ChevronRight, X, MapPin, Building2, AlertTriangle } from 'lucide-react-native';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import {
  usePatients,
  useCreateAppointment,
  useAppointmentAvailability,
} from '../../services/api-queries';
import { AppModal, AppButton, useToast } from '../ui';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

const BRAND = obstetraColors.primary;

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

/** Color de fondo/punto del semáforo de riesgo a partir de la etiqueta. */
function riskMeta(level?: string): { color: string; bg: string; label: string } {
  if (level === 'Alto') return { color: riskColors.riskRed, bg: riskColors.riskRedLight, label: 'Alto' };
  if (level === 'Medio') return { color: riskColors.riskYellow, bg: riskColors.riskYellowLight, label: 'Medio' };
  return { color: riskColors.riskGreen, bg: riskColors.riskGreenLight, label: 'Bajo' };
}

interface NuevaCitaModalProps {
  visible: boolean;
  onClose: () => void;
}

export function NuevaCitaModal({ visible, onClose }: NuevaCitaModalProps): React.ReactElement {
  const toast = useToast();
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
        isToday: i === 0,
      };
    });
  }, []);

  const debouncedSearch = useDebouncedValue(search, 400);
  const filteredPatients = useMemo(
    () =>
      (patients || []).filter((p: any) =>
        p.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.documentNumber?.includes(debouncedSearch),
      ),
    [patients, debouncedSearch],
  );

  const selectedPatient = useMemo(
    () => (patients || []).find((p: any) => p.id === gestanteId),
    [patients, gestanteId],
  );

  const availableSlots = useMemo(() => slots.filter((s: any) => s.disponible), [slots]);

  const handleSelectPatient = (id: string, name: string) => {
    setGestanteId(id);
    setGestanteName(name);
    setStep('form');
    setSearch('');
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
      toast.warning('Falta la paciente', 'Selecciona a la gestante para la cita.');
      return;
    }
    if (!dateStr || !timeStr) {
      toast.warning('Falta fecha y hora', 'Selecciona una fecha y un horario disponible.');
      return;
    }

    try {
      await createAppointment({
        gestanteId,
        fecha: dateStr,
        hora: timeStr,
        motivo,
        modalidad,
        observaciones: observaciones || null,
      });
      toast.success('Cita programada', `${gestanteName} fue notificada de su cita.`);
      handleClose();
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'No se pudo crear la cita';
      toast.error('No se pudo programar', msg);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={handleClose}
      title={step === 'form' ? 'Programar cita' : 'Seleccionar paciente'}
      subtitle={step === 'form' ? 'Agenda una atención para una gestante' : undefined}
      scroll={step === 'form'}
      footer={
        step === 'form' ? (
          <AppButton
            title="Programar cita"
            icon={Calendar}
            onPress={handleSave}
            loading={isPending}
            disabled={!gestanteId || !dateStr || !timeStr}
            themeColor={BRAND}
            style={{ flex: 1 }}
          />
        ) : undefined
      }
    >
      {step === 'form' ? (
        <View>
          {/* ── PASO 1 · PACIENTE ── */}
          <Text style={styles.stepLabel}>1 · Paciente</Text>
          {selectedPatient ? (
            <TouchableOpacity
              style={styles.selectedCard}
              onPress={() => setStep('patients')}
              accessibilityRole="button"
              accessibilityLabel={`Paciente seleccionada: ${gestanteName}. Tocar para cambiar`}
            >
              <View style={styles.selectedAvatar}>
                <Text style={styles.selectedAvatarText}>
                  {(selectedPatient.firstName?.[0] || '') + (selectedPatient.lastName?.[0] || '')}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedName} numberOfLines={1}>{gestanteName}</Text>
                <View style={styles.selectedMetaRow}>
                  <Text style={styles.selectedMeta}>DNI {selectedPatient.documentNumber}</Text>
                  {selectedPatient.currentWeek ? (
                    <>
                      <View style={styles.metaDot} />
                      <Text style={styles.selectedMeta}>Sem. {selectedPatient.currentWeek}</Text>
                    </>
                  ) : null}
                </View>
              </View>
              {(() => { const r = riskMeta(selectedPatient.riskLevel); return (
                <View style={[styles.riskChip, { backgroundColor: r.bg }]}>
                  <View style={[styles.riskDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.riskChipText, { color: r.color }]}>{r.label}</Text>
                </View>
              ); })()}
              <Text style={styles.changeLink}>Cambiar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.selectorEmpty}
              onPress={() => setStep('patients')}
              accessibilityRole="button"
              accessibilityLabel="Seleccionar paciente"
            >
              <View style={styles.iconBox}><UserIcon size={20} color={BRAND} /></View>
              <Text style={styles.selectorEmptyText}>Buscar y seleccionar paciente…</Text>
              <ChevronRight size={18} color={commonColors.textTertiary} />
            </TouchableOpacity>
          )}

          {/* ── PASO 2 · DETALLES ── */}
          <Text style={styles.stepLabel}>2 · Detalles</Text>

          <Text style={styles.fieldLabel}>Modalidad</Text>
          <View style={styles.modalidadRow}>
            <TouchableOpacity
              style={[styles.modalidadBtn, modalidad === 'establecimiento' && styles.modalidadBtnActive]}
              onPress={() => setModalidad('establecimiento')}
              accessibilityRole="button"
              accessibilityState={{ selected: modalidad === 'establecimiento' }}
            >
              <Building2 size={16} color={modalidad === 'establecimiento' ? BRAND : commonColors.textSecondary} />
              <Text style={[styles.modalidadText, modalidad === 'establecimiento' && styles.modalidadTextActive]}>Establecimiento</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalidadBtn, modalidad === 'domiciliaria' && styles.modalidadBtnActive]}
              onPress={() => { setModalidad('domiciliaria'); if (motivo === 'Control Prenatal') setMotivo('Visita domiciliaria'); }}
              accessibilityRole="button"
              accessibilityState={{ selected: modalidad === 'domiciliaria' }}
            >
              <MapPin size={16} color={modalidad === 'domiciliaria' ? BRAND : commonColors.textSecondary} />
              <Text style={[styles.modalidadText, modalidad === 'domiciliaria' && styles.modalidadTextActive]}>Domiciliaria</Text>
            </TouchableOpacity>
          </View>
          {modalidad === 'domiciliaria' && (
            <Text style={styles.hint}>El obstetra acudirá al domicilio de la gestante (previa coordinación). No bloquea la agenda del consultorio.</Text>
          )}

          <Text style={styles.fieldLabel}>Motivo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {MOTIVOS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, motivo === m && styles.chipActive]}
                onPress={() => setMotivo(m)}
                accessibilityRole="button"
                accessibilityState={{ selected: motivo === m }}
              >
                <Text style={[styles.chipText, motivo === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── PASO 3 · FECHA Y HORA ── */}
          <Text style={styles.stepLabel}>3 · Fecha y hora</Text>

          <Text style={styles.fieldLabel}>Fecha</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRow}>
            {dateOptions.map((d) => {
              const active = dateStr === d.value;
              return (
                <TouchableOpacity
                  key={d.value}
                  style={[styles.dateChip, active && styles.dateChipActive]}
                  onPress={() => { setDateStr(d.value); setTimeStr(null); }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${d.dow} ${d.day} ${d.month}`}
                >
                  <Text style={[styles.dateChipDow, active && styles.dateChipTextActive]}>{d.isToday ? 'Hoy' : d.dow}</Text>
                  <Text style={[styles.dateChipDay, active && styles.dateChipTextActive]}>{d.day}</Text>
                  <Text style={[styles.dateChipMonth, active && styles.dateChipTextActive]}>{d.month}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.fieldLabel}>Horario disponible</Text>
          {!dateStr ? (
            <View style={styles.placeholderBox}>
              <Clock size={18} color={commonColors.textTertiary} />
              <Text style={styles.placeholderText}>Primero selecciona una fecha.</Text>
            </View>
          ) : slotsLoading ? (
            <View style={styles.placeholderBox}>
              <ActivityIndicator color={BRAND} />
              <Text style={styles.placeholderText}>Buscando horarios…</Text>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.placeholderBox}>
              <AlertTriangle size={18} color={semanticColors.warning} />
              <Text style={styles.placeholderText}>No hay horarios disponibles ese día. Prueba otra fecha.</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((s: any) => {
                const active = timeStr === s.hora;
                return (
                  <TouchableOpacity
                    key={s.hora}
                    disabled={!s.disponible}
                    style={[styles.slotChip, !s.disponible && styles.slotChipDisabled, active && styles.slotChipActive]}
                    onPress={() => setTimeStr(s.hora)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: !s.disponible }}
                    accessibilityLabel={`${s.hora}${s.disponible ? '' : ', no disponible'}`}
                  >
                    <Text style={[styles.slotText, !s.disponible && styles.slotTextDisabled, active && styles.slotTextActive]}>
                      {s.hora}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={styles.fieldLabel}>Descripción / consultorio</Text>
          <View style={styles.textArea}>
            <FileText size={18} color={commonColors.textSecondary} style={{ marginTop: 2 }} />
            <TextInput
              style={styles.textAreaInput}
              value={observaciones}
              onChangeText={setObservaciones}
              placeholder="Ej. Traer resultados / Consultorio 103"
              placeholderTextColor={commonColors.textTertiary}
              multiline
            />
          </View>

          {/* Resumen de la cita (confirmación rápida antes de programar) */}
          {Boolean(gestanteId && dateStr && timeStr) && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Resumen</Text>
              <View style={styles.summaryRow}>
                <UserIcon size={15} color={BRAND} />
                <Text style={styles.summaryText} numberOfLines={1}>{gestanteName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Calendar size={15} color={BRAND} />
                <Text style={styles.summaryText}>
                  {format(new Date(`${dateStr}T00:00:00`), "EEEE d 'de' MMMM", { locale: es })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Clock size={15} color={BRAND} />
                <Text style={styles.summaryText}>{timeStr} · {motivo}</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        // ── SELECCIÓN DE PACIENTE ──
        <View style={styles.patientsPane}>
          <View style={styles.searchBox}>
            <Search size={18} color={commonColors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre o DNI…"
              placeholderTextColor={commonColors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoFocus
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Limpiar búsqueda">
                <X size={16} color={commonColors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {!isLoadingPatients && (
            <Text style={styles.resultCount}>
              {filteredPatients.length === 0
                ? 'Sin resultados'
                : `${filteredPatients.length} ${filteredPatients.length === 1 ? 'paciente' : 'pacientes'}`}
            </Text>
          )}

          {isLoadingPatients ? (
            <ActivityIndicator color={BRAND} style={{ marginVertical: 24 }} />
          ) : (
            <FlatList
              data={filteredPatients}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: SCREEN_HEIGHT * 0.5 }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const r = riskMeta(item.riskLevel);
                const selected = gestanteId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.patientItem, selected && styles.patientItemActive]}
                    onPress={() => handleSelectPatient(item.id, `${item.firstName} ${item.lastName}`)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName} numberOfLines={1}>{item.firstName} {item.lastName}</Text>
                      <View style={styles.selectedMetaRow}>
                        <Text style={styles.patientDoc}>DNI {item.documentNumber}</Text>
                        {item.currentWeek ? (
                          <>
                            <View style={styles.metaDot} />
                            <Text style={styles.patientDoc}>Sem. {item.currentWeek}</Text>
                          </>
                        ) : null}
                      </View>
                    </View>
                    <View style={[styles.riskChip, { backgroundColor: r.bg }]}>
                      <View style={[styles.riskDot, { backgroundColor: r.color }]} />
                      <Text style={[styles.riskChipText, { color: r.color }]}>{r.label}</Text>
                    </View>
                    {selected ? <Check size={20} color={BRAND} /> : <ChevronRight size={18} color={commonColors.textTertiary} />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <View style={styles.emptyIcon}><Search size={22} color={commonColors.textTertiary} /></View>
                  <Text style={styles.emptyTitle}>No se encontraron pacientes</Text>
                  <Text style={styles.emptyText}>Revisa el nombre o el DNI e inténtalo de nuevo.</Text>
                </View>
              }
            />
          )}
        </View>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  // Encabezados de paso
  stepLabel: {
    ...typography.overline,
    color: BRAND,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontWeight: '700',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  fieldLabel: { ...typography.label, color: commonColors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },

  // Selector de paciente vacío
  selectorEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    minHeight: 56,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  iconBox: { width: 36, height: 36, borderRadius: borderRadius.sm, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  selectorEmptyText: { ...typography.body, color: commonColors.textTertiary, flex: 1 },

  // Paciente seleccionada
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: obstetraColors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
  },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center' },
  selectedAvatarText: { ...typography.bodyMd, fontWeight: '700', color: BRAND },
  selectedName: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  selectedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: 2 },
  selectedMeta: { ...typography.caption, color: commonColors.textSecondary },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: commonColors.textTertiary },
  changeLink: { ...typography.caption, color: BRAND, fontWeight: '700' },

  // Semáforo de riesgo
  riskChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  riskDot: { width: 7, height: 7, borderRadius: 4 },
  riskChipText: { ...typography.overline, fontWeight: '700' },

  // Modalidad (segmentos)
  modalidadRow: { flexDirection: 'row', gap: spacing.sm },
  modalidadBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: spacing.sm2, borderRadius: borderRadius.sm, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  modalidadBtnActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  modalidadText: { ...typography.label, color: commonColors.textSecondary, fontWeight: '600' },
  modalidadTextActive: { color: BRAND, fontWeight: '700' },
  hint: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.sm, lineHeight: 17 },

  // Chips (motivo)
  chipRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs2 },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  chipActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  chipText: { ...typography.label, color: commonColors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: BRAND, fontWeight: '700' },

  // Fecha
  dateRow: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.xs2 },
  dateChip: { alignItems: 'center', paddingVertical: spacing.sm2, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, minWidth: 58, gap: 2 },
  dateChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  dateChipDow: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipDay: { ...typography.h3, color: commonColors.text },
  dateChipMonth: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipTextActive: { color: obstetraColors.onPrimary },

  // Horarios
  placeholderBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  placeholderText: { ...typography.bodySm, color: commonColors.textSecondary, flex: 1, lineHeight: 18 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: { minWidth: 64, alignItems: 'center', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, borderRadius: borderRadius.sm, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  slotChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  slotChipDisabled: { opacity: 0.4 },
  slotText: { ...typography.bodyMd, fontWeight: '600', color: commonColors.text },
  slotTextActive: { color: obstetraColors.onPrimary, fontWeight: '700' },
  slotTextDisabled: { color: commonColors.textTertiary, textDecorationLine: 'line-through' },

  // Descripción
  textArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm2,
    minHeight: 80,
  },
  textAreaInput: { flex: 1, ...typography.body, color: commonColors.text, textAlignVertical: 'top', minHeight: 60 },

  // Resumen
  summaryCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: obstetraColors.primaryLight, gap: spacing.sm },
  summaryTitle: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', marginBottom: 2 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryText: { ...typography.bodySm, color: commonColors.text, fontWeight: '600', flex: 1, textTransform: 'capitalize' },

  // Selección de paciente
  patientsPane: { minHeight: SCREEN_HEIGHT * 0.4 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, height: 48 },
  searchInput: { flex: 1, ...typography.body, color: commonColors.text },
  resultCount: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.sm, marginBottom: spacing.xs, marginLeft: spacing.xs },
  separator: { height: spacing.sm },
  patientItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm2, paddingHorizontal: spacing.sm2, borderRadius: borderRadius.md, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.borderLight },
  patientItemActive: { borderColor: BRAND, backgroundColor: obstetraColors.primaryLight },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.bodyMd, fontWeight: '700', color: commonColors.textSecondary },
  patientName: { ...typography.bodyMd, fontWeight: '600', color: commonColors.text },
  patientDoc: { ...typography.caption, color: commonColors.textTertiary },

  // Vacío
  emptyWrap: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  emptyTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  emptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center' },
});
