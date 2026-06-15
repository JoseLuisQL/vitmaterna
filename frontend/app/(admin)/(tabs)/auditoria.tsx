/**
 * VITMATERNA - Admin Audit Logs Screen
 * View audit logs and export database backup.
 */
import React from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldAlert, Download, ArrowLeft, Plus, Pencil, Trash2, RefreshCw } from 'lucide-react-native';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppButton } from '../../../src/components/ui/AppButton';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { exportTextFile } from '../../../src/utils/exportFile';
import { useToast } from '../../../src/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useAuditLogs, useExportBackup } from '../../../src/services/admin-queries';

const BRAND = obstetraColors.primary;

// Etiquetas legibles para acción HTTP y entidad afectada.
const ACCION_LABEL: Record<string, string> = {
  POST: 'Creación', PUT: 'Actualización', PATCH: 'Actualización', DELETE: 'Eliminación',
};
const ENTIDAD_LABEL: Record<string, string> = {
  admin: 'Administración', patients: 'Pacientes', appointments: 'Citas',
  clinical: 'Datos clínicos', education: 'Educación', chat: 'Mensajería',
  notifications: 'Notificaciones', 'home-visits': 'Visitas domiciliarias',
  reports: 'Reportes', auth: 'Cuenta', sync: 'Sincronización', desconocido: 'Sistema',
};

function accionMeta(accion?: string) {
  const a = (accion || '').toUpperCase();
  if (a === 'POST') return { label: 'Creación', Icon: Plus, color: semanticColors.success };
  if (a === 'PUT' || a === 'PATCH') return { label: 'Actualización', Icon: Pencil, color: semanticColors.info };
  if (a === 'DELETE') return { label: 'Eliminación', Icon: Trash2, color: semanticColors.danger };
  return { label: ACCION_LABEL[a] || a || 'Acción', Icon: RefreshCw, color: commonColors.textSecondary };
}

export default function AuditoriaScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { data: logs, isLoading, refetch } = useAuditLogs();
  const exportMutation = useExportBackup();

  const handleExportBackup = async () => {
    exportMutation.mutate(undefined, {
      onSuccess: async (backupData: any) => {
        try {
          const jsonString = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);
          const filename = `vitmaterna_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          // exportTextFile resuelve web (descarga) y nativo (compartir).
          const ok = await exportTextFile(filename, jsonString, 'application/json');
          if (ok) toast.success('Backup generado', 'El respaldo de la base de datos se exportó correctamente.');
          else toast.error('No se pudo exportar', 'El backup se generó pero no fue posible descargarlo o compartirlo.');
        } catch (err) {
          toast.error('Error', 'No se pudo guardar o compartir el archivo de backup.');
        }
      },
      onError: (error: any) => {
        toast.error('Error', error.response?.data?.message || 'Error al generar backup');
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    const { label, Icon, color } = accionMeta(item.accion);
    const entidad = ENTIDAD_LABEL[item.entidad as string] || item.entidad || 'Sistema';
    const usuario = item.user
      ? `${item.user.firstName || ''} ${item.user.lastName || ''}`.trim() || 'Usuario'
      : 'Sistema';
    const rol = item.user?.role ? ` · ${item.user.role}` : '';
    return (
      <AppCard style={styles.card}>
        <View style={styles.cardContent}>
          <View style={[styles.iconContainer, { backgroundColor: color + '1A' }]}>
            <Icon size={18} color={color} />
          </View>
          <View style={styles.info}>
            <Text style={styles.action}>{label} · {entidad}</Text>
            <Text style={styles.details}>Por: {usuario}{rol}</Text>
            <Text style={styles.date}>
              {item.createdAt ? new Date(item.createdAt).toLocaleString('es-PE') : 'Fecha desconocida'}
            </Text>
          </View>
        </View>
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/mas'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Auditoría y Backup</Text>
          </View>
          <AppButton
            title="Exportar Backup BD"
            onPress={handleExportBackup}
            variant="secondary"
            size="sm"
            icon={Download}
            loading={exportMutation.isPending}
            themeColor={commonColors.white}
            style={styles.exportBtn}
          />
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.listContent}><ListSkeleton count={7} /></View>
      ) : !logs || logs.length === 0 ? (
        <EmptyState
          icon={ShieldAlert as any}
          title="Sin registros"
          description="No hay logs de auditoría disponibles."
          themeColor={semanticColors.warning}
        />
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item, index) => item.id || item._id || String(index)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={[BRAND]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  title: {
    ...typography.h1,
    color: commonColors.white,
    marginBottom: spacing.md,
  },
  exportBtn: {
    alignSelf: 'flex-start',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: layout.tabBarSpace,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: semanticColors.warningLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  info: {
    flex: 1,
  },
  action: {
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  details: {
    ...typography.caption,
    color: commonColors.textSecondary,
    marginTop: 2,
  },
  date: {
    ...typography.overline,
    letterSpacing: 0,
    color: commonColors.textTertiary,
    marginTop: 4,
  },
});
