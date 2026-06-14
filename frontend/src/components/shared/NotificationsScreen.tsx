/**
 * VITMATERNA — Bandeja de notificaciones in-app (reutilizable por rol).
 * Muestra la lista de avisos del usuario (confirmaciones, solicitudes de
 * reprogramación, recordatorios, alertas) y permite marcarlas como leídas.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type AppNotification,
} from '../../services/api-queries';
import { BellOff } from 'lucide-react-native';
import { EmptyState } from '../ui/EmptyState';
import { ListSkeleton } from '../ui/SkeletonLoader';
import { useAuthStore } from '../../store/authStore';
import { commonColors, semanticColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius, layout } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface Props {
  /** Color de acento del rol (gestante púrpura, obstetra azul). */
  themeColor?: string;
  /** Gradiente del rol para el header. */
  gradient?: readonly [string, string, ...string[]];
}

/** Icono y color por tipo de notificación. */
function metaFor(tipo: string): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (tipo) {
    case 'cita_confirmada':
      return { icon: 'checkmark-circle', color: semanticColors.success, bg: semanticColors.successLight };
    case 'solicitud_reprogramacion':
      return { icon: 'hourglass', color: semanticColors.warning, bg: semanticColors.warningLight };
    case 'reprogramacion_aprobada':
      return { icon: 'calendar', color: semanticColors.success, bg: semanticColors.successLight };
    case 'reprogramacion_rechazada':
      return { icon: 'close-circle', color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'signo_alarma':
      return { icon: 'warning', color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'inasistencia':
      return { icon: 'alert-circle', color: semanticColors.danger, bg: semanticColors.dangerLight };
    case 'baja_adherencia':
      return { icon: 'trending-down', color: semanticColors.warning, bg: semanticColors.warningLight };
    case 'recordatorio_suplemento':
      return { icon: 'medkit', color: semanticColors.info, bg: semanticColors.infoLight };
    case 'fpp_proxima':
      return { icon: 'heart', color: gestanteColors.primary, bg: gestanteColors.primaryLight };
    default:
      return { icon: 'notifications', color: commonColors.textSecondary, bg: commonColors.surfaceAlt };
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
  return new Date(iso).toLocaleDateString();
}

export function NotificationsScreen({
  themeColor = gestanteColors.primary,
  gradient = gestanteColors.gradient,
}: Props): React.ReactElement {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const { data: items = [], isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  useFocusEffect(
    useCallback(() => {
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const hasUnread = items.some((n) => !n.leidaAt);

  const handlePress = (n: AppNotification) => {
    if (!n.leidaAt) markRead.mutate(n.id);

    // Navegación contextual por tipo y rol.
    const citaTipos = [
      'cita_confirmada',
      'solicitud_reprogramacion',
      'reprogramacion_aprobada',
      'reprogramacion_rechazada',
      'inasistencia',
    ];

    let target: string | null = null;
    if (citaTipos.includes(n.tipo)) {
      target = role === 'obstetra' ? '/(obstetra)/(tabs)/cronograma' : '/(gestante)/(tabs)/citas';
    } else if (n.tipo === 'signo_alarma' && role === 'obstetra') {
      target = '/(obstetra)/(tabs)/alertas';
    } else if (n.tipo === 'recordatorio_suplemento' && role === 'gestante') {
      target = '/(gestante)/(tabs)/tratamiento';
    }

    if (target) {
      try {
        router.push(target as never);
      } catch {
        // Ruta no disponible: ignorar.
      }
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = metaFor(item.tipo);
    const unread = !item.leidaAt;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(item)}>
        <View style={[styles.card, unread && { borderLeftWidth: 4, borderLeftColor: themeColor }]}>
          <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.titulo || 'Notificación'}</Text>
              {unread && <View style={[styles.dot, { backgroundColor: themeColor }]} />}
            </View>
            <Text style={styles.message} numberOfLines={3}>{item.mensaje}</Text>
            <Text style={styles.time}>{tiempoRelativo(item.createdAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={24} color={commonColors.white} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notificaciones</Text>
          </View>
          {hasUnread && (
            <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
              <Text style={styles.markAll}>Marcar todo</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.lg }}>
          <ListSkeleton count={5} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={themeColor} />}
          ListEmptyComponent={
            <View style={{ marginTop: 60 }}>
              <EmptyState
                icon={BellOff}
                title="Sin notificaciones"
                description="Aquí verás avisos de tus citas, recordatorios y alertas."
                themeColor={themeColor}
              />
            </View>
          }
        />
      )}
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerTitle: { ...typography.h2, color: commonColors.white },
  markAll: { ...typography.label, color: commonColors.white, fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: layout.tabBarSpace },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    ...shadows.card,
  },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  message: { ...typography.bodySm, color: commonColors.textSecondary },
  time: { ...typography.caption, color: commonColors.textTertiary, marginTop: 2 },
});
