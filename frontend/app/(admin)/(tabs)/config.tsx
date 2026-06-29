/**
 * VITMATERNA - Admin System Config Screen
 * Fetch and edit system-wide parameters.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, Save, ArrowLeft } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useResponsive } from '../../../src/theme/responsive';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { useToast } from '../../../src/components/ui';
import { confirmAction } from '../../../src/utils/confirm';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useSystemConfig, useUpdateSystemConfig } from '../../../src/services/admin-queries';

const BRAND = adminColors.primary;

const schema = z.object({
  maxPatientsPerObstetra: z.string().min(1, 'Requerido'),
  altitudMsnm: z.string().min(1, 'Requerido'),
  allowNewRegistrations: z.boolean(),
  autoGenerarCitas: z.boolean(),
  maintenanceMode: z.boolean(),
  maintenanceMessage: z.string().max(500, 'Máximo 500 caracteres').optional(),
  supportEmail: z.string().email('Email inválido'),
});

type ConfigFormValues = z.infer<typeof schema>;

export default function ConfigScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const configTourTarget = useTourTarget(TOUR_TARGETS.adminConfig);
  const mantenimientoTourTarget = useTourTarget(TOUR_TARGETS.adminConfigMantenimiento);
  const { data: config, isLoading } = useSystemConfig();
  const updateConfigMutation = useUpdateSystemConfig();

  const { control, handleSubmit, reset, watch, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      maxPatientsPerObstetra: '50',
      altitudMsnm: '2926',
      allowNewRegistrations: true,
      autoGenerarCitas: true,
      maintenanceMode: false,
      maintenanceMessage: '',
      supportEmail: 'soporte@vitmaterna.com',
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        maxPatientsPerObstetra: String(config.maxPatientsPerObstetra || 50),
        altitudMsnm: String(config.altitudMsnm ?? 2926),
        allowNewRegistrations: config.allowNewRegistrations ?? true,
        autoGenerarCitas: config.autoGenerarCitas ?? true,
        maintenanceMode: config.maintenanceMode ?? false,
        maintenanceMessage: config.maintenanceMessage || '',
        supportEmail: config.supportEmail || 'soporte@vitmaterna.com',
      });
    }
  }, [config, reset]);

  const persist = (data: ConfigFormValues) => {
    const payload = {
      ...data,
      maxPatientsPerObstetra: parseInt(data.maxPatientsPerObstetra, 10),
      altitudMsnm: parseInt(data.altitudMsnm, 10),
      maintenanceMessage: (data.maintenanceMessage || '').trim(),
    };
    updateConfigMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(
          'Configuración guardada',
          data.maintenanceMode
            ? 'Modo mantenimiento ACTIVO: gestantes y obstetras verán la pantalla de mantenimiento.'
            : 'Los cambios se aplicaron correctamente.',
        );
      },
      onError: (error: any) => {
        toast.error('No se pudo guardar', error.response?.data?.message || 'Inténtalo de nuevo en unos momentos.');
      },
    });
  };

  const onSubmit = async (data: ConfigFormValues) => {
    // Activar mantenimiento es una acción sensible: confirmamos antes.
    const wasOff = !(config?.maintenanceMode ?? false);
    if (data.maintenanceMode && wasOff) {
      const ok = await confirmAction({
        title: 'Activar modo mantenimiento',
        message:
          'Mientras esté activo, las gestantes y obstetras NO podrán usar la app: verán una pantalla de mantenimiento. Tú (administrador) seguirás teniendo acceso. ¿Continuar?',
        confirmText: 'Activar mantenimiento',
        destructive: true,
      });
      if (!ok) return;
    }
    persist(data);
  };

  return (
    <ScreenLayout
      role="admin"
      title="Configuración del Sistema"
      showBack
      loading={isLoading}
      scroll
      width="full"
      contentStyle={{ paddingBottom: spacing.xxl }}
    >
      <View style={webShell ? styles.formGrid : undefined}>
        {/* Fila 1 */}
        <View ref={configTourTarget} collapsable={false} style={webShell ? styles.rowGrid : undefined}>
          <View style={[styles.section, webShell && styles.col]}>
            <Text style={styles.sectionTitle}>Límites y Accesos</Text>
            <AppInput
              name="maxPatientsPerObstetra"
              control={control}
              label="Máx. Pacientes por Obstetra"
              keyboardType="numeric"
              error={errors.maxPatientsPerObstetra?.message}
              themeColor={BRAND}
            />
            
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Permitir Nuevos Registros</Text>
                <Text style={styles.switchDesc}>Habilitar registro de nuevas gestantes y obstetras</Text>
              </View>
              <Controller
                name="allowNewRegistrations"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: commonColors.border, true: obstetraColors.primaryLight }}
                    thumbColor={value ? BRAND : commonColors.textSecondary}
                  />
                )}
              />
            </View>
          </View>

          <View style={[styles.section, webShell && styles.col]}>
            <Text style={styles.sectionTitle}>Parámetros Clínicos</Text>
            <AppInput
              name="altitudMsnm"
              control={control}
              label="Altitud del establecimiento (msnm)"
              keyboardType="numeric"
              error={errors.altitudMsnm?.message}
              themeColor={BRAND}
            />
            <Text style={styles.helperText}>
              Se usa para corregir la hemoglobina por altitud (MINSA). Talavera ≈ 2926 msnm.
            </Text>
          </View>
        </View>

        {/* Fila 2 */}
        <View style={webShell ? styles.rowGrid : undefined}>
          <View style={[styles.section, webShell && styles.col]}>
            <Text style={styles.sectionTitle}>Citas Prenatales</Text>
            <View style={[styles.switchRow, { borderBottomWidth: 0, marginBottom: 0 }]}>
              <View>
                <Text style={styles.switchLabel}>Generar citas automáticamente</Text>
                <Text style={styles.switchDesc}>
                  Al registrar la FUM de una gestante, crea su cronograma de controles.
                  Si está desactivado, la obstetra programa las citas manualmente.
                </Text>
              </View>
              <Controller
                name="autoGenerarCitas"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: commonColors.border, true: obstetraColors.primaryLight }}
                    thumbColor={value ? BRAND : commonColors.textSecondary}
                  />
                )}
              />
            </View>
          </View>

          <View ref={mantenimientoTourTarget} collapsable={false} style={[styles.section, webShell && styles.col]}>
            <Text style={styles.sectionTitle}>Sistema</Text>
            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Modo Mantenimiento</Text>
                <Text style={styles.switchDesc}>Bloquea el acceso a usuarios no administradores</Text>
              </View>
              <Controller
                name="maintenanceMode"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: commonColors.border, true: semanticColors.dangerLight }}
                    thumbColor={value ? semanticColors.danger : commonColors.textSecondary}
                  />
                )}
              />
            </View>

            {watch('maintenanceMode') && (
              <View style={styles.maintenanceBox}>
                <AppInput
                  name="maintenanceMessage"
                  control={control}
                  label="Mensaje de mantenimiento"
                  placeholder="Ej. Estamos mejorando VITMATERNA. Volvemos en unos minutos."
                  error={errors.maintenanceMessage?.message}
                  themeColor={BRAND}
                  multiline
                />
                <Text style={styles.helperText}>
                  Este mensaje se mostrará a gestantes y obstetras en la pantalla de mantenimiento.
                  Si lo dejas vacío, se usará un mensaje por defecto.
                </Text>
              </View>
            )}

            <AppInput
              name="supportEmail"
              control={control}
              label="Email de Soporte"
              error={errors.supportEmail?.message}
              themeColor={BRAND}
              autoCapitalize="none"
            />
          </View>
        </View>
      </View>

      <AppButton
        title="Guardar cambios"
        onPress={handleSubmit(onSubmit)}
        variant="primary"
        themeColor={BRAND}
        style={StyleSheet.flatten([styles.submitBtn, webShell && styles.submitBtnWeb])}
        icon={Save}
        loading={updateConfigMutation.isPending}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  sectionTitle: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: commonColors.borderLight,
  },
  switchLabel: {
    ...typography.bodyMd,
    color: commonColors.text,
  },
  switchDesc: {
    ...typography.caption,
    color: commonColors.textSecondary,
    maxWidth: 250,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
  submitBtnWeb: {
    maxWidth: 320,
    alignSelf: 'flex-end',
  },
  helperText: {
    ...typography.caption,
    color: commonColors.textSecondary,
    marginTop: spacing.xs,
  },
  maintenanceBox: {
    backgroundColor: semanticColors.dangerLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  formGrid: {
    gap: spacing.lg,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  },
});
