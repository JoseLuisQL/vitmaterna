/**
 * VITMATERNA - Admin Audit Logs Screen
 * View audit logs and export database backup.
 */
import React from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldAlert, Download, ArrowLeft } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppButton } from '../../../src/components/ui/AppButton';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useAuditLogs, useExportBackup } from '../../../src/services/admin-queries';

const BRAND = obstetraColors.primary;

export default function AuditoriaScreen(): React.ReactElement {
  const router = useRouter();
  const { data: logs, isLoading, refetch } = useAuditLogs();
  const exportMutation = useExportBackup();

  const handleExportBackup = async () => {
    exportMutation.mutate(undefined, {
      onSuccess: async (backupData: any) => {
        try {
          const jsonString = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);
          const filename = `vitmaterna_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
          const fileUri = `${FileSystem.documentDirectory}${filename}`;
          
          await FileSystem.writeAsStringAsync(fileUri, jsonString, {
            encoding: FileSystem.EncodingType.UTF8,
          });

          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: 'application/json',
              dialogTitle: 'Exportar Backup de BD',
            });
          } else {
            Alert.alert('Éxito', 'Backup generado, pero no se puede compartir en este dispositivo.');
          }
        } catch (err) {
          Alert.alert('Error', 'No se pudo guardar o compartir el archivo de backup.');
        }
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Error al generar backup');
      },
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.iconContainer}>
          <ShieldAlert size={20} color={semanticColors.warning} />
        </View>
        <View style={styles.info}>
          <Text style={styles.action}>{item.action || 'Acción desconocida'}</Text>
          <Text style={styles.details}>
            Usuario: {item.userEmail || item.userId || 'Sistema'}
          </Text>
          <Text style={styles.date}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Fecha desconocida'}
          </Text>
        </View>
      </View>
    </AppCard>
  );

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
        <LoadingScreen message="Cargando logs..." />
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
