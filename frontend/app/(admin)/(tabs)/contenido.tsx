/**
 * VITMATERNA - Admin Education Content CMS Screen
 * Create new educational content.
 */
import React from 'react';
import { View, StyleSheet, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileText, Link as LinkIcon, Image as ImageIcon, Clock } from 'lucide-react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppInput } from '../../../src/components/ui/AppInput';
import { AppButton } from '../../../src/components/ui/AppButton';
import { commonColors, obstetraColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useCreateEducationContent } from '../../../src/services/admin-queries';

const BRAND = obstetraColors.primary;

const schema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  type: z.enum(['video', 'article', 'guide']),
  url: z.string().url('Debe ser una URL válida'),
  duration: z.string().optional(),
  thumbnailUrl: z.string().optional(),
});

type EducationFormValues = z.infer<typeof schema>;

export default function ContenidoScreen(): React.ReactElement {
  const createContentMutation = useCreateEducationContent();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<EducationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      type: 'article',
      url: '',
      duration: '',
      thumbnailUrl: '',
    },
  });

  const onSubmit = (data: EducationFormValues) => {
    const payload = {
      ...data,
      duration: data.duration ? parseInt(data.duration, 10) : undefined,
    };
    createContentMutation.mutate(payload, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Contenido creado correctamente');
        reset();
      },
      onError: (error: any) => {
        Alert.alert('Error', error.response?.data?.message || 'Error al crear contenido');
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Nuevo Contenido</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.formContainer} keyboardShouldPersistTaps="handled">
        <AppInput
          name="title"
          control={control}
          label="Título"
          placeholder="Ej. Cuidados en el primer trimestre"
          error={errors.title?.message}
          themeColor={BRAND}
        />
        
        <AppInput
          name="description"
          control={control}
          label="Descripción"
          placeholder="Breve descripción del contenido"
          error={errors.description?.message}
          themeColor={BRAND}
          multiline
          numberOfLines={3}
          containerStyle={{ minHeight: 100 }}
        />

        <View style={styles.typeSelector}>
          <Text style={styles.label}>Tipo de Contenido</Text>
          <Controller
            name="type"
            control={control}
            render={({ field: { onChange, value } }) => (
              <View style={styles.radioGroup}>
                {['article', 'video', 'guide'].map((t) => (
                  <AppButton
                    key={t}
                    title={t.charAt(0).toUpperCase() + t.slice(1)}
                    onPress={() => onChange(t)}
                    variant={value === t ? 'primary' : 'outline'}
                    style={[{ flex: 1, marginHorizontal: 4 }, value === t ? { backgroundColor: BRAND } : {}] as any}
                    size="sm"
                  />
                ))}
              </View>
            )}
          />
        </View>

        <AppInput
          name="url"
          control={control}
          label="URL del Contenido"
          placeholder="https://..."
          leftIcon={LinkIcon as any}
          error={errors.url?.message}
          themeColor={BRAND}
        />

        <AppInput
          name="thumbnailUrl"
          control={control}
          label="URL de Miniatura (Opcional)"
          placeholder="https://..."
          leftIcon={ImageIcon as any}
          error={errors.thumbnailUrl?.message}
          themeColor={BRAND}
        />

        <AppInput
          name="duration"
          control={control}
          label="Duración en minutos (Opcional)"
          placeholder="Ej. 15"
          leftIcon={Clock as any}
          keyboardType="numeric"
          error={errors.duration?.message}
          themeColor={BRAND}
        />

        <AppButton
          title="Crear Contenido"
          onPress={handleSubmit(onSubmit)}
          variant="primary"
          style={styles.submitBtn}
          icon={FileText}
          loading={createContentMutation.isPending}
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
    ...typography.h1,
    color: commonColors.text,
  },
  formContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  label: {
    ...typography.label,
    color: commonColors.text,
    marginBottom: spacing.xs,
  },
  typeSelector: {
    marginBottom: spacing.md,
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  submitBtn: {
    marginTop: spacing.lg,
    backgroundColor: BRAND,
  },
});
