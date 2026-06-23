/**
 * VITMATERNA — Pantalla de mantenimiento.
 *
 * Se muestra a gestantes y obstetras (no al admin) cuando el administrador
 * activa el modo mantenimiento. Diseño sereno y profesional, coherente con la
 * marca: logo oficial sobre gradiente, mensaje claro (personalizable por el
 * admin) y un texto contextual según el rol, con botón para reintentar.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, RefreshCw, Phone } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { VitMaternaLogo } from './VitMaternaLogo';
import { gestanteColors, commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import type { UserRole } from '../../types/user';

interface Props {
  /** Mensaje configurado por el administrador. */
  message?: string;
  /** Rol del usuario, para personalizar el texto de apoyo. */
  role?: UserRole;
  /** Reintentar (revalida el estado del sistema). */
  onRetry?: () => void;
  retrying?: boolean;
}

const DEFAULT_MESSAGE =
  'Estamos realizando mejoras en VITMATERNA. Vuelve en unos minutos. Gracias por tu paciencia.';

function roleHint(role?: UserRole): string {
  if (role === 'gestante') {
    return 'Tu información está segura. Si tienes una urgencia, comunícate con tu obstetra o acude al centro de salud.';
  }
  if (role === 'obstetra') {
    return 'El acceso clínico se restablecerá pronto. Si es urgente, contacta al administrador del sistema.';
  }
  return 'El servicio estará disponible nuevamente en breve.';
}

export function MaintenanceScreen({ message, role, onRetry, retrying }: Props): React.ReactElement {
  const text = message?.trim() || DEFAULT_MESSAGE;

  return (
    <LinearGradient
      colors={gestanteColors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Halos decorativos suaves. */}
      <View style={styles.haloTop} pointerEvents="none" />
      <View style={styles.haloBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.logoPlate}>
            <VitMaternaLogo size={92} />
          </View>

          <View style={styles.badge}>
            <Wrench size={15} color={commonColors.white} />
            <Text style={styles.badgeText}>En mantenimiento</Text>
          </View>

          <Text style={styles.title}>Volvemos enseguida</Text>
          <Text style={styles.message}>{text}</Text>

          <View style={styles.hintCard}>
            <Text style={styles.hintText}>{roleHint(role)}</Text>
          </View>

          {onRetry && (
            <Pressable
              onPress={onRetry}
              disabled={retrying}
              style={({ pressed }: any) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
              accessibilityRole="button"
              accessibilityLabel="Reintentar"
            >
              <RefreshCw size={18} color={gestanteColors.primary} />
              <Text style={styles.retryText}>{retrying ? 'Comprobando…' : 'Reintentar'}</Text>
            </Pressable>
          )}

          <View style={styles.footerRow}>
            <Phone size={13} color={commonColors.onColorTextFaint} />
            <Text style={styles.footerText}>Centro de Salud Talavera · 083 - 421800</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const PLATE = 132;

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  haloTop: {
    position: 'absolute', top: -120, right: -90, width: 300, height: 300, borderRadius: 150,
    backgroundColor: commonColors.onColorSurfaceFaint,
  },
  haloBottom: {
    position: 'absolute', bottom: -140, left: -110, width: 320, height: 320, borderRadius: 160,
    backgroundColor: commonColors.onColorSurfaceFaint,
  },
  logoPlate: {
    width: PLATE, height: PLATE, borderRadius: PLATE / 2,
    backgroundColor: commonColors.white,
    alignItems: 'center', justifyContent: 'center',
    ...({ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' } as any),
    elevation: 10,
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: commonColors.onColorSurfaceStrong,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm2, paddingVertical: 6,
  },
  badgeText: { ...typography.label, fontWeight: '700', color: commonColors.white },
  title: { ...typography.h1, color: commonColors.white, textAlign: 'center' },
  message: {
    ...typography.body, color: commonColors.onColorTextSoft, textAlign: 'center',
    lineHeight: 24, maxWidth: 420,
  },
  hintCard: {
    backgroundColor: commonColors.onColorSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxWidth: 420,
    marginTop: spacing.xs,
  },
  hintText: { ...typography.bodySm, color: commonColors.white, textAlign: 'center', lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: commonColors.white,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm2,
    marginTop: spacing.sm,
  },
  retryText: { ...typography.button, color: gestanteColors.primary, fontWeight: '700' },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  footerText: { ...typography.caption, color: commonColors.onColorTextFaint },
});

export default MaintenanceScreen;
