/**
 * VITMATERNA - Admin System Config Screen
 * Fetch and edit system-wide parameters.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings, Save, ArrowLeft } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { CardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { WebMaxWidth } from '../../../src/components/web';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useSystemConfig, useUpdateSystemConfig } from '../../../src/services/admin-queries';

const BRAND = obstetraColors.primary;

const schema = z.object({
  maxPatientsPerObstetra: z.string().min(1, 'Requerido'),
  altitudMsnm: z.string().min(1, 'Requerido'),
  allowNewRegistrations: z.boolean(),
  autoGenerarCitas: z.boolean(),
  maintenanceMode: z.boolean(),
  supportEmail: z.string().email('Email inválido'),
});

type ConfigFormValues = z.infer<typeof schema>;

export default function ConfigScreen(): React.ReactElement {
  const router = useRouter();
  const { data: config, isLoading } = useSystemConfig();
  const updateConfigMutation = useUpdateSystemConfig();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      maxPatientsPerObstetra: '50',
      altitudMsnm: '2926',
      allowNewRegistrations: true,
      autoGenerarCitas: true,
      maintenanceMode: false,
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
        supportEmail: config.supportEmail || 'soporte@vitmaterna.com',
      });
    }
  }, [config, reset]);

  const onSubmit = (data: ConfigFormValues) => {
    const payload = {
      ...data,
      maxPatientsPerObstetra: parseInt(data.maxPatientsPerObstetra, 10),
      altitudMsnm: parseInt(data.altitudMsnm, 10),
    };
    updateConfigMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Configuración actualizada correctamente');
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Error al actualizar configuración');
      },
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <Text style={styles.title}>Configuración del Sistema</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.formContainer}>
          <CardSkeleton />
          <CardSkeleton style={{ marginTop: spacing.lg }} />
          <CardSkeleton style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <WebMaxWidth width="readable">
        <View style={styles.section}>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
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

        <View style={styles.section}>
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

          <AppInput
            name="supportEmail"
            control={control}
            label="Email de Soporte"
            error={errors.supportEmail?.message}
            themeColor={BRAND}
            autoCapitalize="none"
          />
        </View>

        <AppButton
          title="Guardar Cambios"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          style={styles.submitBtn}
          icon={Save}
          loading={updateConfigMutation.isPending}
        />
        </WebMaxWidth>
      </ScrollView>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  title: {
    ...typography.h1,
    color: commonColors.white,
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: layout.tabBarSpace,
  },
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
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  switchDesc: {
    ...typography.caption,
    color: commonColors.textSecondary,
    maxWidth: 250,
  },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: BRAND,
  },
  helperText: {
    ...typography.caption,
    color: commonColors.textSecondary,
    marginTop: spacing.xs,
  },
});
