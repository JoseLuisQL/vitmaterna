/**
 * VITMATERNA — Tab de Visitas Domiciliarias (ficha del obstetra).
 * Registra el acta MINSA, lista el historial y permite ubicar el domicilio.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { Home, Plus, MapPin, Trash2, Clock, Pencil } from 'lucide-react-native';
import { AppModal, AppButton, useToast } from '../ui';
import { useHomeVisits, useCreateHomeVisit, useDeleteHomeVisit } from '../../services/api-queries';
import { openInMaps } from '../../utils/maps';
import { confirmAction } from '../../utils/confirm';
import { commonColors, obstetraColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

const BRAND = obstetraColors.primary;

interface Props {
  gestanteId: string;
  domicilioLat?: number | null;
  domicilioLng?: number | null;
  referenciaDom?: string | null;
}

function fmtFecha(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function fmtHora(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function HomeVisitsTab({ gestanteId, domicilioLat, domicilioLng, referenciaDom }: Props): React.ReactElement {
  const toast = useToast();
  const { data: visits = [], isLoading } = useHomeVisits(gestanteId);
  const createMut = useCreateHomeVisit();
  const deleteMut = useDeleteHomeVisit();

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    horaLlegada: '09:00',
    duracionMin: '30',
    motivo: 'Seguimiento de consumo de micronutrientes',
    acciones: '',
    acuerdos: '',
    firmaGestante: false,
    firmaObstetra: false,
  });

  const tieneGps = domicilioLat != null && domicilioLng != null;

  const handleComoLlegar = async () => {
    const ok = await openInMaps(domicilioLat, domicilioLng);
    if (!ok) toast.info('Sin ubicación', 'La gestante aún no registró su ubicación GPS.');
  };

  const captureGps = (): Promise<{ lat?: number; lng?: number }> =>
    new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve({}),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      } else {
        resolve({});
      }
    });

  const handleSave = async () => {
    if (form.acciones.trim().length < 3) {
      toast.warning('Falta información', 'Describe las acciones realizadas en la visita.');
      return;
    }
    const gps = await captureGps();
    createMut.mutate(
      {
        gestanteId,
        fecha: form.fecha,
        horaLlegada: form.horaLlegada || undefined,
        duracionMin: form.duracionMin ? parseInt(form.duracionMin, 10) : undefined,
        motivo: form.motivo,
        acciones: form.acciones.trim(),
        acuerdos: form.acuerdos.trim() || undefined,
        lat: gps.lat ?? (domicilioLat ?? undefined),
        lng: gps.lng ?? (domicilioLng ?? undefined),
        firmaGestante: form.firmaGestante,
        firmaObstetra: form.firmaObstetra,
      },
      {
        onSuccess: () => {
          toast.success('Visita registrada', 'El acta de visita domiciliaria fue guardada.');
          setModalVisible(false);
          setForm((f) => ({ ...f, acciones: '', acuerdos: '', firmaGestante: false, firmaObstetra: false }));
        },
        onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo registrar'),
      },
    );
  };

  const confirmDelete = async (id: string, n: number) => {
    const ok = await confirmAction({
      title: 'Eliminar visita',
      message: `¿Eliminar el acta de la visita N°${n}?`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    deleteMut.mutate({ id, gestanteId });
  };

  return (
    <View style={styles.section}>
      {/* Ubicación del domicilio */}
      <View style={styles.gpsCard}>
        <View style={styles.gpsIcon}><MapPin size={20} color={tieneGps ? BRAND : commonColors.textTertiary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.gpsTitle}>{tieneGps ? 'Domicilio ubicado' : 'Sin ubicación GPS'}</Text>
          <Text style={styles.gpsSub}>{referenciaDom || (tieneGps ? `${domicilioLat?.toFixed(4)}, ${domicilioLng?.toFixed(4)}` : 'La gestante aún no registró su ubicación')}</Text>
        </View>
        {tieneGps && (
          <TouchableOpacity style={styles.gpsBtn} onPress={handleComoLlegar}>
            <Text style={styles.gpsBtnText}>Cómo llegar</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.headerRow}>
        <Text style={styles.cardHeader}>Visitas Domiciliarias</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Plus size={16} color={obstetraColors.onPrimary} />
          <Text style={styles.addBtnText}>Nueva</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.empty}>Cargando…</Text>
      ) : visits.length === 0 ? (
        <View style={styles.emptyBox}>
          <Home size={32} color={commonColors.textTertiary} />
          <Text style={styles.empty}>Aún no hay visitas domiciliarias registradas.</Text>
        </View>
      ) : (
        visits.map((v) => (
          <View key={v.id} style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={styles.numBadge}><Text style={styles.numText}>N°{v.numeroVisita}</Text></View>
              <Text style={styles.visitDate}>{fmtFecha(v.fecha)}</Text>
              <View style={styles.visitTime}><Clock size={12} color={commonColors.textTertiary} /><Text style={styles.visitTimeText}>{fmtHora(v.horaLlegada)} · {v.duracionMin || 30} min</Text></View>
              <TouchableOpacity onPress={() => confirmDelete(v.id, v.numeroVisita)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Eliminar visita N°${v.numeroVisita}`}>
                <Trash2 size={16} color={semanticColors.danger} />
              </TouchableOpacity>
            </View>
            <Text style={styles.visitMotivo}>{v.motivo}</Text>
            <Text style={styles.visitLabel}>Acciones</Text>
            <Text style={styles.visitText}>{v.acciones}</Text>
            {v.acuerdos ? (<><Text style={styles.visitLabel}>Acuerdos</Text><Text style={styles.visitText}>{v.acuerdos}</Text></>) : null}
            <View style={styles.firmaRow}>
              <Text style={styles.firma}>{v.firmaGestante ? '✓ Firma usuario' : '— Firma usuario'}</Text>
              <Text style={styles.firma}>{v.firmaObstetra ? '✓ Firma personal' : '— Firma personal'}</Text>
            </View>
            {v.obstetra?.user ? (
              <Text style={styles.personal}>Obst. {v.obstetra.user.firstName} {v.obstetra.user.lastName}{v.obstetra.cop ? ` — COP N° ${v.obstetra.cop}` : ''}</Text>
            ) : null}
          </View>
        ))
      )}

      <AppModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title="Registrar visita domiciliaria"
        subtitle="Acta de visita (se captura tu ubicación GPS al guardar)."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setModalVisible(false)} style={{ flex: 1 }} />
            <AppButton title="Guardar acta" onPress={handleSave} loading={createMut.isPending} themeColor={BRAND} style={{ flex: 1 }} />
          </>
        }
      >
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Fecha</Text>
            <TextInput style={styles.input} value={form.fecha} onChangeText={(t) => setForm({ ...form, fecha: t })} placeholder="2026-01-12" placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View style={{ width: 90 }}>
            <Text style={styles.inputLabel}>Hora</Text>
            <TextInput style={styles.input} value={form.horaLlegada} onChangeText={(t) => setForm({ ...form, horaLlegada: t })} placeholder="09:00" placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View style={{ width: 70 }}>
            <Text style={styles.inputLabel}>Min</Text>
            <TextInput style={styles.input} value={form.duracionMin} onChangeText={(t) => setForm({ ...form, duracionMin: t })} keyboardType="numeric" placeholder="30" placeholderTextColor={commonColors.textTertiary} />
          </View>
        </View>

        <Text style={styles.inputLabel}>Motivo de la visita</Text>
        <TextInput style={styles.input} value={form.motivo} onChangeText={(t) => setForm({ ...form, motivo: t })} />

        <Text style={styles.inputLabel}>Acciones realizadas</Text>
        <TextInput style={[styles.input, { height: 90 }]} value={form.acciones} onChangeText={(t) => setForm({ ...form, acciones: t })} multiline placeholder="Orientación y consejería en nutrición, signos de alarma, lavado de manos…" placeholderTextColor={commonColors.textTertiary} />

        <Text style={styles.inputLabel}>Acuerdos</Text>
        <TextInput style={[styles.input, { height: 60 }]} value={form.acuerdos} onChangeText={(t) => setForm({ ...form, acuerdos: t })} multiline placeholder="Acuerdos de la visita" placeholderTextColor={commonColors.textTertiary} />

        <View style={styles.firmaToggleRow}>
          <TouchableOpacity style={[styles.chk, form.firmaGestante && styles.chkActive]} onPress={() => setForm({ ...form, firmaGestante: !form.firmaGestante })}>
            <Text style={[styles.chkText, form.firmaGestante && styles.chkTextActive]}>Firma del usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chk, form.firmaObstetra && styles.chkActive]} onPress={() => setForm({ ...form, firmaObstetra: !form.firmaObstetra })}>
            <Text style={[styles.chkText, form.firmaObstetra && styles.chkTextActive]}>Firma del personal</Text>
          </TouchableOpacity>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  gpsCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border },
  gpsIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  gpsTitle: { ...typography.label, color: commonColors.text },
  gpsSub: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  gpsBtn: { backgroundColor: BRAND, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full },
  gpsBtnText: { ...typography.caption, color: obstetraColors.onPrimary, fontWeight: '700' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  cardHeader: { ...typography.h3, color: commonColors.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND, paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full },
  addBtnText: { ...typography.caption, color: obstetraColors.onPrimary, fontWeight: '700' },
  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  empty: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center' },
  visitCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: commonColors.border, gap: 4 },
  visitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  numBadge: { backgroundColor: obstetraColors.primaryLight, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  numText: { ...typography.overline, color: BRAND, fontWeight: '800', letterSpacing: 0 },
  visitDate: { ...typography.label, color: commonColors.text },
  visitTime: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  visitTimeText: { ...typography.caption, color: commonColors.textTertiary },
  visitMotivo: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text },
  visitLabel: { ...typography.overline, color: commonColors.textSecondary, marginTop: 4, textTransform: 'uppercase' },
  visitText: { ...typography.bodySmall, color: commonColors.textSecondary },
  firmaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  firma: { ...typography.caption, color: commonColors.textTertiary },
  personal: { ...typography.caption, color: commonColors.text, marginTop: 4, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.sm },
  inputLabel: { ...typography.label, color: commonColors.textSecondary, marginTop: spacing.sm, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, padding: spacing.sm + 2, ...typography.bodySmall, fontSize: 15, color: commonColors.text, backgroundColor: commonColors.background, textAlignVertical: 'top' },
  firmaToggleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chk: { flex: 1, paddingVertical: 10, borderRadius: borderRadius.md, borderWidth: 1, borderColor: commonColors.border, alignItems: 'center', backgroundColor: commonColors.surfaceAlt },
  chkActive: { backgroundColor: obstetraColors.primaryLight, borderColor: BRAND },
  chkText: { ...typography.caption, color: commonColors.textSecondary, fontWeight: '600' },
  chkTextActive: { color: BRAND, fontWeight: '700' },
});
