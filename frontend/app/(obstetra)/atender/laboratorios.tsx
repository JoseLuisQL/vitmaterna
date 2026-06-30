/**
 * VITMATERNA - Atención de Cita: Exámenes de Laboratorio
 *
 * Diseño clínico profesional, ordenado y perfectamente alineado.
 * Separa de forma ejecutiva el control de Hemoglobina/Anemia y el panel de
 * Tamizajes Serológicos, con modales intuitivos y preservación intacta del flujo.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlaskConical, Droplet, ShieldCheck, Plus, CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { AppButton } from '../../../src/components/ui/AppButton';
import { AppModal } from '../../../src/components/ui/AppModal';
import { PlainInput } from '../../../src/components/ui/PlainInput';
import { useToast } from '../../../src/components/ui';
import { usePatientProfile, useCreateLabResult } from '../../../src/services/api-queries';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { WebMaxWidth } from '../../../src/components/web';
import { goBack } from '../../../src/utils/navigation';
import { LabRow } from '../../../src/components/obstetra/patient-detail/LabRow';
import { classifyHb, classifyQualitative } from '../../../src/components/obstetra/patient-detail/helpers';

const BRAND = obstetraColors.primary;

export default function AtenderLaboratoriosScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { patientId, appointmentId, patientName } = useLocalSearchParams<{
    patientId?: string;
    appointmentId?: string;
    patientName?: string;
  }>();

  const { data: patient, isLoading } = usePatientProfile(patientId || '');
  const { mutate: createLabResult, isPending: isSavingLab } = useCreateLabResult();

  const nombre = patientName || (patient ? `${patient.firstName} ${patient.lastName}` : 'Gestante');
  const lab: any = patient?.laboratorio || {};

  // Modo del modal: 'hb' (Hemoglobina) o 'tamizaje' (Serología y otros)
  const [modalMode, setModalMode] = useState<'hb' | 'tamizaje' | null>(null);

  // Estados para Hemoglobina
  const [hbToma, setHbToma] = useState<'1' | '2' | '3'>('1');
  const [hbValor, setHbValor] = useState('');
  const [hbObs, setHbObs] = useState('');

  // Estados para Tamizaje
  const [tamTipo, setTamTipo] = useState<'vih' | 'vdrl' | 'hepatitisB' | 'glucemia' | 'examenOrina' | 'pap'>('vih');
  const [tamValorNum, setTamValorNum] = useState('');
  const [tamResultado, setTamResultado] = useState<'Negativo / No Reactivo' | 'Positivo / Reactivo' | ''>('Negativo / No Reactivo');
  const [tamObs, setTamObs] = useState('');

  const handleBackToCita = () => {
    goBack(router, {
      pathname: '/(obstetra)/atender/[appointmentId]',
      params: { appointmentId, gestanteId: patientId, patientName: nombre },
    } as any);
  };

  const handleSaveHb = () => {
    if (!hbValor || Number.isNaN(Number(hbValor))) {
      return toast.error('Valor requerido', 'Ingresa el valor numérico de hemoglobina (g/dL).');
    }
    if (!patientId) return toast.error('Error', 'No se identificó el expediente.');

    const numToma = parseInt(hbToma, 10);
    const tipoExamen = numToma === 1 ? 'hemoglobina1' : numToma === 2 ? 'hemoglobina2' : 'hemoglobina3';

    createLabResult(
      {
        gestanteId: patientId,
        tipoExamen,
        numeroToma: numToma,
        valorNumerico: parseFloat(hbValor),
        unidad: 'g/dL',
        fechaExamen: new Date().toISOString().split('T')[0],
        observaciones: hbObs || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Hemoglobina registrada', `Se guardó el control de Hemoglobina ${hbToma === '1' ? 'I' : hbToma === '2' ? 'II' : 'III'}.`);
          setModalMode(null);
          setHbValor('');
          setHbObs('');
        },
        onError: () => toast.error('Error al guardar', 'Inténtalo nuevamente en unos momentos.'),
      }
    );
  };

  const handleSaveTamizaje = () => {
    if (!patientId) return toast.error('Error', 'No se identificó el expediente.');
    if (tamTipo === 'glucemia' && (!tamValorNum || Number.isNaN(Number(tamValorNum)))) {
      return toast.error('Valor requerido', 'Ingresa el valor de glucemia en ayunas (mg/dL).');
    }

    createLabResult(
      {
        gestanteId: patientId,
        tipoExamen: tamTipo,
        numeroToma: 1,
        valorNumerico: tamTipo === 'glucemia' ? parseFloat(tamValorNum) : undefined,
        unidad: tamTipo === 'glucemia' ? 'mg/dL' : undefined,
        resultado: tamTipo !== 'glucemia' ? tamResultado : undefined,
        fechaExamen: new Date().toISOString().split('T')[0],
        observaciones: tamObs || undefined,
      },
      {
        onSuccess: () => {
          toast.success('Tamizaje guardado', 'El resultado serológico/clínico se incorporó a la historia.');
          setModalMode(null);
          setTamValorNum('');
          setTamObs('');
        },
        onError: () => toast.error('Error al guardar', 'Inténtalo nuevamente en unos momentos.'),
      }
    );
  };

  return (
    <ScreenLayout
      role="obstetra"
      title="Exámenes de laboratorio"
      subtitle={`${nombre} · Atención de cita`}
      showBack
      onBack={handleBackToCita}
      scroll={false}
      width="full"
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="full">
          {/* Banner orientador médico */}
          <View style={styles.banner}>
            <FlaskConical size={22} color={BRAND} />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Control laboratorial en consulta</Text>
              <Text style={styles.bannerText}>
                Registra o consulta los exámenes clínicos de la gestante. Todos los datos guardados aquí quedan vinculados directamente a la cita actual y al expediente MINSA.
              </Text>
            </View>
          </View>

          {/* SECCIÓN 1: HEMOGLOBINA Y ANEMIA */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: BRAND + '1A' }]}>
                  <Droplet size={20} color={BRAND} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Hemoglobina y Anemia</Text>
                  <Text style={styles.cardSubtitle}>Corrección por altitud geográfica MINSA</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setHbToma('1');
                  setHbValor('');
                  setHbObs('');
                  setModalMode('hb');
                }}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Registrar Hemoglobina</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              {(() => {
                const rows = [
                  { n: 'I', hint: '1er control (Captación)', val: lab.hemoglobina1, corr: lab.hb1Corregida },
                  { n: 'II', hint: '2do control (aprox. sem. 25)', val: lab.hemoglobina2, corr: lab.hb2Corregida },
                  { n: 'III', hint: '3er control (aprox. sem. 33)', val: lab.hemoglobina3, corr: lab.hb3Corregida },
                ];

                return rows.map((r, i) => {
                  const cls = classifyHb(r.corr ?? r.val ?? null);
                  const valueText = r.val != null
                    ? `${r.val} g/dL${r.corr != null && r.corr !== r.val ? ` (Corregida: ${r.corr} g/dL)` : ''}`
                    : null;
                  return (
                    <LabRow
                      key={r.n}
                      label={`Hemoglobina ${r.n}`}
                      hint={r.hint}
                      value={valueText}
                      state={cls.state}
                      stateLabel={cls.label}
                      isLast={i === rows.length - 1}
                    />
                  );
                });
              })()}
            </View>
          </View>

          {/* SECCIÓN 2: TAMIZAJES SEROLÓGICOS E INFECCIONES */}
          <View style={[styles.card, shadows.card]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.iconBox, { backgroundColor: semanticColors.info + '1A' }]}>
                  <ShieldCheck size={20} color={semanticColors.info} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Tamizajes Serológicos</Text>
                  <Text style={styles.cardSubtitle}>Infecciones y perfil biológico del embarazo</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: semanticColors.info }]}
                onPress={() => {
                  setTamTipo('vih');
                  setTamResultado('Negativo / No Reactivo');
                  setTamValorNum('');
                  setTamObs('');
                  setModalMode('tamizaje');
                }}
                activeOpacity={0.8}
              >
                <Plus size={16} color="#FFF" />
                <Text style={styles.actionButtonText}>Registrar Tamizaje</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.tableContainer}>
              {(() => {
                const items = [
                  { label: 'VIH', hint: 'Prueba rápida o ELISA serológico', value: lab.vih },
                  { label: 'Sífilis (VDRL / RPR)', hint: 'Tamizaje cualitativo', value: lab.vdrl },
                  { label: 'Hepatitis B (HBsAg)', hint: 'Antígeno de superficie de Hepatitis B', value: lab.hepatitisB },
                  { label: 'Glucemia en ayunas', hint: 'Tamizaje diabetes gestacional', value: lab.glucemia ? `${lab.glucemia} mg/dL` : null },
                  { label: 'Examen de Orina', hint: 'Proteinuria y bacteriuria asintomática', value: lab.examenOrina },
                  { label: 'Papanicolaou (PAP)', hint: 'Citología cervicouterina', value: lab.pap },
                ];

                return items.map((it, i) => {
                  const cls = classifyQualitative(it.value);
                  return (
                    <LabRow
                      key={it.label}
                      label={it.label}
                      hint={it.hint}
                      value={cls.state === 'pendiente' ? null : (it.value || null)}
                      state={cls.state}
                      stateLabel={cls.state === 'pendiente' ? 'Pendiente' : cls.label}
                      isLast={i === items.length - 1}
                    />
                  );
                });
              })()}
            </View>
          </View>

          {/* Footer Ejecutivo para volver */}
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

      {/* MODAL 1: REGISTRO DE HEMOGLOBINA */}
      <AppModal
        visible={modalMode === 'hb'}
        onClose={() => setModalMode(null)}
        title="Registrar Hemoglobina"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setModalMode(null)} style={{ flex: 1 }} />
            <AppButton title="Guardar resultado" onPress={handleSaveHb} style={{ flex: 1 }} themeColor={BRAND} disabled={isSavingLab} loading={isSavingLab} />
          </>
        }
      >
        <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.modalLabel}>Etapa / Control obstétrico</Text>
              <View style={styles.segmentRow}>
                {[
                  { id: '1', label: '1er Control (I)' },
                  { id: '2', label: 'Semana 25 (II)' },
                  { id: '3', label: 'Semana 33 (III)' },
                ].map((s) => {
                  const sel = hbToma === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.segmentBtn, sel && styles.segmentBtnActive]}
                      onPress={() => setHbToma(s.id as any)}
                    >
                      <Text style={[styles.segmentText, sel && styles.segmentTextActive]}>{s.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <PlainInput
              label="Valor medido en laboratorio (g/dL)"
              placeholder="Ej. 11.8"
              keyboardType="numeric"
              value={hbValor}
              onChangeText={setHbValor}
              themeColor={BRAND}
            />

            <View style={styles.infoBox}>
              <Info size={16} color={BRAND} />
              <Text style={styles.infoBoxText}>
                El sistema aplicará el factor de corrección por altitud geográfica configurado para el establecimiento según protocolo MINSA.
              </Text>
            </View>

            <PlainInput
              label="Observaciones (opcional)"
              placeholder="Ej. Se inicia suplementación preventiva..."
              value={hbObs}
              onChangeText={setHbObs}
              themeColor={BRAND}
            />
          </View>
        </ScrollView>
      </AppModal>

      {/* MODAL 2: REGISTRO DE TAMIZAJE */}
      <AppModal
        visible={modalMode === 'tamizaje'}
        onClose={() => setModalMode(null)}
        title="Registrar Tamizaje Serológico / Rutina"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setModalMode(null)} style={{ flex: 1 }} />
            <AppButton title="Guardar tamizaje" onPress={handleSaveTamizaje} style={{ flex: 1 }} themeColor={semanticColors.info} disabled={isSavingLab} loading={isSavingLab} />
          </>
        }
      >
        <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 16 }}>
            <View>
              <Text style={styles.modalLabel}>Selecciona el examen</Text>
              <View style={styles.gridContainer}>
                {[
                  { id: 'vih', label: 'VIH' },
                  { id: 'vdrl', label: 'Sífilis (VDRL)' },
                  { id: 'hepatitisB', label: 'Hepatitis B' },
                  { id: 'glucemia', label: 'Glucemia' },
                  { id: 'examenOrina', label: 'Orina' },
                  { id: 'pap', label: 'Papanicolaou' },
                ].map((ex) => {
                  const sel = tamTipo === ex.id;
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={[styles.gridBtn, sel && styles.gridBtnActive]}
                      onPress={() => setTamTipo(ex.id as any)}
                    >
                      <Text style={[styles.gridText, sel && styles.gridTextActive]}>{ex.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {tamTipo === 'glucemia' ? (
              <PlainInput
                label="Valor medido en ayunas (mg/dL)"
                placeholder="Ej. 85"
                keyboardType="numeric"
                value={tamValorNum}
                onChangeText={setTamValorNum}
                themeColor={semanticColors.info}
              />
            ) : (
              <View>
                <Text style={styles.modalLabel}>Resultado cualitativo</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  {[
                    { val: 'Negativo / No Reactivo', label: 'Negativo / Normal', color: semanticColors.success },
                    { val: 'Positivo / Reactivo', label: 'Positivo / Reactivo', color: semanticColors.danger },
                  ].map((opt) => {
                    const sel = tamResultado === opt.val;
                    return (
                      <TouchableOpacity
                        key={opt.val}
                        style={[
                          styles.resultOption,
                          sel && { backgroundColor: opt.color + '1A', borderColor: opt.color },
                        ]}
                        onPress={() => setTamResultado(opt.val as any)}
                      >
                        <Text style={[styles.resultOptionText, sel && { color: opt.color, fontWeight: '700' }]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <PlainInput
              label="Observaciones (opcional)"
              placeholder="Comentarios adicionales del laboratorio..."
              value={tamObs}
              onChangeText={setTamObs}
              themeColor={semanticColors.info}
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
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...typography.h4, color: commonColors.text, fontWeight: '700' },
  cardSubtitle: { ...typography.caption, color: commonColors.textSecondary },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  actionButtonText: { ...typography.caption, color: '#FFF', fontWeight: '700' },
  tableContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: commonColors.border,
  },
  footerBar: {
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  modalLabel: { ...typography.label, color: commonColors.text, fontWeight: '700', marginBottom: 6 },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  segmentText: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: BRAND, fontWeight: '700' },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  infoBoxText: { ...typography.caption, color: '#1E3A8A', flex: 1, lineHeight: 16 },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  gridBtn: {
    width: '31%',
    flexGrow: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    alignItems: 'center',
  },
  gridBtnActive: { backgroundColor: '#E0F2FE', borderColor: semanticColors.info },
  gridText: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },
  gridTextActive: { color: '#0369A1', fontWeight: '700' },
  resultOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    alignItems: 'center',
  },
  resultOptionText: { ...typography.caption, color: commonColors.textSecondary },
});
