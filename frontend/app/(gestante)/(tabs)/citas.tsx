import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { AppModal, AppButton, useToast, ToggleTabs, ListSkeleton } from '../../../src/components/ui';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { DataTable } from '../../../src/components/web';
import { useFocusEffect } from 'expo-router';
import {
  Calendar, CheckCircle2, Flag, XCircle, Hourglass, Clock, Info,
  ChevronRight, CalendarX, User, FileText, type LucideIcon,
} from 'lucide-react-native';
import {
  format,
  addDays,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useConfirmAppointment,
  useRequestReschedule,
  useAppointmentAvailability,
  useGestanteAppointments,
} from '../../../src/services/api-queries';
import { useAppointmentRealtime } from '../../../src/hooks/useAppointmentRealtime';
import {
  formatHora, formatFechaLarga, etiquetaRelativa, claveDia,
} from '../../../src/utils/datetime';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { zIndex } from '../../../src/theme/zIndex';
import { useResponsive } from '../../../src/theme/responsive';
import { confirmAction } from '../../../src/utils/confirm';

const BRAND = gestanteColors.primary;

/** Estructura normalizada desde el backend. */
interface Appointment {
  id: string;
  fecha: string; // YYYY-MM-DD (date ISO)
  hora: string; // ISO time
  motivo: string;
  estado: string; // programada | confirmada | asistida | no_asistida | solicitud_reprogramacion | reprogramada | cancelada
  observaciones?: string | null;
  numeroControl?: number | null;
  obstetraNombre?: string | null;
  fechaReprogramada?: string | null;
  horaReprogramada?: string | null;
  motivoReprogramacion?: string | null;
}

/** Hora 'HH:mm' (UTC consistente) — usa la utilidad única de datetime. */
function horaTexto(horaIso?: string | null): string {
  return formatHora(horaIso);
}

/** Fecha larga en español — usa la utilidad única de datetime. */
function fechaLarga(fechaIso?: string | null): string {
  const f = formatFechaLarga(fechaIso);
  return f === '--' ? 'Fecha por definir' : f.charAt(0).toUpperCase() + f.slice(1);
}

const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; icon: LucideIcon }
> = {
  programada: { label: 'Programada', bg: semanticColors.infoLight, text: semanticColors.info, icon: Calendar },
  confirmada: { label: 'Confirmada', bg: semanticColors.successLight, text: semanticColors.success, icon: CheckCircle2 },
  asistida: { label: 'Asistida', bg: gestanteColors.primaryLight, text: gestanteColors.primary, icon: Flag },
  no_asistida: { label: 'No asististe', bg: semanticColors.dangerLight, text: semanticColors.danger, icon: XCircle },
  solicitud_reprogramacion: { label: 'Solicitud enviada', bg: semanticColors.warningLight, text: semanticColors.warning, icon: Hourglass },
  reprogramada: { label: 'Reprogramada', bg: semanticColors.warningLight, text: semanticColors.warning, icon: Clock },
  cancelada: { label: 'Cancelada', bg: semanticColors.dangerLight, text: semanticColors.danger, icon: XCircle },
};

function statusMeta(estado: string) {
  return STATUS_META[estado] || { label: estado, bg: commonColors.surfaceAlt, text: commonColors.textSecondary, icon: Info };
}

export default function AppointmentsScreen() {
  const toast = useToast();
  const { webShell, select } = useResponsive();
  const citasTourTarget = useTourTarget(TOUR_TARGETS.gestanteCitas);
  // Ancho máximo del cuerpo en web, escalado por breakpoint (igual que el header
  // de ScreenLayout width="wide"): así el contenido acompaña al ancho disponible
  // en vez de quedar fijo a 1024 centrado.
  const webBodyMax = select({ base: 9999, lg: webLayout.contentMaxWidth.lg, xl: webLayout.contentMaxWidth.xl, xxl: webLayout.contentMaxWidth.xxl });
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');

  // Datos vía React Query + actualización en tiempo real (Fase 2).
  useAppointmentRealtime();
  const { data: rawAppointments = [], isLoading: loading, isError, refetch, isRefetching: refreshing } = useGestanteAppointments();

  // Modales
  const [detailVisible, setDetailVisible] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [selected, setSelected] = useState<Appointment | null>(null);

  // Selección de reprogramación
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const [pickedTime, setPickedTime] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');

  const confirmMutation = useConfirmAppointment();
  const rescheduleMutation = useRequestReschedule();
  const { data: slots = [], isLoading: slotsLoading } = useAppointmentAvailability(pickedDate);

  // Normaliza la respuesta cruda del backend a la forma de la pantalla.
  const appointments: Appointment[] = useMemo(
    () =>
      (rawAppointments as any[]).map((a) => ({
        id: a.id,
        fecha: a.fecha,
        hora: a.hora,
        motivo: a.motivo || 'Control prenatal',
        estado: a.estado || 'programada',
        observaciones: a.observaciones,
        numeroControl: a.numeroControl,
        obstetraNombre: a.obstetra?.user
          ? `Obst. ${a.obstetra.user.firstName} ${a.obstetra.user.lastName}`
          : null,
        fechaReprogramada: a.fechaReprogramada,
        horaReprogramada: a.horaReprogramada,
        motivoReprogramacion: a.motivoReprogramacion,
      })),
    [rawAppointments],
  );

  // Refresca al enfocar la pantalla.
  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const onRefresh = () => {
    refetch();
  };

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()),
    [appointments]
  );

  // Próximas: ascendente (la más cercana primero).
  const upcoming = useMemo(
    () => sorted.filter((a) => ['programada', 'confirmada', 'reprogramada', 'solicitud_reprogramacion'].includes(a.estado)),
    [sorted]
  );
  // Historial: descendente (la más reciente primero, no hay que scrollear al final).
  const history = useMemo(
    () => sorted
      .filter((a) => ['asistida', 'cancelada', 'no_asistida'].includes(a.estado))
      .slice()
      .reverse(),
    [sorted]
  );

  const displayed = activeTab === 'upcoming' ? upcoming : history;

  // Agrupar por día (encabezados de sección) respetando el orden ya calculado.
  const sections = useMemo(() => {
    const groups: { key: string; title: string; subtitle: string; data: Appointment[] }[] = [];
    const index: Record<string, number> = {};
    for (const a of displayed) {
      const k = claveDia(a.fecha);
      if (index[k] === undefined) {
        index[k] = groups.length;
        groups.push({ key: k, title: etiquetaRelativa(a.fecha), subtitle: fechaLarga(a.fecha), data: [] });
      }
      groups[index[k]].data.push(a);
    }
    return groups;
  }, [displayed]);

  // El id de la cita "siguiente" (primera próxima) para destacarla.
  const nextId = activeTab === 'upcoming' ? upcoming[0]?.id : null;

  // Progreso de controles prenatales (meta MINSA: 8 controles).
  const META_CONTROLES = 8;
  const completados = useMemo(
    () => appointments.filter((a) => a.estado === 'asistida').length,
    [appointments],
  );

  // ── Acciones ──
  const openDetail = (appt: Appointment) => {
    setSelected(appt);
    setDetailVisible(true);
  };

  const handleConfirm = async (appt: Appointment) => {
    // Confirmación previa por seguridad, con el contexto de la cita a la vista.
    const ok = await confirmAction({
      title: 'Confirmar que asistirás',
      message:
        `Confirmas tu cita de ${appt.motivo || 'Control Prenatal'} el ${fechaLarga(appt.fecha)}` +
        ` a las ${horaTexto(appt.hora)}. Tu obstetra será notificada de que asistirás. ` +
        'Si no podrás ir, mejor solicita reprogramar.',
      confirmText: 'Sí, asistiré',
      cancelText: 'Cancelar',
      tone: 'info',
    });
    if (!ok) return;
    confirmMutation.mutate(appt.id, {
      onSuccess: () => {
        toast.success('Cita confirmada', 'Tu obstetra fue notificada de que asistirás.');
        setDetailVisible(false);
        refetch();
      },
      onError: () => toast.error('No se pudo confirmar', 'Inténtalo nuevamente.'),
    });
  };

  const openReschedule = (appt: Appointment) => {
    setSelected(appt);
    setPickedDate(null);
    setPickedTime(null);
    setMotivo('');
    setDetailVisible(false);
    setRescheduleVisible(true);
  };

  const handleSendReschedule = () => {
    if (!selected || !pickedDate || !pickedTime) {
      toast.warning('Faltan datos', 'Selecciona una fecha y un horario disponible.');
      return;
    }
    if (motivo.trim().length < 5) {
      toast.warning('Motivo muy corto', 'Cuéntale a tu obstetra por qué necesitas reprogramar.');
      return;
    }
    rescheduleMutation.mutate(
      { id: selected.id, fecha: pickedDate, hora: pickedTime, motivoReprogramacion: motivo.trim() },
      {
        onSuccess: () => {
          toast.success('Solicitud enviada', 'Tu obstetra debe aprobar la reprogramación. Te avisaremos.');
          setRescheduleVisible(false);
          refetch();
        },
        onError: (e: any) => {
          const msg = e?.response?.data?.error?.message || 'Inténtalo nuevamente.';
          toast.error('No se pudo enviar', msg);
        },
      }
    );
  };

  // Próximos 21 días para elegir fecha
  const dateOptions = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 21 }, (_, i) => {
      const d = addDays(today, i + 1);
      return {
        value: format(d, 'yyyy-MM-dd'),
        dow: format(d, 'EEE', { locale: es }),
        day: format(d, 'd'),
        month: format(d, 'MMM', { locale: es }),
      };
    });
  }, []);

  const renderCard = ({ item }: { item: Appointment }) => {
    const isNext = activeTab === 'upcoming' && item.id === nextId;
    const meta = statusMeta(item.estado);

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => openDetail(item)}>
        <View style={[styles.card, isNext && styles.cardNext]}>
          {isNext && (
            <View style={styles.nextBadge}>
              <Text style={styles.nextBadgeText}>Siguiente control</Text>
            </View>
          )}

          <View style={styles.cardRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeBoxText}>{horaTexto(item.hora)}</Text>
            </View>

            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>{item.motivo}</Text>
              {item.obstetraNombre ? (
                <View style={styles.metaRow}>
                  <User size={13} color={commonColors.textSecondary} />
                  <Text style={styles.metaText} numberOfLines={1}>{item.obstetraNombre}</Text>
                </View>
              ) : null}
              {item.observaciones ? (
                <View style={[styles.metaRow, { marginTop: 2 }]}>
                  <Info size={13} color={commonColors.textSecondary} style={{ flexShrink: 0 }} />
                  <Text style={[styles.metaText, { color: commonColors.textSecondary }]} numberOfLines={2}>{item.observaciones}</Text>
                </View>
              ) : null}
              <View style={styles.badgeRow}>
                <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                  {React.createElement(meta.icon, { size: 12, color: meta.text })}
                  <Text style={[styles.statusText, { color: meta.text }]}>{meta.label}</Text>
                </View>
              </View>
            </View>

            <ChevronRight size={20} color={commonColors.textTertiary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <CalendarX size={56} color={commonColors.textTertiary} />
      <Text style={styles.emptyTitle}>
        {activeTab === 'upcoming' ? 'No tienes citas próximas' : 'Sin historial de citas'}
      </Text>
      <Text style={styles.emptyText}>
        {activeTab === 'upcoming'
          ? 'Tus controles prenatales aparecerán aquí cuando tu obstetra los programe.'
          : 'Aún no has completado ningún control prenatal.'}
      </Text>
    </View>
  );

  const selMeta = selected ? statusMeta(selected.estado) : null;
  const canAct = selected && selected.estado === 'programada';
  const canRescheduleFromConfirmed = selected && (selected.estado === 'programada' || selected.estado === 'confirmada');

  const ProgressHeader = activeTab === 'upcoming' ? (
    <View ref={citasTourTarget} collapsable={false} style={styles.progressCard}>
      <View style={styles.progressHeaderRow}>
        <Text style={styles.progressTitle}>Controles prenatales</Text>
        <Text style={styles.progressCount}>{completados} de {META_CONTROLES}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(100, (completados / META_CONTROLES) * 100)}%` }]} />
      </View>
      <Text style={styles.progressHint}>
        {completados >= META_CONTROLES
          ? '¡Completaste tus controles MINSA! Sigue las indicaciones de tu obstetra.'
          : `Te faltan ${META_CONTROLES - completados} control${META_CONTROLES - completados > 1 ? 'es' : ''} para cumplir la meta MINSA.`}
      </Text>
    </View>
  ) : null;

  if (webShell) {
    const columns: any[] = [
      {
        key: 'fecha', header: 'Fecha y Hora', width: 150,
        sortValue: (p: Appointment) => p.fecha,
        render: (p: Appointment) => (
          <View>
            <Text style={{ ...typography.bodySm, fontWeight: '600', color: commonColors.text }}>{fechaLarga(p.fecha)}</Text>
            <Text style={{ ...typography.caption, color: commonColors.textSecondary }}>{horaTexto(p.hora)}</Text>
          </View>
        ),
      },
      {
        key: 'motivo', header: 'Cita', flex: 2,
        sortValue: (p: Appointment) => p.motivo,
        render: (p: Appointment) => (
          <View>
            <Text style={{ ...typography.bodySm, fontWeight: '600', color: commonColors.text }} numberOfLines={1}>{p.motivo}</Text>
            {p.obstetraNombre && <Text style={{ ...typography.caption, color: commonColors.textSecondary }} numberOfLines={1}>{p.obstetraNombre}</Text>}
          </View>
        ),
      },
      {
        key: 'estado', header: 'Estado', width: 150,
        align: 'center',
        sortValue: (p: Appointment) => p.estado || 'programada',
        render: (p: Appointment) => {
          const meta = statusMeta(p.estado);
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: meta.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'center', gap: 4 }}>
              {React.createElement(meta.icon, { size: 12, color: meta.text })}
              <Text style={{ ...typography.caption, color: meta.text, fontWeight: '600' }}>{meta.label}</Text>
            </View>
          );
        },
      },
      {
        key: 'acciones', header: '', width: 100, align: 'right',
        render: (p: Appointment) => (
          <TouchableOpacity
            style={{ backgroundColor: commonColors.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full, cursor: 'pointer' } as any}
            onPress={() => openDetail(p)}
          >
            <Text style={{ ...typography.caption, fontWeight: '600', color: BRAND }}>Ver</Text>
          </TouchableOpacity>
        ),
      },
    ];

    return (
      <View style={{ flex: 1, backgroundColor: commonColors.background }}>
        <ScreenLayout
          role="gestante"
          title="Mis Citas"
          subtitle="Control de tu embarazo"
          accentColor={BRAND}
          loading={loading && !refreshing}
          error={isError}
          onRetry={() => refetch()}
          errorTitle="No se pudieron cargar tus citas"
          errorMessage="Revisa tu conexión y vuelve a intentar."
          scroll={false}
        >
          <View style={styles.webToolbar}>
            <View style={styles.webFilterRow}>
              <TouchableOpacity style={[styles.webChip, activeTab === 'upcoming' && styles.webChipActive]} onPress={() => setActiveTab('upcoming')}>
                <Text style={[styles.webChipText, activeTab === 'upcoming' && styles.webChipTextActive]}>Próximas ({upcoming.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.webChip, activeTab === 'history' && styles.webChipActive]} onPress={() => setActiveTab('history')}>
                <Text style={[styles.webChipText, activeTab === 'history' && styles.webChipTextActive]}>Historial ({history.length})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {ProgressHeader}

          <DataTable
            columns={columns}
            data={displayed as any[]}
            keyExtractor={(p: Appointment) => p.id}
            loading={loading && !refreshing}
            onRowPress={(p: Appointment) => openDetail(p)}
            rowLabel={(p: Appointment) => `Ver detalle de la cita: ${p.motivo || 'control prenatal'}`}
            emptyIcon={CalendarX as any}
            emptyTitle="Sin citas"
            emptyMessage={activeTab === 'upcoming' ? 'No tienes próximas citas programadas.' : 'No tienes un historial de citas.'}
            emptyAccent={BRAND}
          />

          <AppModal visible={detailVisible} onClose={() => setDetailVisible(false)} title="Detalle de la cita" subtitle={selected ? selected.motivo : undefined} footer={
            canAct ? (
              <>
                <AppButton title="Reprogramar" variant="outline" onPress={() => selected && openReschedule(selected)} style={{ flex: 1 }} />
                <AppButton title="Confirmar" onPress={() => selected && handleConfirm(selected)} loading={confirmMutation.isPending} themeColor={BRAND} style={{ flex: 1 }} />
              </>
            ) : canRescheduleFromConfirmed ? (
              <AppButton title="Solicitar reprogramación" variant="outline" onPress={() => selected && openReschedule(selected)} style={{ flex: 1 }} />
            ) : (
              <AppButton title="Cerrar" variant="outline" onPress={() => setDetailVisible(false)} style={{ flex: 1 }} />
            )
          }>
            {selected && selMeta && (
              <View>
                <View style={[styles.detailStatus, { backgroundColor: selMeta.bg }]}>
                  {React.createElement(selMeta.icon, { size: 16, color: selMeta.text })}
                  <Text style={[styles.detailStatusText, { color: selMeta.text }]}>{selMeta.label}</Text>
                </View>

                <DetailRow icon={Calendar} label="Fecha" value={fechaLarga(selected.fecha)} />
                <DetailRow icon={Clock} label="Hora" value={horaTexto(selected.hora)} />
                {selected.obstetraNombre ? <DetailRow icon={User} label="Profesional" value={selected.obstetraNombre} /> : null}
                {selected.numeroControl ? <DetailRow icon={FileText} label="N.º de control" value={`Control ${selected.numeroControl}`} /> : null}
                <DetailRow icon={Info} label="Indicaciones" value={selected.observaciones || 'Ninguna indicación especial'} />

                {selected.estado === 'solicitud_reprogramacion' && (
                  <View style={styles.pendingBox}>
                    <Text style={styles.pendingTitle}>Solicitud de reprogramación pendiente</Text>
                    <Text style={styles.pendingText}>Propuesta: {fechaLarga(selected.fechaReprogramada)} a las {horaTexto(selected.horaReprogramada)}.</Text>
                    {selected.motivoReprogramacion ? <Text style={styles.pendingText}>Motivo: {selected.motivoReprogramacion}</Text> : null}
                    <Text style={styles.pendingHint}>Tu obstetra debe aprobarla. Te notificaremos.</Text>
                  </View>
                )}
              </View>
            )}
          </AppModal>

          <AppModal visible={rescheduleVisible} onClose={() => setRescheduleVisible(false)} title="Solicitar reprogramación" subtitle="Elige una nueva fecha y un horario disponible." footer={
            <>
              <AppButton title="Cancelar" variant="outline" onPress={() => setRescheduleVisible(false)} style={{ flex: 1 }} />
              <AppButton title="Enviar solicitud" onPress={handleSendReschedule} loading={rescheduleMutation.isPending} themeColor={BRAND} style={{ flex: 1 }} />
            </>
          }>
            <View>
              <Text style={styles.inputLabel}>Fecha deseada</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
                {dateOptions.map((opt) => {
                  const isActive = pickedDate === opt.value;
                  return (
                    <TouchableOpacity key={opt.value} style={[styles.dateChip, isActive && styles.dateChipActive]} onPress={() => { setPickedDate(opt.value); setPickedTime(null); }}>
                      <Text style={[styles.dateChipDow, isActive && styles.dateChipTextActive]}>{opt.dow.toUpperCase()}</Text>
                      <Text style={[styles.dateChipDay, isActive && styles.dateChipTextActive]}>{opt.day}</Text>
                      <Text style={[styles.dateChipMonth, isActive && styles.dateChipTextActive]}>{opt.month}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.inputLabel}>Horarios disponibles</Text>
              {!pickedDate ? (
                <Text style={styles.helperText}>Selecciona una fecha para ver horarios.</Text>
              ) : slotsLoading ? (
                <ActivityIndicator size="small" color={BRAND} style={{ marginTop: 10 }} />
              ) : slots.length === 0 ? (
                <Text style={styles.helperText}>No hay horarios disponibles para esta fecha.</Text>
              ) : (
                <View style={styles.slotsGrid}>
                  {slots.map((s: any) => {
                    const active = pickedTime === s.hora;
                    return (
                      <TouchableOpacity key={s.hora} disabled={!s.disponible} style={[styles.slotChip, !s.disponible && styles.slotChipDisabled, active && styles.slotChipActive]} onPress={() => setPickedTime(s.hora)}>
                        <Text style={[styles.slotText, !s.disponible && styles.slotTextDisabled, active && styles.slotTextActive]}>{s.hora}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
              <Text style={styles.inputLabel}>Motivo de la reprogramación</Text>
              <TextInput style={styles.modalInput} placeholder="Ej: Motivos laborales, problemas de salud..." placeholderTextColor={commonColors.textTertiary} value={motivo} onChangeText={setMotivo} multiline numberOfLines={3} />
            </View>
          </AppModal>
        </ScreenLayout>
      </View>
    );
  }

  return (
    <ScreenLayout
      role="gestante"
      title="Mis Citas"
      subtitle="Control de tu embarazo"
      accentColor={BRAND}
      loading={loading && !refreshing}
      error={isError}
      onRetry={() => refetch()}
      errorTitle="No se pudieron cargar tus citas"
      errorMessage="Revisa tu conexión y vuelve a intentar."
      scroll={false}
      width="wide"
      actions={<NotificationBell href="/(gestante)/notificaciones" color={commonColors.white} />}
    >
      <View style={[styles.tabContainer, webShell && styles.webCenter, webShell && { maxWidth: webBodyMax }]}>
        <ToggleTabs
          tabs={[
            { key: 'upcoming', label: 'Próximas', badge: upcoming.length },
            { key: 'history', label: 'Historial' },
          ]}
          value={activeTab}
          onChange={(k) => setActiveTab(k as 'upcoming' | 'history')}
          activeColor={BRAND}
        />
      </View>

      <SectionList
        sections={sections as any}
        keyExtractor={(item: any) => item.id}
        renderItem={renderCard as any}
        renderSectionHeader={({ section }: any) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
            <Text style={styles.sectionHeaderSub}>{section.subtitle}</Text>
          </View>
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.listContainer, webShell && styles.webCenter, webShell && { maxWidth: webBodyMax }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ProgressHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[BRAND]} tintColor={BRAND} />}
      />

      {/* ── Modal de detalle ── */}
      <AppModal
        visible={detailVisible}
        onClose={() => setDetailVisible(false)}
        title="Detalle de la cita"
        subtitle={selected ? selected.motivo : undefined}
        footer={
          canAct ? (
            <>
              <AppButton
                title="Reprogramar"
                variant="outline"
                onPress={() => selected && openReschedule(selected)}
                style={{ flex: 1 }}
              />
              <AppButton
                title="Confirmar"
                onPress={() => selected && handleConfirm(selected)}
                loading={confirmMutation.isPending}
                themeColor={BRAND}
                style={{ flex: 1 }}
              />
            </>
          ) : canRescheduleFromConfirmed ? (
            <AppButton
              title="Solicitar reprogramación"
              variant="outline"
              onPress={() => selected && openReschedule(selected)}
              style={{ flex: 1 }}
            />
          ) : (
            <AppButton title="Cerrar" variant="outline" onPress={() => setDetailVisible(false)} style={{ flex: 1 }} />
          )
        }
      >
        {selected && selMeta && (
          <View>
            <View style={[styles.detailStatus, { backgroundColor: selMeta.bg }]}>
              {React.createElement(selMeta.icon, { size: 16, color: selMeta.text })}
              <Text style={[styles.detailStatusText, { color: selMeta.text }]}>{selMeta.label}</Text>
            </View>

            <DetailRow icon={Calendar} label="Fecha" value={fechaLarga(selected.fecha)} />
            <DetailRow icon={Clock} label="Hora" value={horaTexto(selected.hora)} />
            {selected.obstetraNombre ? (
              <DetailRow icon={User} label="Profesional" value={selected.obstetraNombre} />
            ) : null}
            {selected.numeroControl ? (
              <DetailRow icon={FileText} label="N.º de control" value={`Control ${selected.numeroControl}`} />
            ) : null}
            {selected.observaciones ? (
              <DetailRow icon={Info} label="Indicaciones" value={selected.observaciones} />
            ) : null}

            {selected.estado === 'solicitud_reprogramacion' && (
              <View style={styles.pendingBox}>
                <Text style={styles.pendingTitle}>Solicitud de reprogramación pendiente</Text>
                <Text style={styles.pendingText}>
                  Propuesta: {fechaLarga(selected.fechaReprogramada)} a las {horaTexto(selected.horaReprogramada)}.
                </Text>
                {selected.motivoReprogramacion ? (
                  <Text style={styles.pendingText}>Motivo: {selected.motivoReprogramacion}</Text>
                ) : null}
                <Text style={styles.pendingHint}>Tu obstetra debe aprobarla. Te notificaremos.</Text>
              </View>
            )}
          </View>
        )}
      </AppModal>

      {/* ── Modal de reprogramación con selección inteligente ── */}
      <AppModal
        visible={rescheduleVisible}
        onClose={() => setRescheduleVisible(false)}
        title="Solicitar reprogramación"
        subtitle="Elige una nueva fecha y un horario disponible."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setRescheduleVisible(false)} style={{ flex: 1 }} />
            <AppButton
              title="Enviar solicitud"
              onPress={handleSendReschedule}
              loading={rescheduleMutation.isPending}
              themeColor={BRAND}
              style={{ flex: 1 }}
            />
          </>
        }
      >
        <Text style={styles.inputLabel}>Nueva fecha</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
          {dateOptions.map((d) => {
            const active = pickedDate === d.value;
            return (
              <TouchableOpacity
                key={d.value}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => {
                  setPickedDate(d.value);
                  setPickedTime(null);
                }}
              >
                <Text style={[styles.dateChipDow, active && styles.dateChipTextActive]}>{d.dow}</Text>
                <Text style={[styles.dateChipDay, active && styles.dateChipTextActive]}>{d.day}</Text>
                <Text style={[styles.dateChipMonth, active && styles.dateChipTextActive]}>{d.month}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.inputLabel}>Horario disponible</Text>
        {!pickedDate ? (
          <Text style={styles.helperText}>Primero selecciona una fecha.</Text>
        ) : slotsLoading ? (
          <ActivityIndicator color={BRAND} style={{ marginVertical: spacing.md }} />
        ) : (
          <View style={styles.slotsGrid}>
            {slots.filter((s: any) => s.disponible).length === 0 ? (
              <Text style={styles.helperText}>No hay horarios disponibles ese día. Prueba otra fecha.</Text>
            ) : (
              slots.map((s: any) => {
                const active = pickedTime === s.hora;
                return (
                  <TouchableOpacity
                    key={s.hora}
                    disabled={!s.disponible}
                    style={[
                      styles.slotChip,
                      !s.disponible && styles.slotChipDisabled,
                      active && styles.slotChipActive,
                    ]}
                    onPress={() => setPickedTime(s.hora)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        !s.disponible && styles.slotTextDisabled,
                        active && styles.slotTextActive,
                      ]}
                    >
                      {s.hora}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        <View style={styles.motivoLabelRow}>
          <Text style={styles.inputLabel}>Motivo</Text>
          <Text style={[styles.motivoCount, motivo.trim().length >= 5 ? styles.motivoCountOk : null]}>
            {motivo.trim().length < 5 ? `Mínimo 5 caracteres` : `${motivo.trim().length} caracteres`}
          </Text>
        </View>
        <TextInput
          style={[styles.modalInput, { height: 80 }]}
          placeholder="Cuéntale a tu obstetra por qué necesitas reprogramar"
          placeholderTextColor={commonColors.textTertiary}
          multiline
          maxLength={300}
          value={motivo}
          onChangeText={setMotivo}
        />
      </AppModal>
    </ScreenLayout>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <Icon size={16} color={BRAND} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 2 },
  headerSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft },
  tabContainer: { paddingBottom: spacing.sm },
  listContainer: { paddingBottom: layout.tabBarSpace },
  webCenter: { width: '100%', alignSelf: 'center' },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingVertical: spacing.sm, marginTop: spacing.xs },
  sectionHeaderText: { ...typography.label, fontWeight: '700', color: commonColors.text },
  sectionHeaderSub: { ...typography.caption, color: commonColors.textSecondary, textTransform: 'capitalize' },
  progressCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md2,
    marginBottom: spacing.sm + 4,
    ...shadows.card,
  },
  progressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  progressCount: { ...typography.label, color: BRAND, fontWeight: '700' },
  progressTrack: { height: 8, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: borderRadius.full, backgroundColor: BRAND },
  progressHint: { ...typography.caption, color: commonColors.textSecondary, marginTop: spacing.sm },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md2,
    marginBottom: spacing.sm + 4,
    ...shadows.card,
  },
  cardNext: { borderColor: BRAND, borderWidth: 1.5 },
  nextBadge: {
    position: 'absolute',
    top: -10,
    right: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    backgroundColor: BRAND,
    zIndex: zIndex.raised,
  },
  nextBadgeText: { ...typography.overline, color: commonColors.white, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  timeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    minWidth: 76,
  },
  timeBoxText: { ...typography.label, fontWeight: '700', color: BRAND },
  cardBody: { flex: 1, gap: 5 },
  cardTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...typography.caption, color: commonColors.textSecondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.md,
    marginTop: 2,
  },
  statusText: { ...typography.overline, letterSpacing: 0 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', marginTop: 2 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: spacing.lg },
  emptyTitle: { ...typography.h3, color: commonColors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  emptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center' },
  // Detalle
  detailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  detailStatusText: { ...typography.label },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: gestanteColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailLabel: { ...typography.caption, color: commonColors.textSecondary },
  detailValue: { ...typography.bodyMd, color: commonColors.text, textTransform: 'capitalize' },
  pendingBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: semanticColors.warningLight,
  },
  pendingTitle: { ...typography.label, color: semanticColors.warning, marginBottom: 4 },
  pendingText: { ...typography.bodySm, color: commonColors.textSecondary },
  pendingHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: 6, fontStyle: 'italic' },
  // Reprogramación
  inputLabel: { ...typography.label, color: commonColors.textSecondary, marginBottom: spacing.sm, marginTop: spacing.md },
  motivoLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  motivoCount: { ...typography.caption, color: commonColors.textTertiary, marginBottom: spacing.sm, marginTop: spacing.md },
  motivoCountOk: { color: semanticColors.success },
  helperText: { ...typography.bodySm, color: commonColors.textTertiary, paddingVertical: spacing.sm },
  dateScroll: { flexDirection: 'row' },
  dateChip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    marginRight: spacing.sm,
    minWidth: 56,
  },
  dateChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  dateChipDow: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipDay: { ...typography.h3, color: commonColors.text },
  dateChipMonth: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase' },
  dateChipTextActive: { color: commonColors.white },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  slotChipActive: { backgroundColor: BRAND, borderColor: BRAND },
  slotChipDisabled: { opacity: 0.4 },
  slotText: { ...typography.bodySm, color: commonColors.text },
  slotTextActive: { color: commonColors.white, fontWeight: '700' },
  slotTextDisabled: { color: commonColors.textTertiary, textDecorationLine: 'line-through' },
  modalInput: {
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    ...typography.bodySm,
    fontSize: 15,
    color: commonColors.text,
    backgroundColor: commonColors.background,
    textAlignVertical: 'top',
  },

  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  webFilterRow: { flexDirection: 'row', gap: spacing.xs, backgroundColor: commonColors.surfaceAlt, padding: 4, borderRadius: borderRadius.full },
  webChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.full },
  webChipActive: { backgroundColor: BRAND },
  webChipText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  webChipTextActive: { color: commonColors.white },
});
