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
import { WebMaxWidth, DataTable } from '../../../src/components/web';
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
  const { data: appointments = [], isLoading, isError, refetch, isRefetching } =
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

  // ── Acciones de cita reutilizables (móvil y web) — issue #5 ──
  const patientNameOf = (item: any) =>
    item.gestante?.user ? `${item.gestante.user.firstName} ${item.gestante.user.lastName}` : 'Paciente';

  const atenderCita = (item: any) => {
    router.push({
      pathname: '/(obstetra)/atender/[appointmentId]',
      params: { appointmentId: item.id, gestanteId: item.gestanteId || '', patientName: patientNameOf(item) },
    } as any);
  };

  const marcarNoAsistio = async (item: any) => {
    const ok = await confirmAction({
      title: 'Marcar como no asistió',
      message: `¿Confirmas que ${patientNameOf(item)} no asistió a su cita?`,
      confirmText: 'Sí, no asistió',
      destructive: true,
    });
    if (!ok) return;
    updateStatus({ id: item.id, status: 'no_asistida' });
  };

  const resolverReprogramacion = (item: any, aprobar: boolean) => {
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

  if (webShell) {
    const columns: any[] = [
      {
        key: 'fecha', header: 'Fecha y Hora', width: 140,
        sortValue: (p: any) => p.fecha,
        render: (p: any) => (
          <View>
            <Text style={{ ...typography.bodySm, fontWeight: '600', color: commonColors.text }}>{new Date(p.fecha).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}</Text>
            <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>{formatHora(p.hora)}</Text>
          </View>
        ),
      },
      {
        key: 'paciente', header: 'Paciente', flex: 2,
        sortValue: (p: any) => p.gestante?.user?.firstName || '',
        render: (p: any) => {
          const name = `${p.gestante?.user?.firstName || ''} ${p.gestante?.user?.lastName || ''}`.trim();
          return (
            <View>
              <Text style={{ ...typography.bodySm, fontWeight: '600', color: commonColors.text }} numberOfLines={1}>{name || 'Paciente sin nombre'}</Text>
              <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>{p.motivo || 'Control prenatal'}</Text>
            </View>
          );
        },
      },
      {
        key: 'modalidad', header: 'Modalidad', width: 140,
        sortValue: (p: any) => p.modalidad,
        render: (p: any) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {p.modalidad === 'domiciliaria' ? <Home size={14} color={BRAND} /> : <MapPin size={14} color={commonColors.textTertiary} />}
            <Text style={{ ...typography.bodySm, color: p.modalidad === 'domiciliaria' ? BRAND : commonColors.textSecondary, fontWeight: p.modalidad === 'domiciliaria' ? '600' : '400' }}>
              {p.modalidad === 'domiciliaria' ? 'Domicilio' : 'Consultorio'}
            </Text>
          </View>
        ),
      },
      {
        key: 'estado', header: 'Estado', width: 150,
        align: 'center',
        sortValue: (p: any) => p.estado || 'programada',
        render: (p: any) => {
          const estado = p.estado || 'programada';
          const variant = STATUS_VARIANT[estado] || 'default';
          const label = STATUS_LABEL[estado] || estado;
          return <AppBadge label={label} variant={variant} size="sm" />;
        },
      },
      {
        // Acciones contextuales de la cita en escritorio (issue #5).
        key: 'acciones', header: 'Acciones', width: 230, interactive: true,
        render: (p: any) => {
          const estado = p.estado || 'programada';
          if (estado === 'solicitud_reprogramacion') {
            return (
              <View style={styles.rowActions}>
                <TouchableOpacity style={[styles.rowActionBtn, styles.rowActionPrimary]} disabled={isResolving} onPress={() => resolverReprogramacion(p, true)} accessibilityRole="button" accessibilityLabel={`Aprobar reprogramación de ${patientNameOf(p)}`}>
                  <Text style={styles.rowActionPrimaryText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rowActionBtn, styles.rowActionGhost]} disabled={isResolving} onPress={() => resolverReprogramacion(p, false)} accessibilityRole="button" accessibilityLabel={`Rechazar reprogramación de ${patientNameOf(p)}`}>
                  <Text style={styles.rowActionGhostText}>Rechazar</Text>
                </TouchableOpacity>
              </View>
            );
          }
          if (estado === 'programada' || estado === 'confirmada') {
            return (
              <View style={styles.rowActions}>
                <TouchableOpacity style={[styles.rowActionBtn, styles.rowActionPrimary]} onPress={() => atenderCita(p)} accessibilityRole="button" accessibilityLabel={`Atender cita de ${patientNameOf(p)}`}>
                  <Text style={styles.rowActionPrimaryText}>Atender</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rowActionBtn, styles.rowActionGhost]} onPress={() => marcarNoAsistio(p)} accessibilityRole="button" accessibilityLabel={`Marcar que ${patientNameOf(p)} no asistió`}>
                  <Text style={styles.rowActionGhostText}>No asistió</Text>
                </TouchableOpacity>
              </View>
            );
          }
          return <Text style={{ ...typography.caption, color: commonColors.textTertiary }}>—</Text>;
        },
      },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: commonColors.background }}>
        <ScreenLayout
          role="obstetra"
          title="Cronograma"
          subtitle="Agenda de citas"
          width="full"
          accentColor={BRAND}
          scroll={false}
          error={isError}
          onRetry={() => refetch()}
          errorTitle="No se pudo cargar la agenda"
          errorMessage="Revisa tu conexión y vuelve a intentar."
        >
          <View style={styles.webToolbar}>
            <View style={styles.webSearchBox}>
              <Search size={18} color={commonColors.textTertiary} />
              <TextInput style={styles.webSearchInput} value={searchInput} onChangeText={setSearchInput} placeholder="Buscar paciente por nombre o DNI..." placeholderTextColor={commonColors.textTertiary} />
            </View>
            <View style={styles.webFilterRow}>
              {SEGMENTS.map((s) => (
                <TouchableOpacity key={s.key} style={[styles.webChip, scope === s.key && styles.webChipActive]} onPress={() => setScope(s.key)}>
                  <Text style={[styles.webChipText, scope === s.key && styles.webChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.webCreateBtn} onPress={() => setModalVisible(true)} activeOpacity={0.85}>
              <Plus size={18} color={commonColors.white} />
              <Text style={styles.webCreateText}>Nueva cita</Text>
            </TouchableOpacity>
          </View>

          <DataTable
            columns={columns}
            data={appointments as any[]}
            keyExtractor={(p: any) => p.id}
            loading={isLoading}
            onRowPress={(p: any) => p.gestante?.id && router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: p.gestante.id } } as any)}
            rowLabel={(p: any) => `Abrir ficha de ${p.gestante?.user?.firstName || 'gestante'} ${p.gestante?.user?.lastName || ''}`.trim()}
            emptyIcon={Clock as any}
            emptyTitle="Sin citas"
            emptyMessage={search ? 'No hay resultados para tu búsqueda.' : 'No hay citas para este filtro.'}
            emptyAccent={BRAND}
          />
          <NuevaCitaModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        </ScreenLayout>
      </View>
    );
  }

  return (
    <ScreenLayout
      role="obstetra"
      title="Cronograma"
      subtitle="Agenda de citas"
      width="full"
      accentColor={BRAND}
      scroll={false}
      error={isError}
      onRetry={() => refetch()}
      errorTitle="No se pudo cargar la agenda"
      errorMessage="Revisa tu conexión y vuelve a intentar."
      actions={<NotificationBell href="/(obstetra)/notificaciones" color={commonColors.white} />}
    >
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
  listWeb: { width: '100%', paddingBottom: spacing.xl },

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

  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md, flexWrap: 'wrap' },
  webSearchBox: { flex: 1, minWidth: 220, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, height: 44 },
  webSearchInput: { flex: 1, ...typography.body, fontSize: 15, color: commonColors.text, outlineStyle: 'none' } as any,
  webFilterRow: { flexDirection: 'row', gap: spacing.sm },
  webChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.full, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  webChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  webChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  webChipTextActive: { color: commonColors.white },
  webCreateBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: BRAND, borderRadius: borderRadius.lg, paddingHorizontal: spacing.lg, height: 44 },
  webCreateText: { ...typography.button, color: commonColors.white, fontSize: 14 },
  // Acciones por fila en la tabla web (issue #5)
  rowActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  rowActionBtn: { paddingHorizontal: spacing.sm2, paddingVertical: 6, borderRadius: borderRadius.md },
  rowActionPrimary: { backgroundColor: BRAND },
  rowActionPrimaryText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  rowActionGhost: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  rowActionGhostText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
});
