/**
 * VITMATERNA — Bandeja de notificaciones in-app (reutilizable por rol).
 * Muestra la lista de avisos del usuario (confirmaciones, solicitudes de
 * reprogramación, recordatorios, alertas) y permite marcarlas como leídas.
 */
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
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
import { LoadingScreen } from '../ui/LoadingScreen';
import { commonColors, semanticColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface Props {
  /** Color de acento del rol (gestante púrpura, obstetra azul). */
  themeColor?: string;
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

export function NotificationsScreen({ themeColor = gestanteColors.primary }: Props): React.ReactElement {
  const router = useRouter();
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
    // Navegación contextual: las relativas a citas llevan a la pantalla de citas.
    if (
      ['cita_confirmada', 'solicitud_reprogramacion', 'reprogramacion_aprobada', 'reprogramacion_rechazada', 'inasistencia'].includes(
        n.tipo,
      )
    ) {
      // El obstetra ve su cronograma; la gestante su listado de citas.
      router.push('/');
    }
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = metaFor(item.tipo);
    const unread = !item.leidaAt;
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => handlePress(item)}>
        <View style={[styles.card, unread && { borderColor: themeColor, borderWidth: 1 }]}>
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

  if (isLoading) return <LoadingScreen message="Cargando notificaciones..." />;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={commonColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notificaciones</Text>
        </View>
        {hasUnread && (
          <TouchableOpacity onPress={() => markAll.mutate()} disabled={markAll.isPending}>
            <Text style={[styles.markAll, { color: themeColor }]}>Marcar todo</Text>
          </TouchableOpacity>
        )}
      </View>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h2, color: commonColors.text },
  markAll: { ...typography.label },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  iconCircle: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.bodyMedium, fontWeight: '700', color: commonColors.text, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: spacing.sm },
  message: { ...typography.bodySmall, color: commonColors.textSecondary },
  time: { ...typography.caption, color: commonColors.textTertiary, marginTop: 2 },
});
