/**
 * VITMATERNA — Perfil del administrador.
 *
 * Pantalla de cuenta del admin: ver sus datos, editarlos (nombre, teléfono,
 * correo) y cerrar sesión. Mantiene el mismo patrón visual que los perfiles de
 * gestante y obstetra (ScreenLayout + tarjeta + menú), con el acento del rol.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { UserCog, LogOut, ChevronRight, ShieldCheck, Compass, FileText } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/authStore';
import { useToast, AppModal, AppButton } from '../../src/components/ui';
import { useUpdateMyAccount } from '../../src/services/api-queries';
import { ScreenLayout } from '../../src/components/layout/ScreenLayout';
import { useRestartTour } from '../../src/components/tour/useRestartTour';
import { openManual } from '../../src/utils/openManual';
import { confirmAction } from '../../src/utils/confirm';
import { goBack } from '../../src/utils/navigation';
import { useResponsive } from '../../src/theme/responsive';
import { commonColors, adminColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const BRAND = adminColors.primary;

interface MenuItemProps {
  icon: React.ReactElement;
  title: string;
  onPress: () => void;
  danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon, title, onPress, danger }) => (
  <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
    <View style={styles.menuItemLeft}>
      <View style={[styles.menuIconWrap, danger && { backgroundColor: semanticColors.dangerLight }]}>{icon}</View>
      <Text style={[styles.menuItemTitle, danger && styles.menuItemDanger]}>{title}</Text>
    </View>
    <ChevronRight size={20} color={commonColors.textTertiary} />
  </Pressable>
);

export default function AdminPerfilScreen(): React.ReactElement {
  const { user, logout } = useAuthStore();
  const { webShell } = useResponsive();
  const toast = useToast();
  const router = useRouter();
  const restartTour = useRestartTour();

  const updateAccount = useUpdateMyAccount();
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const abrirEdicion = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
    setEmail(user?.email || '');
    setIsEditVisible(true);
  };

  const handleSaveAccount = () => {
    if (!firstName.trim() || !lastName.trim()) {
      return toast.error('Datos incompletos', 'Nombres y apellidos son obligatorios.');
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return toast.error('Correo inválido', 'Revisa el formato del correo electrónico.');
    }
    updateAccount.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Datos actualizados', 'Tu información se guardó correctamente.');
          setIsEditVisible(false);
        },
        onError: () => toast.error('No se pudo guardar', 'Inténtalo nuevamente en unos momentos.'),
      },
    );
  };

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: 'Cerrar sesión',
      message: '¿Seguro que deseas salir de tu cuenta?',
      confirmText: 'Cerrar sesión',
      destructive: true,
    });
    if (!ok) return;
    await logout();
    router.replace('/(auth)/login');
  };

  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Administrador';
  const initials = (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || 'A';

  return (
    <View style={styles.container}>
      <ScreenLayout
        role="admin"
        title="Mi Perfil"
        subtitle="Ajustes de cuenta"
        showBack
        onBack={() => goBack(router, '/(admin)/(tabs)' as any)}
        width="full"
        accentColor={BRAND}
      >
        <View style={webShell ? styles.twoCol : undefined}>
          <View style={webShell ? styles.col : undefined}>
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
              <Text style={styles.profileName}>{displayName}</Text>
              <View style={styles.roleRow}>
                <ShieldCheck size={16} color={BRAND} />
                <Text style={styles.profileRole}>Administrador</Text>
              </View>
              {user?.dni && <Text style={styles.profileDni}>DNI: {user.dni}</Text>}
              {user?.email && <Text style={styles.profileDni}>{user.email}</Text>}
            </View>
          </View>

          <View style={webShell ? styles.col : undefined}>
            <Text style={styles.sectionTitle}>General</Text>
            <View style={styles.menuCard}>
              <MenuItem icon={<UserCog size={20} color={BRAND} />} title="Editar mis datos" onPress={abrirEdicion} />
              <View style={styles.menuDivider} />
              <MenuItem icon={<Compass size={20} color={BRAND} />} title="Conoce tu app" onPress={restartTour} />
              <View style={styles.menuDivider} />
              <MenuItem icon={<FileText size={20} color={BRAND} />} title="Manual de usuario" onPress={() => openManual('admin')} />
            </View>

            <View style={[styles.menuCard, { marginTop: spacing.lg }]}>
              <MenuItem icon={<LogOut size={20} color={semanticColors.danger} />} title="Cerrar Sesión" danger onPress={handleLogout} />
            </View>
          </View>
        </View>
      </ScreenLayout>

      <AppModal
        visible={isEditVisible}
        onClose={() => setIsEditVisible(false)}
        title="Editar mis datos"
        subtitle="Actualiza tu nombre, teléfono y correo."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsEditVisible(false)} style={{ flex: 1 }} disabled={updateAccount.isPending} />
            <AppButton title="Guardar" onPress={handleSaveAccount} style={{ flex: 1 }} themeColor={BRAND} loading={updateAccount.isPending} />
          </>
        }
      >
        <View style={{ gap: spacing.sm2 }}>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nombres *</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Nombres" placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Apellidos *</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Apellidos" placeholderTextColor={commonColors.textTertiary} />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Teléfono</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="ej. +51999888777" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
          </View>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Correo electrónico</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="ej. correo@servidor.com" placeholderTextColor={commonColors.textTertiary} keyboardType="email-address" autoCapitalize="none" />
          </View>
        </View>
      </AppModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  profileCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: adminColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.h1, color: BRAND },
  profileName: { ...typography.h2, color: commonColors.text, marginBottom: 4 },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  profileRole: { ...typography.bodySm, fontWeight: '600', color: BRAND },
  profileDni: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm2, marginLeft: spacing.md, letterSpacing: 0.5 },
  menuCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xxl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuDivider: { height: 1, backgroundColor: commonColors.borderLight, marginLeft: 56 },
  menuItemPressed: { backgroundColor: commonColors.surfaceAlt },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  menuItemTitle: { ...typography.bodyMd, color: commonColors.text },
  menuItemDanger: { color: semanticColors.danger },
  fieldGroup: { gap: 6 },
  fieldLabel: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  input: {
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    ...typography.bodyMd,
    color: commonColors.text,
  },
  twoCol: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  col: { flex: 1, minWidth: 0 },
});
