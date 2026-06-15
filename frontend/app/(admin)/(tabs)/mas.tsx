/**
 * VITMATERNA - Admin "Más"
 *
 * Agrupa las funciones administrativas de uso esporádico (sedes, configuración
 * del sistema y auditoría/backup) para que la barra inferior priorice lo
 * frecuente (Usuarios y Contenido). Incluye cerrar sesión.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Building2, Settings, ShieldAlert, LogOut, ChevronRight, Bell, TrendingUp, Baby, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../../../src/store/authStore';
import { useToast, ThemeToggle } from '../../../src/components/ui';
import { confirmAction } from '../../../src/utils/confirm';
import { commonColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';

const BRAND = adminColors.primary;

interface MenuItemProps {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, subtitle, onPress, danger }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    accessibilityRole="button"
    accessibilityLabel={title}
    accessibilityHint={subtitle}
  >
    <View style={[styles.menuIconWrap, danger && { backgroundColor: semanticColors.dangerLight }]}>{icon}</View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuTitle, danger && { color: semanticColors.danger }]}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    {!danger && <ChevronRight size={18} color={commonColors.textTertiary} />}
  </Pressable>
);

export default function AdminMasScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { logout } = useAuthStore();

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: 'Cerrar Sesión',
      message: '¿Seguro que deseas cerrar tu sesión de administrador?',
      confirmText: 'Cerrar Sesión',
    });
    if (!ok) return;
    await logout();
    toast.info('Sesión cerrada', 'Has salido de VITMATERNA correctamente.');
    router.replace('/(auth)/login');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Más</Text>
          <Text style={styles.headerSubtitle}>Administración del sistema</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Supervisión — datos clínicos en modo lectura */}
        <Text style={styles.sectionTitle}>Supervisión</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<TrendingUp size={20} color={BRAND} />}
            title="Reportes e indicadores"
            subtitle="KPIs clínicos y MINSA del sistema"
            onPress={() => router.push('/(admin)/supervision/reportes')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Baby size={20} color={BRAND} />}
            title="Gestantes"
            subtitle="Todas las gestantes registradas"
            onPress={() => router.push('/(admin)/supervision/gestantes')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Calendar size={20} color={BRAND} />}
            title="Citas"
            subtitle="Agenda global del sistema"
            onPress={() => router.push('/(admin)/supervision/citas')}
          />
        </View>

        {/* Sistema */}
        <Text style={styles.sectionTitle}>Sistema</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<Building2 size={20} color={BRAND} />}
            title="Sedes"
            subtitle="Establecimientos de salud y altitud"
            onPress={() => router.push('/(admin)/(tabs)/sedes')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Settings size={20} color={BRAND} />}
            title="Configuración"
            subtitle="Parámetros del sistema"
            onPress={() => router.push('/(admin)/(tabs)/config')}
          />
          <View style={styles.divider} />
          <MenuItem
            icon={<Bell size={20} color={BRAND} />}
            title="Notificaciones"
            subtitle="SMS y WhatsApp (credenciales y prueba)"
            onPress={() => router.push('/(admin)/(tabs)/notificaciones')}
          />
        </View>

        {/* Seguridad */}
        <Text style={styles.sectionTitle}>Seguridad</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<ShieldAlert size={20} color={BRAND} />}
            title="Auditoría y backup"
            subtitle="Registro de acciones y respaldo de datos"
            onPress={() => router.push('/(admin)/(tabs)/auditoria')}
          />
        </View>

        {/* Apariencia */}
        <Text style={styles.sectionTitle}>Apariencia</Text>
        <View style={[styles.menuCard, { padding: spacing.sm2 }]}>
          <ThemeToggle accentColor={BRAND} />
        </View>

        {/* Cuenta */}
        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <MenuItem
            icon={<LogOut size={20} color={semanticColors.danger} />}
            title="Cerrar Sesión"
            subtitle="Salir de tu cuenta"
            onPress={handleLogout}
            danger
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl, paddingBottom: spacing.lg },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  headerTitle: { ...typography.h1, color: commonColors.white },
  headerSubtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: spacing.md },
  menuCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, overflow: 'hidden', borderWidth: 1, borderColor: commonColors.border },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuItemPressed: { backgroundColor: commonColors.surfaceAlt },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { ...typography.bodyMedium, color: commonColors.text },
  menuSubtitle: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  divider: { height: 1, backgroundColor: commonColors.borderLight, marginLeft: 76 },
});
