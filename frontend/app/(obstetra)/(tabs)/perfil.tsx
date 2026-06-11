import React from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Stethoscope } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

const BRAND = obstetraColors.primary;

interface MenuItemProps {
  icon: React.ReactElement;
  title: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress, danger }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
    <View style={styles.menuItemLeft}>
      <View style={[styles.menuIconWrap, danger && { backgroundColor: semanticColors.dangerLight }]}>
        {icon}
      </View>
      <Text style={[styles.menuItemTitle, danger && styles.menuItemDanger]}>{title}</Text>
    </View>
    <ChevronRight size={20} color={commonColors.textTertiary} />
  </Pressable>
);

export default function ObstetraPerfilScreen(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const proximamente = (titulo: string) =>
    Alert.alert(titulo, 'Esta sección estará disponible en una próxima actualización.');

  const verDatosProfesionales = () =>
    Alert.alert(
      'Datos Profesionales',
      `Nombre: ${user?.firstName || ''} ${user?.lastName || ''}\nDNI: ${user?.dni || '—'}\nRol: Obstetra`
    );

  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Obstetra';
  const initials = (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || 'O';

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mi Perfil</Text>
          <Text style={styles.headerSubtitle}>Ajustes de cuenta</Text>
        </SafeAreaView>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <View style={styles.roleRow}>
            <Stethoscope size={16} color={BRAND} />
            <Text style={styles.profileRole}>Obstetra</Text>
          </View>
          {user?.dni && (
            <Text style={styles.profileDni}>DNI: {user.dni}</Text>
          )}
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User size={20} color={BRAND} />} title="Datos Profesionales" onPress={verDatosProfesionales} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Bell size={20} color={BRAND} />} title="Notificaciones" onPress={() => proximamente('Notificaciones')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Settings size={20} color={BRAND} />} title="Configuración" onPress={() => proximamente('Configuración')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color={BRAND} />} title="Privacidad y Seguridad" onPress={() => proximamente('Privacidad y Seguridad')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color={BRAND} />} title="Ayuda y Soporte" onPress={() => proximamente('Ayuda y Soporte')} />
        </View>

        <View style={[styles.menuCard, { marginTop: 24 }]}>
          <MenuItem icon={<LogOut size={20} color={semanticColors.danger} />} title="Cerrar Sesión" danger onPress={handleLogout} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { ...typography.display, color: commonColors.text, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: commonColors.textSecondary },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: obstetraColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { ...typography.h1, color: BRAND },
  profileName: { ...typography.h2, color: commonColors.text, marginBottom: 4 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  profileRole: { ...typography.bodySmall, fontFamily: typography.label.fontFamily, fontWeight: '600', color: BRAND },
  profileDni: { ...typography.bodySmall, color: commonColors.textSecondary },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', marginBottom: 12, marginLeft: 16, letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  menuItemPressed: { backgroundColor: commonColors.surfaceAlt },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { ...typography.bodyMedium, color: commonColors.text },
  menuItemDanger: { color: semanticColors.danger },
  menuDivider: { height: 1, backgroundColor: commonColors.borderLight, marginLeft: 76 },
});
