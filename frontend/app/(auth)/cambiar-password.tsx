/**
 * VITMATERNA — Cambiar contraseña (issue #14)
 *
 * Pantalla de cambio de contraseña. Se usa en dos casos:
 *  - Cambio obligatorio en el primer ingreso (gestante creada por el obstetra,
 *    cuya contraseña inicial es su DNI). En ese caso `mustChangePassword` es
 *    true y el usuario no puede saltarse este paso.
 *  - Cambio voluntario desde el perfil.
 */
import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ShieldCheck, Check, Circle } from 'lucide-react-native';
import { AppButton } from '../../src/components/ui/AppButton';
import { AppInput } from '../../src/components/ui/AppInput';
import { useToast } from '../../src/components/ui';
import { useAuthStore } from '../../src/store/authStore';
import { gestanteColors, obstetraColors, adminColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const PASSWORD_RULES: { test: (v: string) => boolean; label: string }[] = [
  { test: (v) => v.length >= 8, label: 'Al menos 8 caracteres' },
  { test: (v) => /[a-z]/.test(v), label: 'Una minúscula' },
  { test: (v) => /[A-Z]/.test(v), label: 'Una mayúscula' },
  { test: (v) => /\d/.test(v), label: 'Un número' },
  { test: (v) => /[@$!%*?&#]/.test(v), label: 'Un símbolo (@$!%*?&#)' },
];

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        'Debe incluir mayúscula, minúscula, número y un símbolo (@$!%*?&#)',
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
type FormData = z.infer<typeof schema>;

const ACCENT: Record<string, string> = {
  gestante: gestanteColors.primary,
  obstetra: obstetraColors.primary,
  admin: adminColors.primary,
};

export default function CambiarPasswordScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { user, changePassword } = useAuthStore();
  const forced = !!user?.mustChangePassword;
  const accent = ACCENT[user?.role || 'gestante'] || obstetraColors.primary;

  const { control, handleSubmit, watch, formState: { isSubmitting, errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        await changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
        toast.success('Contraseña actualizada', 'Tu nueva contraseña ya está activa.');
        const role = useAuthStore.getState().user?.role;
        if (role === 'gestante') router.replace('/(gestante)/(tabs)');
        else if (role === 'admin') router.replace('/(admin)/(tabs)' as any);
        else router.replace('/(obstetra)/(tabs)');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Inténtalo de nuevo.';
        toast.error('No se pudo cambiar la contraseña', message);
      }
    },
    [changePassword, router, toast],
  );

  const newPwd = watch('newPassword') || '';

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={[styles.iconCircle, { backgroundColor: accent + '1A' }]}>
              <ShieldCheck size={36} color={accent} />
            </View>
            <Text style={styles.title}>Cambia tu contraseña</Text>
            <Text style={styles.subtitle}>
              {forced
                ? 'Por tu seguridad, debes crear una contraseña nueva antes de continuar. Tu contraseña inicial era tu DNI.'
                : 'Crea una contraseña nueva para tu cuenta.'}
            </Text>

            <View style={styles.card}>
              <AppInput<FormData>
                name="currentPassword" control={control} label={forced ? 'Contraseña actual (tu DNI)' : 'Contraseña actual'}
                placeholder="Ingresa tu contraseña actual" leftIcon={Lock} secureTextEntry
                error={errors.currentPassword?.message} themeColor={accent} autoCapitalize="none"
              />
              <AppInput<FormData>
                name="newPassword" control={control} label="Nueva contraseña" placeholder="Mínimo 8 caracteres"
                leftIcon={Lock} secureTextEntry error={errors.newPassword?.message} themeColor={accent} autoCapitalize="none"
              />
              {newPwd ? (
                <View style={styles.checklist}>
                  {PASSWORD_RULES.map((rule, i) => {
                    const ok = rule.test(newPwd);
                    return (
                      <View key={i} style={styles.ruleRow}>
                        {ok ? <Check size={14} color={semanticColors.success} /> : <Circle size={14} color={commonColors.textTertiary} />}
                        <Text style={[styles.ruleText, ok && { color: semanticColors.success }]}>{rule.label}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
              <AppInput<FormData>
                name="confirmPassword" control={control} label="Confirmar nueva contraseña" placeholder="Repite tu contraseña"
                leftIcon={Lock} secureTextEntry error={errors.confirmPassword?.message} themeColor={accent} autoCapitalize="none"
              />

              <AppButton
                title="Guardar contraseña" onPress={handleSubmit(onSubmit)} loading={isSubmitting}
                fullWidth size="lg" rounded themeColor={accent} style={{ marginTop: spacing.xs }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, gap: spacing.sm },
  iconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md },
  title: { ...typography.h1, color: commonColors.text, textAlign: 'center' },
  subtitle: { ...typography.body, color: commonColors.textSecondary, textAlign: 'center', marginBottom: spacing.lg },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg },
  checklist: { marginTop: -spacing.sm, marginBottom: spacing.md, gap: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  ruleText: { ...typography.caption, color: commonColors.textSecondary },
});
