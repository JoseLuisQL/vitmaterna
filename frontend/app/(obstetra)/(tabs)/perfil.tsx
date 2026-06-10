import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Stethoscope } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { typography } from '../../../src/theme/typography';

interface MenuItemProps {
  icon: React.ReactElement;
  title: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress, danger }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
    <View style={styles.menuItemLeft}>
      <View style={[styles.menuIconWrap, danger && { backgroundColor: '#FEF2F2' }]}>
        {icon}
      </View>
      <Text style={[styles.menuItemTitle, danger && styles.menuItemDanger]}>{title}</Text>
    </View>
    <ChevronRight size={20} color="#94A3B8" />
  </Pressable>
);

export default function ObstetraPerfilScreen(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

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
            <Stethoscope size={16} color="#BE185D" />
            <Text style={styles.profileRole}>Obstetra</Text>
          </View>
          {user?.dni && (
            <Text style={styles.profileDni}>DNI: {user.dni}</Text>
          )}
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User size={20} color="#BE185D" />} title="Datos Profesionales" onPress={() => { }} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Bell size={20} color="#BE185D" />} title="Notificaciones" onPress={() => { }} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Settings size={20} color="#BE185D" />} title="Configuración" onPress={() => { }} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color="#BE185D" />} title="Privacidad y Seguridad" onPress={() => { }} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color="#BE185D" />} title="Ayuda y Soporte" onPress={() => { }} />
        </View>

        <View style={[styles.menuCard, { marginTop: 24 }]}>
          <MenuItem icon={<LogOut size={20} color="#EF4444" />} title="Cerrar Sesión" danger onPress={handleLogout} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: {
    paddingBottom: 24,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }), fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), fontSize: 16, color: '#64748B' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.02,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FDF2F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontFamily: typography.h1.fontFamily, fontSize: 28, fontWeight: '800', color: '#BE185D' },
  profileName: { fontFamily: typography.h2.fontFamily, fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  profileRole: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '600', color: '#BE185D' },
  profileDni: { fontFamily: typography.caption.fontFamily, fontSize: 14, color: '#64748B' },
  sectionTitle: { fontFamily: typography.caption.fontFamily, fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 12, marginLeft: 16, letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  menuItemPressed: { backgroundColor: '#F8FAFC' },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FDF2F8', alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  menuItemDanger: { color: '#EF4444' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 76 },
});
