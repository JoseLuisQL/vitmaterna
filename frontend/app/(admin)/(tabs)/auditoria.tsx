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
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { useResponsive } from '../../../src/theme/responsive';
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
  const { webShell } = useResponsive();
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
    <ScreenLayout
      role="admin"
      title="Auditoría y Backup"
      showBack
      scroll={false}
      actions={
        <AppButton
          title="Exportar Backup BD"
          onPress={handleExportBackup}
          variant="secondary"
          size="sm"
          icon={Download}
          loading={exportMutation.isPending}
          themeColor={commonColors.white}
        />
      }
      loading={isLoading}
      isEmpty={!logs || logs.length === 0}
      emptyIcon={ShieldAlert as any}
      emptyTitle="Sin registros"
      emptyMessage="No hay logs de auditoría disponibles."
      accentColor={semanticColors.warning}
      width={webShell ? 'readable' : 'full'}
    >
      <FlatList
        data={logs}
        keyExtractor={(item, index) => item.id || item._id || String(index)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[BRAND]}
          />
        }
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
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
