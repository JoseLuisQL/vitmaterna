import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Activity
} from 'lucide-react-native';
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
  <Pressable onPress={onPress} style={styles.menuItem}>
    <View style={styles.menuItemLeft}>
      {icon}
      <Text style={[styles.menuItemTitle, danger && styles.menuItemDanger]}>{title}</Text>
    </View>
    <ChevronRight size={18} color="#94A3B8" />
  </Pressable>
);

export default function PerfilScreen(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Gestante';
  const initials = (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || 'G';

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileRole}>Gestante</Text>
          {user?.dni && <Text style={styles.profileDni}>DNI: {user.dni}</Text>}
        </View>

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User size={20} color="#7C3AED" />} title="Datos Personales" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Activity size={20} color="#7C3AED" />} title="Mi Progreso" onPress={() => router.push('/(gestante)/(tabs)/mi-progreso')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Bell size={20} color="#7C3AED" />} title="Notificaciones" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<Settings size={20} color="#7C3AED" />} title="Configuración" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color="#7C3AED" />} title="Privacidad y Seguridad" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color="#7C3AED" />} title="Ayuda y Soporte" onPress={() => {}} />
        </View>

        <View style={[styles.menuCard, { marginTop: 12 }]}>
          <MenuItem icon={<LogOut size={20} color="#EF4444" />} title="Cerrar Sesión" danger onPress={handleLogout} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
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
  headerTitle: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  content: { paddingHorizontal: 20 },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { fontFamily: typography.h1.fontFamily, fontSize: 32, fontWeight: '800', color: '#7C3AED' },
  profileName: { fontFamily: typography.h2.fontFamily, fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  profileRole: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B' },
  profileDni: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8', marginTop: 8 },
  sectionTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 16, marginBottom: 8 },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuItemTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '600', color: '#0F172A' },
  menuItemDanger: { color: '#EF4444' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 56 },
});
