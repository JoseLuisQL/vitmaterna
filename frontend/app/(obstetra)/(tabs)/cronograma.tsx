import React, { useState } from 'react';
import { View, StyleSheet, Text, RefreshControl, TouchableOpacity, StatusBar } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, ChevronRight as ChevronRightSmall, Plus, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { confirmAction } from '../../../src/utils/confirm';
import { useToast } from '../../../src/components/ui';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows, coloredGlow } from '../../../src/theme/shadows';
import {
  useAppointments,
  useUpdateAppointmentStatus,
  useResolveReschedule,
  useConvertToHomeVisit,
} from '../../../src/services/api-queries';
import { NuevaCitaModal } from '../../../src/components/obstetra/NuevaCitaModal';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';

const BRAND = obstetraColors.primary;

export default function CronogramaScreen(): React.ReactElement {
  const router = useRouter();
  const [filterMode, setFilterMode] = useState<'todas' | 'hoy' | 'proximas'>('hoy');
  const [modalVisible, setModalVisible] = useState(false);

  const toast = useToast();
  const { data: allAppointments, isLoading, refetch, isRefetching } = useAppointments();
  const { mutate: updateStatus } = useUpdateAppointmentStatus();
  const { mutate: resolveReschedule, isPending: isResolving } = useResolveReschedule();
  const { mutate: convertToHome } = useConvertToHomeVisit();

  // Filter Logic natively matching backend returned data
  const processedAppointments = React.useMemo(() => {
    if (!allAppointments) return [];
    const todayStr = new Date().toISOString().split('T')[0];

    return allAppointments.filter((app: any) => {
      const appDateStr = new Date(app.date).toISOString().split('T')[0];

      switch (filterMode) {
        case 'hoy':
          return appDateStr === todayStr;
        case 'proximas':
          return appDateStr >= todayStr && (app.status === 'programada' || app.status === 'confirmada' || app.status === 'reprogramada' || app.status === 'solicitud_reprogramacion');
        case 'todas':
        default:
          return true;
      }
    }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [allAppointments, filterMode]);

  // Conteos por filtro para mostrarlos en las pestañas.
  const counts = React.useMemo(() => {
    const list = allAppointments || [];
    const todayStr = new Date().toISOString().split('T')[0];
    const activos = ['programada', 'confirmada', 'reprogramada', 'solicitud_reprogramacion'];
    return {
      todas: list.length,
      hoy: list.filter((a: any) => new Date(a.date).toISOString().split('T')[0] === todayStr).length,
      proximas: list.filter((a: any) => {
        const ds = new Date(a.date).toISOString().split('T')[0];
        return ds >= todayStr && activos.includes(a.status);
      }).length,
    };
  }, [allAppointments]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={obstetraColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Cronograma</Text>
              <Text style={styles.headerSubtitle}>Gestión de citas y pacientes</Text>
            </View>
            <NotificationBell href="/(obstetra)/notificaciones" color={commonColors.white} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.tabsWrapper}>
        {([
          { key: 'hoy', label: 'Hoy', count: counts.hoy },
          { key: 'proximas', label: 'Próximas', count: counts.proximas },
          { key: 'todas', label: 'Todas', count: counts.todas },
        ] as const).map((t) => {
          const active = filterMode === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabButton, active && styles.tabButtonActive]}
              onPress={() => setFilterMode(t.key)}
              accessibilityRole="button"
              accessibilityLabel={`${t.label}, ${t.count} citas`}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
              <View style={[styles.tabCount, active && styles.tabCountActive]}>
                <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{t.count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    // Map status from API to variant
    const statusMap: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
      'programada': 'warning',
      'confirmada': 'success',
      'asistida': 'success',
      'solicitud_reprogramacion': 'warning',
      'reprogramada': 'warning',
      'no_asistida': 'danger',
      'cancelada': 'danger'
    };
    const variant = statusMap[item.status] || 'default';

    const labelMap: Record<string, string> = {
      'programada': 'Programada',
      'confirmada': 'Confirmada',
      'asistida': 'Asistida',
      'solicitud_reprogramacion': 'Solicita reprogramar',
      'reprogramada': 'Reprogramada',
      'no_asistida': 'No Asistió',
      'cancelada': 'Cancelada'
    };
    const statusText = labelMap[item.status] || 'Desconocido';

    const handleStatusUpdate = (id: string, newStatus: 'asistida' | 'no_asistida') => {
      updateStatus({ id, status: newStatus });
    };

    // "No asistió" pide confirmación (es una acción que afecta la adherencia).
    const handleNoAsistio = async () => {
      const ok = await confirmAction({
        title: 'Marcar como no asistió',
        message: `¿Confirmas que ${item.patientName || 'la paciente'} no asistió a su cita?`,
        confirmText: 'Sí, no asistió',
        destructive: true,
      });
      if (!ok) return;
      handleStatusUpdate(item.id, 'no_asistida');
    };

    // "Atender" abre el flujo encadenado de registro clínico de la cita.
    const handleAtender = () => {
      router.push({
        pathname: '/(obstetra)/atender/[appointmentId]',
        params: { appointmentId: item.id, gestanteId: item.gestanteId || '', patientName: item.patientName || '' },
      } as any);
    };

    const isRescheduleRequest = item.status === 'solicitud_reprogramacion';
    const showActions = item.status === 'programada' || item.status === 'confirmada';
    const esDomiciliaria = item.modalidad === 'domiciliaria';

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

    const fmtHora = (iso?: string | null) => {
      if (!iso) return '--:--';
      const d = new Date(iso);
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    };
    const fmtFecha = (iso?: string | null) => {
      if (!iso) return '--';
      const d = new Date(iso);
      return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
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
      <View style={[styles.appointmentCard, isRescheduleRequest && styles.appointmentCardAlert]}>
        <View style={styles.timeLine}>
          <Text style={styles.timeText}>
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[0]}
          </Text>
          <Text style={styles.timeAmPm}>
            {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).split(' ')[1] || ''}
          </Text>
        </View>

        <View style={styles.appointmentContent}>
          <TouchableOpacity
            activeOpacity={item.gestanteId ? 0.6 : 1}
            disabled={!item.gestanteId}
            onPress={() => item.gestanteId && router.push({ pathname: '/(obstetra)/gestante/[id]', params: { id: item.gestanteId } } as any)}
            accessibilityRole="button"
            accessibilityLabel={`Abrir historia de ${item.patientName || 'la paciente'}`}
            accessibilityHint="Abre la ficha clínica de la gestante"
          >
            <View style={styles.appointmentHeaderRow}>
              <Text style={styles.patientName} numberOfLines={1}>{item.patientName || 'Paciente'}</Text>
              {!showActions && <AppBadge label={statusText} variant={variant} />}
            </View>
            <Text style={styles.appointmentType}>{item.type || 'Control Prenatal'}</Text>
            <View style={styles.infoRow}>
              {esDomiciliaria ? <Home size={12} color={BRAND} /> : <MapPin size={12} color={commonColors.textTertiary} />}
              <Text style={[styles.infoText, esDomiciliaria && { color: BRAND, fontWeight: '700' }]}>
                {esDomiciliaria ? 'Visita domiciliaria' : (item.location || 'Consultorio 102')}
              </Text>
            </View>
          </TouchableOpacity>

          {isRescheduleRequest && (
            <View style={styles.rescheduleBox}>
              <Text style={styles.rescheduleTitle}>
                Propone: {fmtFecha(item.fechaReprogramada)} · {fmtHora(item.horaReprogramada)}
              </Text>
              {item.motivoReprogramacion ? (
                <Text style={styles.rescheduleMotivo}>Motivo: {item.motivoReprogramacion}</Text>
              ) : null}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.btnAsistio]}
                  disabled={isResolving}
                  onPress={() => handleResolve(true)}
                >
                  <Text style={styles.btnAsistioText}>Aprobar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.btnNoAsistio]}
                  disabled={isResolving}
                  onPress={() => handleResolve(false)}
                >
                  <Text style={styles.btnNoAsistioText}>Rechazar</Text>
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
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.btnAsistio]}
                onPress={handleAtender}
                accessibilityRole="button"
                accessibilityLabel={`Atender a ${item.patientName || 'la paciente'}`}
                accessibilityHint="Abre el registro clínico de la cita: control, laboratorios, tamizajes y tratamiento"
              >
                <Text style={styles.btnAsistioText}>Atender</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.btnNoAsistio]}
                onPress={handleNoAsistio}
              >
                <Text style={styles.btnNoAsistioText}>No asistió</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
      {isLoading ? (
        <ListSkeleton count={5} />
      ) : (
        <EmptyState
          icon={CalendarIcon as any}
          title="Sin citas programadas"
          description="No tienes citas agendadas para este día."
          themeColor={BRAND}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header fuera del FlashList: evita problemas de nodos de texto/whitespace
          en web cuando el ListHeaderComponent contiene StatusBar/elementos que
          renderizan null. */}
      {renderHeader()}
      <FlashList
        data={processedAppointments}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Plus size={28} color={obstetraColors.onPrimary} />
      </TouchableOpacity>

      <NuevaCitaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerContainer: { marginBottom: spacing.sm2 },
  headerWrapper: {
    paddingBottom: spacing.xl,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)' },
  tabsWrapper: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    gap: spacing.sm2,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
    ...shadows.card,
  },
  tabButtonActive: {
    backgroundColor: BRAND,
  },
  tabText: {
    ...typography.label,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  tabTextActive: {
    color: obstetraColors.onPrimary,
  },
  tabCount: {
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center',
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { ...typography.overline, letterSpacing: 0, color: commonColors.textSecondary, fontWeight: '700' },
  tabCountTextActive: { color: commonColors.white },
  listContent: { paddingBottom: layout.tabBarSpace },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  timeLine: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 16,
    borderRightWidth: 1,
    borderRightColor: commonColors.borderLight,
    minWidth: 70,
  },
  timeText: { ...typography.h3, color: BRAND },
  timeAmPm: { ...typography.overline, color: commonColors.textTertiary, marginTop: 2 },
  appointmentCardAlert: { borderColor: semanticColors.warning, borderWidth: 1.5 },
  rescheduleBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: semanticColors.warningLight,
  },
  convertBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: BRAND, backgroundColor: obstetraColors.primaryLight },
  convertBtnText: { ...typography.caption, color: BRAND, fontWeight: '700' },
  rescheduleTitle: { ...typography.caption, fontFamily: typography.label.fontFamily, fontWeight: '700', color: semanticColors.warning },
  rescheduleMotivo: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  appointmentContent: { flex: 1, paddingLeft: 16, justifyContent: 'center' },
  appointmentHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  patientName: { ...typography.bodyMedium, color: commonColors.text, flex: 1, marginRight: 8 },
  appointmentType: { ...typography.bodySmall, color: commonColors.textSecondary },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginBottom: 4 },
  infoText: { ...typography.caption, color: commonColors.textTertiary },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  btnAsistio: {
    backgroundColor: semanticColors.successLight,
    borderWidth: 1,
    borderColor: semanticColors.success,
  },
  btnAsistioText: {
    color: semanticColors.success,
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
  },
  btnNoAsistio: {
    backgroundColor: semanticColors.dangerLight,
    borderWidth: 1,
    borderColor: semanticColors.danger,
  },
  btnNoAsistioText: {
    color: semanticColors.danger,
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...coloredGlow(BRAND),
    zIndex: 999,
  },
});
