/**
 * VITMATERNA — Bandeja de notificaciones in-app (reutilizable por rol).
 *
 * Muestra los avisos del usuario (confirmaciones, reprogramaciones,
 * recordatorios, alertas) con:
 *  - Filtro Todas / No leídas (con contador).
 *  - Agrupación por fecha (Hoy / Esta semana / Anteriores).
 *  - Tocar abre la pantalla relacionada y marca como leída.
 *  - "Marcar todo como leído" y pull-to-refresh.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, RefreshControl } from 'react-native';
import {
  CheckCircle2, Hourglass, Calendar, XCircle, AlertTriangle, AlertCircle,
  TrendingDown, Pill, Heart, FlaskConical, Bell, ChevronLeft, Siren, type LucideIcon,
  CheckCheck, Trash2, X, MessageCircle,
} from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  useClearNotifications,
  type AppNotification,
} from '../../services/api-queries';
import { confirmAction } from '../../utils/confirm';
import { useToast } from '../ui';
import { BellOff } from 'lucide-react-native';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { commonColors, semanticColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { useResponsive } from '../../theme/responsive';

import { ScreenLayout, type ScreenRole } from '../layout/ScreenLayout';

interface Props {
  role: ScreenRole;
  /** Color de acento del rol (gestante púrpura, obstetra azul). */
  themeColor?: string;
  /** Gradiente del rol para el header. */
  gradient?: readonly [string, string, ...string[]];
}

/** Tipos que representan una urgencia (realce especial). */
const URGENT_TYPES = new Set([
  'emergencia', 'signo_alarma', 'inasistencia',
  'obstetra_pendiente', 'alarma_sin_atender', 'canal_caido', 'solicitud_reprogramacion',
]);

/** Icono y color por tipo de notificación. */
function metaFor(tipo: string): { icon: LucideIcon; color: string; bg: string } {
  switch (tipo) {
    case 'emergencia':
      return { icon: Siren, color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'cita_confirmada':
      return { icon: CheckCircle2, color: semanticColors.success, bg: semanticColors.successLight };
    case 'solicitud_reprogramacion':
      return { icon: Hourglass, color: semanticColors.warning, bg: semanticColors.warningLight };
    case 'reprogramacion_aprobada':
      return { icon: Calendar, color: semanticColors.success, bg: semanticColors.successLight };
    case 'reprogramacion_rechazada':
      return { icon: XCircle, color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'signo_alarma':
      return { icon: AlertTriangle, color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'inasistencia':
      return { icon: AlertCircle, color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'baja_adherencia':
      return { icon: TrendingDown, color: semanticColors.warning, bg: semanticColors.warningLight };
    case 'recordatorio_suplemento':
      return { icon: Pill, color: semanticColors.info, bg: semanticColors.infoLight };
    case 'mensaje_chat':
      return { icon: MessageCircle, color: semanticColors.info, bg: semanticColors.infoLight };
    case 'fpp_proxima':
      return { icon: Heart, color: gestanteColors.primary, bg: gestanteColors.primaryLight };
    case 'examenes_pendientes':
    case 'resultado_laboratorio':
      return { icon: FlaskConical, color: semanticColors.info, bg: semanticColors.infoLight };
    case 'cita_domiciliaria':
    case 'visita_domiciliaria':
      return { icon: Calendar, color: gestanteColors.primary, bg: gestanteColors.primaryLight };
    case 'obstetra_pendiente':
      return { icon: AlertCircle, color: semanticColors.warning, bg: semanticColors.warningLight };
    case 'alarma_sin_atender':
      return { icon: Siren, color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'canal_caido':
      return { icon: AlertTriangle, color: semanticColors.warning, bg: semanticColors.warningLight };
    default:
      return { icon: Bell, color: commonColors.textSecondary, bg: commonColors.surfaceAlt };
  }
}

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Ahora';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `Hace ${d} d`;
  return new Date(iso).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}

/** Tipos "repetibles" que se colapsan cuando hay varios del mismo en una sección. */
const COLLAPSIBLE_TYPES = new Set(['recordatorio_suplemento', 'fpp_proxima', 'examenes_pendientes']);

/** Notificación mostrada; puede representar un grupo colapsado (groupCount > 1). */
type DisplayNotification = AppNotification & { groupCount?: number };

/**
 * Colapsa, dentro de una lista, los recordatorios repetidos del mismo tipo en una
 * sola entrada con contador (la más reciente representa el grupo). Reduce el ruido
 * de los recordatorios diarios sin perder los avisos accionables.
 */
function colapsar(items: AppNotification[]): DisplayNotification[] {
  const out: DisplayNotification[] = [];
  const groupIndex: Record<string, number> = {};
  for (const n of items) {
    if (COLLAPSIBLE_TYPES.has(n.tipo)) {
      const key = n.tipo;
      if (groupIndex[key] !== undefined) {
        out[groupIndex[key]].groupCount = (out[groupIndex[key]].groupCount ?? 1) + 1;
        continue;
      }
      groupIndex[key] = out.length;
      out.push({ ...n, groupCount: 1 });
    } else {
      out.push(n);
    }
  }
  return out;
}

/** Agrupa por antigüedad: Hoy / Esta semana / Anteriores (con colapso interno). */
function agrupar(items: AppNotification[]): { title: string; data: DisplayNotification[] }[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekAgo = startOfToday - 6 * 24 * 60 * 60 * 1000;

  const hoy: AppNotification[] = [];
  const semana: AppNotification[] = [];
  const antes: AppNotification[] = [];

  for (const n of items) {
    const t = new Date(n.createdAt).getTime();
    if (t >= startOfToday) hoy.push(n);
    else if (t >= weekAgo) semana.push(n);
    else antes.push(n);
  }

  return [
    { title: 'Hoy', data: colapsar(hoy) },
    { title: 'Esta semana', data: colapsar(semana) },
    { title: 'Anteriores', data: colapsar(antes) },
  ].filter((s) => s.data.length > 0);
}

type Filtro = 'todas' | 'no_leidas' | 'urgentes';

export function NotificationsScreen({ role, themeColor = commonColors.text, gradient }: Props): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const { data: items = [], isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const deleteOne = useDeleteNotification();
  const clearAll = useClearNotifications();
  const [filtro, setFiltro] = useState<Filtro>('todas');

  const handleDelete = (n: AppNotification) => {
    deleteOne.mutate(n.id);
  };

  const handleClear = async () => {
    if (items.length === 0) return;
    const leidas = items.filter((n) => n.leidaAt).length;
    const ok = await confirmAction({
      title: 'Limpiar notificaciones',
      message:
        leidas > 0 && leidas < items.length
          ? `¿Borrar las ${leidas} notificaciones leídas? Las no leídas se conservan.`
          : '¿Borrar todas las notificaciones? Esta acción no se puede deshacer.',
      confirmText: 'Borrar',
      destructive: true,
    });
    if (!ok) return;
    // Si hay leídas y no leídas, limpia solo leídas; si todas están leídas o
    // todas sin leer, borra todas.
    const soloLeidas = leidas > 0 && leidas < items.length;
    clearAll.mutate(soloLeidas, {
      onSuccess: () => toast.success('Bandeja limpia', soloLeidas ? 'Se borraron las leídas.' : 'Se borraron todas.'),
      onError: () => toast.error('No se pudo limpiar', 'Inténtalo nuevamente.'),
    });
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const unreadCount = useMemo(() => items.filter((n) => !n.leidaAt).length, [items]);
  const urgentCount = useMemo(() => items.filter((n) => n.prioridad === 'alta').length, [items]);

  const visibles = useMemo(() => {
    if (filtro === 'no_leidas') return items.filter((n) => !n.leidaAt);
    if (filtro === 'urgentes') return items.filter((n) => n.prioridad === 'alta');
    return items;
  }, [items, filtro]);
  const sections = useMemo(() => agrupar(visibles), [visibles]);

  const handlePress = (n: AppNotification) => {
    if (!n.leidaAt) markRead.mutate(n.id);

    const citaTipos = [
      'cita_confirmada',
      'solicitud_reprogramacion',
      'reprogramacion_aprobada',
      'reprogramacion_rechazada',
      'inasistencia',
    ];

    let target: string | null = null;
    if (n.tipo === 'emergencia' && role === 'obstetra') {
      target = '/(obstetra)/(tabs)/chat';
    } else if (citaTipos.includes(n.tipo)) {
      target = role === 'obstetra' ? '/(obstetra)/(tabs)/cronograma' : '/(gestante)/(tabs)/citas';
    } else if (n.tipo === 'signo_alarma' && role === 'obstetra') {
      // El signo de alarma se gestiona en la ficha de la gestante (sección
      // Signos de alarma). Si no hay gestanteId, cae a la lista de gestantes.
      const gid = (n.datos as { gestanteId?: string })?.gestanteId;
      target = gid ? `/(obstetra)/gestante/${gid}` : '/(obstetra)/(tabs)/gestantes';
    } else if (n.tipo === 'examenes_pendientes' && role === 'obstetra') {
      const gid = (n.datos as { gestanteId?: string })?.gestanteId;
      target = gid ? `/(obstetra)/gestante/${gid}` : '/(obstetra)/(tabs)/gestantes';
    } else if (n.tipo === 'mensaje_chat') {
      // Mensaje de chat → abrir la pantalla de chat del rol.
      target = role === 'obstetra' ? '/(obstetra)/(tabs)/chat' : '/(gestante)/(tabs)/chat';
    } else if (n.tipo === 'recordatorio_suplemento' && role === 'gestante') {
      target = '/(gestante)/(tabs)/tratamiento';
    } else if (n.tipo === 'fpp_proxima' && role === 'gestante') {
      target = '/(gestante)/(tabs)/tratamiento';
    } else if (n.tipo === 'obstetra_pendiente' && role === 'admin') {
      target = '/(admin)/(tabs)/usuarios';
    } else if (n.tipo === 'alarma_sin_atender' && role === 'admin') {
      const gid = (n.datos as { gestanteId?: string })?.gestanteId;
      target = gid ? `/(admin)/supervision/gestantes` : '/(admin)/supervision/gestantes';
    }

    if (target) {
      try {
        router.push(target as never);
      } catch {
        // Ruta no disponible: ignorar.
      }
    }
  };

  const renderItem = ({ item }: { item: DisplayNotification }) => {
    const meta = metaFor(item.tipo);
    const unread = !item.leidaAt;
    const grouped = (item.groupCount ?? 1) > 1;
    const urgent = URGENT_TYPES.has(item.tipo);
    // Urgente: borde rojo siempre (leída o no). No urgente sin leer: borde del rol.
    const borderColor = urgent ? semanticColors.danger : unread ? themeColor : undefined;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(item)}>
        <View
          style={[
            styles.card,
            borderColor ? { borderLeftWidth: 4, borderLeftColor: borderColor } : null,
            urgent && unread ? styles.cardUrgent : null,
            !unread && !urgent ? styles.cardRead : null,
          ]}
        >
          <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
            {React.createElement(meta.icon, { size: 20, color: meta.color })}
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, !unread && styles.titleRead]} numberOfLines={1}>
                {item.titulo || 'Notificación'}
              </Text>
              {grouped && (
                <View style={[styles.countBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.countBadgeText, { color: meta.color }]}>{item.groupCount}</Text>
                </View>
              )}
              {unread && <View style={[styles.dot, { backgroundColor: themeColor }]} />}
            </View>
            <Text style={styles.message} numberOfLines={3}>{item.mensaje}</Text>
            <Text style={styles.time}>
              {grouped ? `${item.groupCount} avisos · ` : ''}{tiempoRelativo(item.createdAt)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={10}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="Eliminar notificación"
          >
            <X size={16} color={commonColors.textTertiary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenLayout
        role={role}
        title="Notificaciones"
        subtitle={unreadCount > 0 ? `${unreadCount} sin leer` : 'Todo al día'}
        showBack={router.canGoBack()}
        onBack={() => router.back()}
        scroll={false}
        width={webShell ? 'readable' : 'full'}
        actions={
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending} style={[styles.headerActionBtn, webShell && { backgroundColor: commonColors.surfaceAlt }]} hitSlop={6} accessibilityRole="button" accessibilityLabel="Marcar todo como leído">
                <CheckCheck size={16} color={webShell ? themeColor : commonColors.white} />
                <Text style={[styles.headerActionText, webShell && { color: themeColor }]}>Leer todo</Text>
              </TouchableOpacity>
            )}
            {items.length > 0 && (
              <TouchableOpacity onPress={handleClear} disabled={clearAll.isPending} style={[styles.headerActionBtn, webShell && { backgroundColor: commonColors.surfaceAlt }]} hitSlop={6} accessibilityRole="button" accessibilityLabel="Limpiar notificaciones">
                <Trash2 size={16} color={webShell ? semanticColors.danger : commonColors.white} />
                <Text style={[styles.headerActionText, webShell && { color: semanticColors.danger }]}>Limpiar</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      >
        <View style={styles.filterRow}>
          {(['todas', 'no_leidas', 'urgentes'] as Filtro[]).map((f) => {
            const active = filtro === f;
            const label = f === 'todas' ? 'Todas' : f === 'no_leidas' ? `No leídas${unreadCount > 0 ? ` (${unreadCount})` : ''}` : `Urgentes${urgentCount > 0 ? ` (${urgentCount})` : ''}`;
            return (
              <TouchableOpacity key={f} onPress={() => setFiltro(f)} style={[styles.filterChip, webShell && { backgroundColor: commonColors.surfaceAlt }, active && (webShell ? { backgroundColor: themeColor } : styles.filterChipActive)]} activeOpacity={0.8}>
                <Text style={[styles.filterText, webShell && { color: commonColors.textSecondary }, active && (webShell ? { color: commonColors.white } : { color: themeColor })]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isLoading ? (
          <View style={{ paddingTop: spacing.lg }}>
            <ListSkeleton count={5} />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(n) => n.id}
            renderItem={renderItem}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={[styles.list, webShell && styles.listWeb]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={themeColor} />}
            ListEmptyComponent={
              <View style={{ marginTop: 60 }}>
                <EmptyState
                  icon={BellOff}
                  title={filtro === 'no_leidas' ? 'Sin pendientes' : 'Sin notificaciones'}
                  description={
                    filtro === 'no_leidas'
                      ? 'No tienes notificaciones sin leer. ¡Estás al día!'
                      : 'Aquí verás avisos de tus citas, recordatorios y alertas.'
                  }
                  themeColor={themeColor}
                />
              </View>
            }
          />
        )}
      </ScreenLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitle: { ...typography.h2, color: commonColors.white },
  headerSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 7,
  },
  headerActionText: { ...typography.label, color: commonColors.white, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  filterChipActive: { backgroundColor: commonColors.white },
  filterText: { ...typography.label, color: commonColors.white, fontWeight: '600' },
  sectionHeader: {
    ...typography.overline,
    color: commonColors.textSecondary,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  list: { paddingTop: spacing.md, paddingBottom: layout.tabBarSpace },
  listWeb: { width: '100%', paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    ...shadows.card,
  },
  cardRead: { opacity: 0.78 },
  cardUrgent: { backgroundColor: semanticColors.dangerLight },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text, flex: 1 },
  titleRead: { fontWeight: '500', color: commonColors.textSecondary },
  countBadge: { minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.sm },
  countBadgeText: { ...typography.overline, fontSize: 10, fontWeight: '700', letterSpacing: 0 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  message: { ...typography.bodySm, color: commonColors.textSecondary },
  time: { ...typography.caption, color: commonColors.textTertiary, marginTop: 2 },
});
