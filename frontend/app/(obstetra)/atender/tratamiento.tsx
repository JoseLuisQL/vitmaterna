/**
 * VITMATERNA - Atención de Cita: Prescripción y Tratamiento
 *
 * Diseño limpio, ejecutivo y enfocado estrictamente en la gestión de recetas
 * y seguimiento de adherencia de la gestante durante la consulta obstétrica.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pill, Plus, CheckCircle2 } from 'lucide-react-native';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { AppButton } from '../../../src/components/ui/AppButton';
import { AppModal } from '../../../src/components/ui/AppModal';
import { PlainInput } from '../../../src/components/ui/PlainInput';
import { DateTimeField } from '../../../src/components/ui/DateTimeField';
import { useToast } from '../../../src/components/ui';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { usePatientProfile, useCreateTreatment, useUpdateTreatment } from '../../../src/services/api-queries';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { WebMaxWidth } from '../../../src/components/web';
import { goBack } from '../../../src/utils/navigation';

const BRAND = obstetraColors.primary;

export default function AtenderTratamientoScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { patientId, appointmentId, patientName } = useLocalSearchParams<{
    patientId?: string;
    appointmentId?: string;
    patientName?: string;
  }>();

  const { data: patient, isLoading } = usePatientProfile(patientId || '');
  const { mutate: createTreatment, isPending: isSavingTreat } = useCreateTreatment();
  const { mutate: updateTreatment } = useUpdateTreatment();

  const nombre = patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Gestante');
  const suplementos = patient?.suplementos || [];

  // Estado del Modal de Prescripción
  const [isModalVisible, setIsModalVisible] = useState(false);

  // Estados del Formulario
  const [treatNombre, setTreatNombre] = useState('');
  const [treatDosis, setTreatDosis] = useState('1 tableta');
  const [treatFrecuencia, setTreatFrecuencia] = useState('Diario');
  const [treatHorarios, setTreatHorarios] = useState<string[]>(['08:00']);
  const [treatHoraInput, setTreatHoraInput] = useState('14:00');
  const [treatDuracion, setTreatDuracion] = useState('30');

  const handleBackToCita = () => {
    goBack(router, {
      pathname: '/(obstetra)/atender/[appointmentId]',
      params: { appointmentId, gestanteId: patientId, patientName: nombre },
    } as any);
  };

  const handleSaveTreat = () => {
    if (!treatNombre) return toast.error('Falta el medicamento', 'Por favor ingresa el nombre del suplemento o fármaco.');
    if (!patientId) return toast.error('Error', 'No se identificó el expediente de la gestante.');

    createTreatment(
      {
        gestanteId: patientId,
        nombre: treatNombre,
        dosis: treatDosis,
        frecuencia: treatFrecuencia,
        horaToma: treatHorarios.length > 0 ? treatHorarios[0] : undefined,
        horarios: treatHorarios,
        duracionDias: parseInt(treatDuracion, 10) || 30,
        fechaInicio: new Date().toISOString().split('T')[0],
        viaAdministracion: 'oral',
      },
      {
        onSuccess: () => {
          toast.success('Receta guardada', 'La gestante recibirá alertas en su horario programado.');
          setIsModalVisible(false);
          setTreatNombre('');
          setTreatDosis('1 tableta');
          setTreatFrecuencia('Diario');
          setTreatHorarios(['08:00']);
          setTreatHoraInput('14:00');
          setTreatDuracion('30');
        },
        onError: () => {
          toast.error('Error al guardar', 'No se pudo registrar la prescripción en este momento.');
        },
      }
    );
  };

  const handleSuspend = (sup: any) => {
    updateTreatment(
      { treatmentId: sup.id || sup._id, gestanteId: patientId || '', data: { estado: 'suspendido' } },
      {
        onSuccess: () => toast.success('Tratamiento suspendido', `Se suspendió ${sup.nombre}.`),
        onError: () => toast.error('Error', 'No se pudo suspender la medicación.'),
      }
    );
  };

  return (
    <ScreenLayout
      role="obstetra"
      title="Prescripción y tratamiento"
      subtitle={`${nombre} · Atención de cita`}
      showBack
      onBack={handleBackToCita}
      scroll={false}
      width="full"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="full">
          {/* Banner orientador */}
          <View style={styles.banner}>
            <Pill size={22} color={BRAND} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Gestión de recetas y suplementación</Text>
              <Text style={styles.bannerText}>
                Prescribe o ajusta suplementos preventivos y tratamientos. Toda asignación genera recordatorios móviles diarios para asegurar la adherencia de la gestante.
              </Text>
            </View>
          </View>

          {/* TARJETA PRINCIPAL: TRATAMIENTOS Y SUPLEMENTOS ACTIVOS */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderTop}>
              <View style={[styles.iconBox, { backgroundColor: BRAND + '1A' }]}>
                <Pill size={20} color={BRAND} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Esquema Activo de la Gestante</Text>
                <Text style={styles.cardSubtitle}>Medicación recetada y monitoreo de cumplimiento</Text>
              </View>
            </View>

            {/* Acción prominente y limpia */}
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={styles.regBtn}
                onPress={() => {
                  setTreatNombre('');
                  setTreatDosis('1 tableta');
                  setTreatFrecuencia('Diario');
                  setTreatHorarios(['08:00']);
                  setTreatHoraInput('14:00');
                  setTreatDuracion('30');
                  setIsModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.regBtnText}>Recetar suplemento</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {suplementos && suplementos.length > 0 ? (
                suplementos.map((sup: any, idx: number) => {
                  const tomados = sup.diasTomados?.length || 0;
                  const total = sup.totalDias || 30;
                  const pct = total > 0 ? Math.round((tomados / total) * 100) : 0;
                  const adColor = pct >= 80 ? semanticColors.success : pct >= 50 ? semanticColors.warning : semanticColors.danger;
                  const adLabel = pct >= 80 ? 'Buena adherencia' : pct >= 50 ? 'Adherencia regular' : 'Adherencia baja';
                  const suspendido = sup.estado === 'suspendido';
                  const isLast = idx === suplementos.length - 1;

                  return (
                    <View key={sup.id || sup._id} style={[styles.pillCard, !isLast && styles.pillBorder, suspendido && { opacity: 0.6 }]}>
                      <View style={styles.pillIconBox}>
                        <Pill size={20} color={BRAND} />
                      </View>
                      <View style={styles.pillInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.pillName}>{sup.nombre}</Text>
                          {suspendido && <Text style={styles.suspendBadge}>Suspendido</Text>}
                        </View>
                        <Text style={styles.pillDosis}>
                          {sup.dosis} • {sup.frecuencia}
                          {sup.horarios && sup.horarios.length > 0
                            ? ` • ⏰ ${sup.horarios.join(' · ')}`
                            : sup.horaRecordatorio
                            ? ` • ⏰ ${sup.horaRecordatorio}`
                            : ''}
                        </Text>

                        <View style={styles.progressWrap}>
                          <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: adColor }]} />
                          </View>
                          <Text style={[styles.progressPct, { color: adColor }]}>{pct}%</Text>
                        </View>

                        <View style={styles.adherenceRow}>
                          {!suspendido && (
                            <View style={[styles.adherencePill, { backgroundColor: adColor + '1A' }]}>
                              <Text style={[styles.adherencePillText, { color: adColor }]}>{adLabel}</Text>
                            </View>
                          )}
                          <Text style={styles.progressHint}>{tomados} de {total} dosis registradas</Text>
                        </View>

                        {!suspendido && (
                          <View style={styles.treatActionsRow}>
                            <TouchableOpacity
                              style={[styles.treatActionBtn, styles.treatSuspendBtn]}
                              onPress={() => handleSuspend(sup)}
                            >
                              <Text style={[styles.treatActionText, { color: semanticColors.danger }]}>Suspender medicación</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <EmptyState
                  icon={Pill as any}
                  title="Sin medicación activa"
                  description="No hay suplementos o tratamientos registrados. Presiona el botón superior para emitir una receta."
                  themeColor={BRAND}
                />
              )}
            </View>
          </View>

          {/* Footer Ejecutivo */}
          <View style={styles.footerBar}>
            <AppButton
              title="Volver a la cita"
              onPress={handleBackToCita}
              themeColor={BRAND}
              style={{ width: '100%' }}
            />
          </View>
        </WebMaxWidth>
      </ScrollView>

      {/* MODAL: RECETAR NUEVO SUPLEMENTO / FÁRMACO */}
      <AppModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        title="Recetar Suplemento o Fármaco"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar receta" onPress={handleSaveTreat} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingTreat} loading={isSavingTreat} />
          </>
        }
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 14 }}>
            <View>
              <Text style={styles.modalSubLabel}>Sugerencias comunes MINSA:</Text>
              <View style={styles.suggestionGrid}>
                {[
                  'Sulfato ferroso + Ácido fólico',
                  'Ácido fólico profiláctico',
                  'Carbonato de calcio 500mg',
                ].map((sug) => (
                  <TouchableOpacity
                    key={sug}
                    style={[styles.suggestionPill, treatNombre === sug && styles.suggestionPillActive]}
                    onPress={() => setTreatNombre(sug)}
                  >
                    <Text style={[styles.suggestionText, treatNombre === sug && styles.suggestionTextActive]}>{sug}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <PlainInput
              label="Nombre del fármaco o suplemento"
              placeholder="Ej. Sulfato ferroso + Ácido fólico (60 mg + 400 mcg)"
              value={treatNombre}
              onChangeText={setTreatNombre}
              themeColor={BRAND}
            />
            <PlainInput
              label="Dosis recomendada"
              placeholder="Ej. 1 tableta diaria"
              value={treatDosis}
              onChangeText={setTreatDosis}
              themeColor={BRAND}
            />
            <PlainInput
              label="Frecuencia"
              placeholder="Ej. Diario después del almuerzo"
              value={treatFrecuencia}
              onChangeText={setTreatFrecuencia}
              themeColor={BRAND}
            />
            <View style={{ marginBottom: spacing.md }}>
              <Text style={{ ...typography.label, color: commonColors.text, marginBottom: spacing.xs }}>
                Horarios de recordatorio móvil (múltiples al día)
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {treatHorarios.map((horaTxt, idx) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: BRAND + '1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: BRAND }}>
                    <Text style={{ ...typography.bodySm, color: BRAND, fontWeight: '700', marginRight: 6 }}>{horaTxt}</Text>
                    {treatHorarios.length > 1 && (
                      <TouchableOpacity onPress={() => setTreatHorarios(treatHorarios.filter((_, i) => i !== idx))}>
                        <Text style={{ color: BRAND, fontWeight: 'bold', fontSize: 16 }}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <DateTimeField
                    label=""
                    mode="time"
                    value={treatHoraInput}
                    onChange={setTreatHoraInput}
                    themeColor={BRAND}
                    placeholder="Seleccionar hora"
                    minuteStep={5}
                  />
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: BRAND, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, justifyContent: 'center' }}
                  onPress={() => {
                    if (treatHoraInput && !treatHorarios.includes(treatHoraInput)) {
                      setTreatHorarios([...treatHorarios, treatHoraInput].sort());
                    }
                  }}
                >
                  <Text style={{ color: '#FFF', fontWeight: 'bold' }}>+ Agregar hora</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ ...typography.caption, color: commonColors.textSecondary, marginTop: 4 }}>
                A las horas especificadas el celular de la gestante emitirá la alerta visual y sonora.
              </Text>
            </View>
            <PlainInput
              label="Duración del tratamiento (días)"
              placeholder="Ej. 30"
              keyboardType="numeric"
              value={treatDuracion}
              onChangeText={setTreatDuracion}
              themeColor={BRAND}
            />
          </View>
        </ScrollView>
      </AppModal>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: commonColors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: obstetraColors.primaryLight,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  bannerTitle: { ...typography.h4, fontWeight: '700', color: obstetraColors.primaryDark, marginBottom: 4 },
  bannerText: { ...typography.bodySm, color: commonColors.textSecondary, lineHeight: 18 },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.h4, color: commonColors.text, fontWeight: '700' },
  cardSubtitle: { ...typography.caption, color: commonColors.textSecondary },
  actionButtonsContainer: {
    marginTop: 14,
    marginBottom: 16,
    width: '100%',
  },
  regBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: BRAND,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.full,
    width: '100%',
  },
  regBtnText: { ...typography.bodySm, color: '#FFF', fontWeight: '700' },
  listContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight || '#F1F5F9',
    paddingTop: 12,
  },
  pillCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  pillBorder: {
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
  },
  pillIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillInfo: { flex: 1, minWidth: 0 },
  pillName: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  suspendBadge: {
    ...typography.overline,
    color: semanticColors.danger,
    backgroundColor: semanticColors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    fontWeight: '700',
  },
  pillDosis: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 6, backgroundColor: commonColors.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  progressPct: { ...typography.caption, fontWeight: '700', width: 36, textAlign: 'right' },
  adherenceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6, flexWrap: 'wrap', gap: 4 },
  adherencePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.full },
  adherencePillText: { ...typography.overline, fontWeight: '700' },
  progressHint: { ...typography.caption, color: commonColors.textTertiary },
  treatActionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 10 },
  treatActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  treatSuspendBtn: { borderColor: semanticColors.dangerLight },
  treatActionText: { ...typography.caption, fontWeight: '600' },
  footerBar: { marginTop: spacing.sm, paddingTop: spacing.md },
  modalSubLabel: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600', marginBottom: 6 },
  suggestionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  suggestionPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  suggestionPillActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  suggestionText: { ...typography.caption, color: commonColors.textSecondary },
  suggestionTextActive: { color: BRAND, fontWeight: '700' },
});
