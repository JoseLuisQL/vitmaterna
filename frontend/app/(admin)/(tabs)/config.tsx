/**
 * VITMATERNA - Admin System Config Screen
 * Fetch and edit system-wide parameters.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Save } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { commonColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useSystemConfig, useUpdateSystemConfig } from '../../../src/services/admin-queries';

const schema = z.object({
  maxPatientsPerObstetra: z.string().min(1, 'Requerido'),
  allowNewRegistrations: z.boolean(),
  maintenanceMode: z.boolean(),
  supportEmail: z.string().email('Email inválido'),
});

type ConfigFormValues = z.infer<typeof schema>;

export default function ConfigScreen(): React.ReactElement {
  const { data: config, isLoading } = useSystemConfig();
  const updateConfigMutation = useUpdateSystemConfig();

  const { control, handleSubmit, reset, formState: { errors } } = useForm<ConfigFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      maxPatientsPerObstetra: '50',
      allowNewRegistrations: true,
      maintenanceMode: false,
      supportEmail: 'soporte@vitmaterna.com',
    },
  });

  useEffect(() => {
    if (config) {
      reset({
        maxPatientsPerObstetra: String(config.maxPatientsPerObstetra || 50),
        allowNewRegistrations: config.allowNewRegistrations ?? true,
        maintenanceMode: config.maintenanceMode ?? false,
        supportEmail: config.supportEmail || 'soporte@vitmaterna.com',
      });
    }
  }, [config, reset]);

  const onSubmit = (data: ConfigFormValues) => {
    const payload = {
      ...data,
      maxPatientsPerObstetra: parseInt(data.maxPatientsPerObstetra, 10),
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

  if (isLoading) {
    return <LoadingScreen message="Cargando configuración..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuración del Sistema</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Límites y Accesos</Text>
          <AppInput
            name="maxPatientsPerObstetra"
            control={control}
            label="Máx. Pacientes por Obstetra"
            keyboardType="numeric"
            error={errors.maxPatientsPerObstetra?.message}
            themeColor={semanticColors.info}
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
                  trackColor={{ false: commonColors.border, true: semanticColors.infoLight }}
                  thumbColor={value ? semanticColors.info : commonColors.textSecondary}
                />
              )}
            />
          </View>
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
            themeColor={semanticColors.info}
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
      </ScrollView>
    </SafeAreaView>
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
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: commonColors.text,
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
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
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: typography.bodyMedium.fontWeight,
    color: commonColors.text,
  },
  switchDesc: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: commonColors.textSecondary,
    maxWidth: 250,
  },
  submitBtn: {
    marginTop: spacing.md,
    backgroundColor: semanticColors.info,
  },
});
