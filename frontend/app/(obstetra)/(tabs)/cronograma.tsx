/**
 * VITMATERNA — Obstetra: Cronograma (agenda de citas)
 *
 * Rediseño (Fase 4): filtros resueltos en el backend (scope + búsqueda), orden
 * por prioridad clínica (confirmadas/urgentes primero, luego fecha más cercana),
 * agrupación por día con encabezados, fecha y hora en formato profesional, y
 * tiempo real. Layout limpio con ScreenLayout, sin sobrecarga visual.
 */
import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Text, RefreshControl, TouchableOpacity, TextInput, SectionList } from 'react-native';
import { Clock, MapPin, Plus, Home, Search, X } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { confirmAction } from '../../../src/utils/confirm';
import { useToast } from '../../../src/components/ui';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
import { WebMaxWidth } from '../../../src/components/web';
import {
  useAppointmentsFiltered,
  useUpdateAppointmentStatus,
  useResolveReschedule,
  useConvertToHomeVisit,
} from '../../../src/services/api-queries';
import { useAppointmentRealtime } from '../../../src/hooks/useAppointmentRealtime';
import { NuevaCitaModal } from '../../../src/components/obstetra/NuevaCitaModal';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import {
  formatHora, formatFechaHora, etiquetaRelativa, claveDia, formatFechaLarga,
} from '../../../src/utils/datetime';

const BRAND = obstetraColors.primary;

type Scope = 'hoy' | 'proximas' | 'historial' | 'todas';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
  programada: 'warning',
  confirmada: 'success',
  asistida: 'success',
  solicitud_reprogramacion: 'warning',
  reprogramada: 'warning',
  no_asistida: 'danger',
  cancelada: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  programada: 'Programada',
  confirmada: 'Confirmada',
  asistida: 'Asistida',
  solicitud_reprogramacion: 'Solicita reprogramar',
  reprogramada: 'Reprogramada',
  no_asistida: 'No asistió',
  cancelada: 'Cancelada',
};

export default function CronogramaScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const [scope, setScope] = useState<Scope>('hoy');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 350);
  const [modalVisible, setModalVisible] = useState(false);

  useAppointmentRealtime();
  const { data: appointments = [], isLoading, refetch, isRefetching } =
    useAppointmentsFiltered({ scope, search });
  const { mutate: updateStatus } = useUpdateAppointmentStatus();
  const { mutate: resolveReschedule, isPending: isResolving } = useResolveReschedule();
  const { mutate: convertToHome } = useConvertToHomeVisit();

  // Conteos por segmento (consultas ligeras en paralelo).
  const counts = useAppointmentScopeCounts();

  // Agrupar por día para los encabezados de sección. El backend ya ordena por
  // prioridad; aquí solo agrupamos respetando ese orden de llegada.
  const sections = useMemo(() => {
    const groups: { title: string; key: string; data: any[] }[] = [];
    const index: Record<string, number> = {};
    for (const a of appointments as any[]) {
      const k = claveDia(a.fecha);
      if (index[k] === undefined) {
        index[k] = groups.length;
        groups.push({ key: k, title: etiquetaRelativa(a.fecha), data: [] });
      }
      groups[index[k]].data.push(a);
    }
    return groups;
  }, [appointments]);

  const renderItem = ({ item }: { item: any }) => {
    const estado = item.estado || 'programada';
    const variant = STATUS_VARIANT[estado] || 'default';
    const statusText = STATUS_LABEL[estado] || estado;
    const esDomiciliaria = item.modalidad === 'domiciliaria';
    const isRescheduleRequest = estado === 'solicitud_reprogramacion';
    const showActions = estado === 'programada' || estado === 'confirmada';
    const patientName = item.gestante?.user
      ? `${item.gestante.user.firstName} ${item.gestante.user.lastName}`
      : 'Paciente';
    const gestanteId = item.gestanteId;

    const handleNoAsistio = async () => {
      const ok = await confirmAction({
        title: 'Marcar como no asistió',
        message: `¿Confirmas que ${patientName} no asistió a su cita?`,
        confirmText: 'Sí, no asistió',
        destructive: true,
      });
      if (!ok) return;
      updateStatus({ id: item.id, status: 'no_asistida' });
    };

    const handleAtender = () => {
      router.push({
        pathname: '/(obstetra)/atender/[appointmentId]',
        params: { appointmentId: item.id, gestanteId: gestanteId || '', patientName },
      } as any);
    };

    const handleConvertir = async () => {
      const ok = await confirmAction({
        title: 'Convertir a visita domiciliaria',
        message: 'Se atenderá a la gestante en su domicilio. Se le notificará.',
        confirmText: 'Convertir',
      });
      if (!ok) return;
      convertToHome(
        { id: item.id },
        {
          onSuccess: () => toast.success('Cita domiciliaria', 'La gestante fue notificada.'),
          onError: () => toast.error('No se pudo convertir', 'Inténtalo nuevamente.'),
        },
      );
    };

    const handleResolve = (aprobar: boolean) => {
      resolveReschedule(
        { id: item.id, aprobar },
        {
          onSuccess: () =>
            toast.success(
              aprobar ? 'Reprogramación aprobada' : 'Solicitud rechazada',
              aprobar ? 'La gestante fue notificada de la nueva fecha.' : 'La gestante fue notificada.',
            ),
          onError: () => toast.error('No se pudo procesar', 'Inténtalo nuevamente.'),
        },
      );
    };

    return (
      <View style={[styles.card, isRescheduleRequest && styles.cardAlert]}>
        {/* Columna de hora */}
        <View style={styles.timeCol}>
          <Text style={styles.timeText}>{formatHora(item.hora)}</Text>
        </View>

        <View style={styles.cardBody}>
          <TouchableOpacity
            activeOpacity={gestanteId ? 0.6 : 1}
            disabled={!gestanteId}
            onPress={() => gestanteId && router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: gestanteId } } as any)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir historia de ${patientName}`}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.patientName} numberOfLines={1}>{patientName}</Text>
              <AppBadge label={statusText} variant={variant} />
            </View>
            <Text style={styles.apptType} numberOfLines={1}>{item.motivo || 'Control prenatal'}</Text>
            <View style={styles.metaRow}>
              {esDomiciliaria ? <Home size={12} color={BRAND} /> : <MapPin size={12} color={commonColors.textTertiary} />}
              <Text style={[styles.metaText, esDomiciliaria && { color: BRAND, fontWeight: '700' }]} numberOfLines={1}>
                {esDomiciliaria ? 'Visita domiciliaria' : 'Consultorio'}
              </Text>
            </View>
          </TouchableOpacity>

          {isRescheduleRequest && (
            <View style={styles.rescheduleBox}>
              <Text style={styles.rescheduleTitle} numberOfLines={2}>
                Propone: {formatFechaHora(item.fechaReprogramada, item.horaReprogramada)}
              </Text>
              {item.motivoReprogramacion ? (
                <Text style={styles.rescheduleMotivo} numberOfLines={2}>Motivo: {item.motivoReprogramacion}</Text>
              ) : null}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={[styles.actionBtn, styles.btnPrimary]} disabled={isResolving} onPress={() => handleResolve(true)}>
                  <Text style={styles.btnPrimaryText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.btnGhost]} disabled={isResolving} onPress={() => handleResolve(false)}>
                  <Text style={styles.btnGhostText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {showActions && !esDomiciliaria && (
            <TouchableOpacity style={styles.convertBtn} onPress={handleConvertir}>
              <Home size={13} color={BRAND} />
              <Text style={styles.convertBtnText}>Convertir a domiciliaria</Text>
            </TouchableOpacity>
          )}

          {showActions && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.btnPrimary]} onPress={handleAtender}>
                <Text style={styles.btnPrimaryText}>Atender</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.btnGhost]} onPress={handleNoAsistio}>
                <Text style={styles.btnGhostText}>No asistió</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const SEGMENTS: { key: Scope; label: string }[] = [
    { key: 'hoy', label: 'Hoy' },
    { key: 'proximas', label: 'Próximas' },
    { key: 'historial', label: 'Historial' },
    { key: 'todas', label: 'Todas' },
  ];

  return (
    <ScreenLayout
      role="obstetra"
      title="Cronograma"
      subtitle="Agenda de citas"
      accentColor={BRAND}
      scroll={false}
      actions={<NotificationBell href="/(obstetra)/notificaciones" color={commonColors.white} />}
    >
      <WebMaxWidth width="wide">
      {/* Buscador */}
      <View style={styles.searchBar}>
        <Search size={18} color={commonColors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar paciente por nombre o DNI"
          placeholderTextColor={commonColors.textTertiary}
          value={searchInput}
          onChangeText={setSearchInput}
          returnKeyType="search"
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={() => setSearchInput('')} hitSlop={8} accessibilityLabel="Limpiar búsqueda">
            <X size={16} color={commonColors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Segmentos de filtro */}
      <View style={styles.segments}>
        {SEGMENTS.map((s) => {
          const active = scope === s.key;
          const count = counts[s.key];
          return (
            <TouchableOpacity
              key={s.key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setScope(s.key)}
              accessibilityRole="button"
              accessibilityLabel={`${s.label}${count != null ? `, ${count} citas` : ''}`}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {s.label}{count != null ? ` (${count})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </WebMaxWidth>

      {isLoading ? (
        <View style={{ paddingTop: spacing.md }}><ListSkeleton count={5} /></View>
      ) : (
        <SectionList
          sections={sections as any}
          keyExtractor={(item: any) => item.id}
          renderItem={renderItem}
          renderSectionHeader={({ section }: any) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              <Text style={styles.sectionHeaderSub}>{formatFechaLarga(section.data[0]?.fecha)}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          contentContainerStyle={[styles.listContent, webShell && styles.listWeb]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon={Clock as any}
              title="Sin citas"
              description={search ? 'No hay resultados para tu búsqueda.' : 'No hay citas para este filtro.'}
              themeColor={BRAND}
            />
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
        />
      )}

      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => setModalVisible(true)} accessibilityLabel="Nueva cita">
        <Plus size={26} color={obstetraColors.onPrimary} />
      </TouchableOpacity>

      <NuevaCitaModal visible={modalVisible} onClose={() => setModalVisible(false)} />
    </ScreenLayout>
  );
}

/** Conteos por segmento (consultas ligeras, solo para badges). */
function useAppointmentScopeCounts(): Record<Scope, number | null> {
  const hoy = useAppointmentsFiltered({ scope: 'hoy' });
  const proximas = useAppointmentsFiltered({ scope: 'proximas' });
  const historial = useAppointmentsFiltered({ scope: 'historial' });
  const todas = useAppointmentsFiltered({ scope: 'todas' });
  return {
    hoy: hoy.data?.length ?? null,
    proximas: proximas.data?.length ?? null,
    historial: historial.data?.length ?? null,
    todas: todas.data?.length ?? null,
  };
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, marginBottom: spacing.md,
  },
  searchInput: { flex: 1, ...typography.body, color: commonColors.text, padding: 0 },

  segments: { flexDirection: 'row', gap: spacing.xs2, marginBottom: spacing.sm },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.full, backgroundColor: commonColors.surfaceAlt, alignItems: 'center' },
  segmentActive: { backgroundColor: BRAND },
  segmentText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  segmentTextActive: { color: commonColors.white },

  listContent: { paddingBottom: layout.tabBarSpace + 80, paddingTop: spacing.xs },
  listWeb: { width: '100%', maxWidth: webLayout.contentMaxWidth.lg, alignSelf: 'center', paddingBottom: spacing.xl },

  sectionHeader: { backgroundColor: commonColors.background, paddingVertical: spacing.sm, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  sectionHeaderText: { ...typography.label, fontWeight: '700', color: commonColors.text },
  sectionHeaderSub: { ...typography.caption, color: commonColors.textSecondary, textTransform: 'capitalize' },

  card: {
    flexDirection: 'row',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardAlert: { borderColor: semanticColors.warning, backgroundColor: semanticColors.warningLight },
  timeCol: { minWidth: 76, paddingRight: spacing.md, borderRightWidth: 1, borderRightColor: commonColors.borderLight, justifyContent: 'center' },
  timeText: { ...typography.label, fontWeight: '700', color: commonColors.text },
  cardBody: { flex: 1, paddingLeft: spacing.md, minWidth: 0 },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: 2 },
  patientName: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text, flex: 1 },
  apptType: { ...typography.bodySm, color: commonColors.textSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  metaText: { ...typography.caption, color: commonColors.textTertiary },

  rescheduleBox: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, padding: spacing.sm, marginTop: spacing.sm, borderWidth: 1, borderColor: semanticColors.warning },
  rescheduleTitle: { ...typography.caption, fontWeight: '700', color: commonColors.text },
  rescheduleMotivo: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  convertBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm, alignSelf: 'flex-start' },
  convertBtnText: { ...typography.caption, fontWeight: '600', color: BRAND },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: { flex: 1, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full, alignItems: 'center' },
  btnPrimary: { backgroundColor: BRAND },
  btnPrimaryText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  btnGhost: { backgroundColor: commonColors.surfaceAlt },
  btnGhostText: { ...typography.caption, fontWeight: '700', color: commonColors.textSecondary },

  fab: {
    position: 'absolute', right: spacing.lg, bottom: layout.tabBarSpace + spacing.sm,
    width: 56, height: 56, borderRadius: 28, backgroundColor: BRAND,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
});
