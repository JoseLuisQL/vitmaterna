import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput } from 'react-native';
import { UserCog, Bell, HelpCircle, LogOut, ChevronRight, Stethoscope, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { ProfileInfoModal, useToast, AppModal, AppButton } from '../../../src/components/ui';
import { useMyProfile, useUpdateNotificationPreferences, useUpdateMyAccount, useChannelsStatus } from '../../../src/services/api-queries';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { layout, spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../../src/theme/responsive';
import { useRestartTour } from '../../../src/components/tour/useRestartTour';

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
  const { webShell } = useResponsive();
  const toast = useToast();
  const router = useRouter();
  const restartTour = useRestartTour();
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string; rows?: { label: string; value: string }[] } | null>(null);

  // Preferencias de notificación reales (canales) + disponibilidad de canales.
  const { data: profileData, refetch: refetchProfile } = useMyProfile();
  const updatePrefsMutation = useUpdateNotificationPreferences();
  const { data: channels } = useChannelsStatus();
  const smsAvailable = channels?.sms.configured ?? false;
  const whatsappAvailable = channels?.whatsapp.configured ?? false;

  const [isPrefsVisible, setIsPrefsVisible] = useState(false);
  const [prefPush, setPrefPush] = useState(true);
  const [prefSms, setPrefSms] = useState(true);
  const [prefWhatsapp, setPrefWhatsapp] = useState(true);

  // Edición de datos personales de la cuenta (nombre, teléfono, correo).
  const updateAccount = useUpdateMyAccount();
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Sincroniza los switches con las preferencias guardadas al abrir.
  useEffect(() => {
    const prefs = (profileData?.user?.notificationPreferences ?? (user as any)?.notificationPreferences ?? {}) as
      { push?: boolean; sms?: boolean; whatsapp?: boolean };
    setPrefPush(prefs.push ?? true);
    setPrefSms(prefs.sms ?? true);
    setPrefWhatsapp(prefs.whatsapp ?? true);
  }, [profileData, user]);

  const handleLogout = async () => {
    await logout();
    toast.info('Sesión cerrada', 'Has salido de VITMATERNA correctamente.');
    router.replace('/(auth)/login');
  };

  const handleSavePrefs = () => {
    updatePrefsMutation.mutate(
      { push: prefPush, sms: prefSms, whatsapp: prefWhatsapp },
      {
        onSuccess: () => {
          toast.success('Preferencias guardadas', 'Tus canales de notificación se actualizaron.');
          setIsPrefsVisible(false);
          refetchProfile();
        },
        onError: () => toast.error('Error', 'No se pudieron guardar tus preferencias.'),
      },
    );
  };

  const abrirNotificaciones = () => setIsPrefsVisible(true);

  const abrirEdicion = () => {
    const u = profileData?.user ?? user;
    setFirstName(u?.firstName || '');
    setLastName(u?.lastName || '');
    setPhone(u?.phone || '');
    setEmail(u?.email || '');
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
          refetchProfile();
        },
        onError: () => toast.error('No se pudo guardar', 'Inténtalo nuevamente en unos momentos.'),
      },
    );
  };

  const abrirAyuda = () => setInfoModal({
    title: 'Ayuda y soporte',
    description: 'Guía rápida para operar los módulos clínicos principales.',
    rows: [
      { label: 'Gestantes', value: 'Registra y actualiza datos clínicos desde la ficha' },
      { label: 'Alertas', value: 'Atiende o deriva signos de alarma desde la bandeja' },
      { label: 'Mensajes', value: 'Usa consultas o mensaje masivo para comunicados' },
    ],
  });

  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Obstetra';
  const initials = (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || 'O';

  return (
    <View style={styles.container}>
      <ScreenLayout
        role="obstetra"
        title="Mi Perfil"
        subtitle="Ajustes de cuenta"
        showBack={router.canGoBack()}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/(obstetra)/(tabs)'))}
        width="full"
        scroll={true}
        contentStyle={{ paddingBottom: layout.tabBarSpace, paddingTop: 16 }}
      >
        <View style={webShell ? styles.twoCol : undefined}>
          <View style={webShell ? styles.col : undefined}>
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
          </View>

          <View style={webShell ? styles.col : undefined}>
            {/* Menu Items */}
            <Text style={styles.sectionTitle}>General</Text>
            <View style={styles.menuCard}>
              <MenuItem icon={<UserCog size={20} color={BRAND} />} title="Editar mis datos" onPress={abrirEdicion} />
              <View style={styles.menuDivider} />
              <MenuItem icon={<Bell size={20} color={BRAND} />} title="Notificaciones" onPress={abrirNotificaciones} />
              <View style={styles.menuDivider} />
              <MenuItem icon={<HelpCircle size={20} color={BRAND} />} title="Ayuda y Soporte" onPress={abrirAyuda} />
              <View style={styles.menuDivider} />
              <MenuItem icon={<Compass size={20} color={BRAND} />} title="Ver el recorrido de nuevo" onPress={restartTour} />
            </View>

            <View style={[styles.menuCard, { marginTop: 24 }]}>
              <MenuItem icon={<LogOut size={20} color={semanticColors.danger} />} title="Cerrar Sesión" danger onPress={handleLogout} />
            </View>
          </View>
        </View>
      </ScreenLayout>

      {/* MODAL: EDITAR DATOS PERSONALES */}
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

      {/* MODAL: PREFERENCIAS DE NOTIFICACIÓN (canales) */}
      <AppModal
        visible={isPrefsVisible}
        onClose={() => setIsPrefsVisible(false)}
        title="Preferencias de notificación"
        subtitle="Elige por qué canales quieres recibir alertas y recordatorios."
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsPrefsVisible(false)} style={{ flex: 1 }} disabled={updatePrefsMutation.isPending} />
            <AppButton title="Guardar" onPress={handleSavePrefs} style={{ flex: 1 }} themeColor={BRAND} loading={updatePrefsMutation.isPending} />
          </>
        }
      >
        <View style={{ gap: 4 }}>
          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>Notificaciones en la app</Text>
              <Text style={styles.prefDesc}>Avisos push dentro de VITMATERNA</Text>
            </View>
            <Switch value={prefPush} onValueChange={setPrefPush} trackColor={{ false: commonColors.border, true: obstetraColors.primaryLight }} thumbColor={prefPush ? BRAND : commonColors.textSecondary} />
          </View>
          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={[styles.prefLabel, !smsAvailable && styles.prefLabelDisabled]}>SMS</Text>
              <Text style={styles.prefDesc}>
                {smsAvailable ? 'Mensajes de texto a tu teléfono' : 'No disponible — el administrador no ha configurado este canal'}
              </Text>
            </View>
            <Switch
              value={smsAvailable && prefSms}
              onValueChange={setPrefSms}
              disabled={!smsAvailable}
              trackColor={{ false: commonColors.border, true: obstetraColors.primaryLight }}
              thumbColor={smsAvailable && prefSms ? BRAND : commonColors.textSecondary}
            />
          </View>
          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <View style={styles.prefTextWrap}>
              <Text style={[styles.prefLabel, !whatsappAvailable && styles.prefLabelDisabled]}>WhatsApp</Text>
              <Text style={styles.prefDesc}>
                {whatsappAvailable ? 'Recordatorios y avisos por WhatsApp' : 'No disponible — el administrador no ha configurado este canal'}
              </Text>
            </View>
            <Switch
              value={whatsappAvailable && prefWhatsapp}
              onValueChange={setPrefWhatsapp}
              disabled={!whatsappAvailable}
              trackColor={{ false: commonColors.border, true: obstetraColors.primaryLight }}
              thumbColor={whatsappAvailable && prefWhatsapp ? BRAND : commonColors.textSecondary}
            />
          </View>
          <Text style={styles.prefHint}>Las alertas clínicas urgentes siempre se enviarán por seguridad.</Text>
        </View>
      </AppModal>

      <ProfileInfoModal
        visible={!!infoModal}
        title={infoModal?.title ?? ''}
        description={infoModal?.description}
        rows={infoModal?.rows}
        onClose={() => setInfoModal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
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
  profileRole: { ...typography.bodySm, fontFamily: typography.label.fontFamily, fontWeight: '600', color: BRAND },
  profileDni: { ...typography.bodySm, color: commonColors.textSecondary },
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
  menuItemTitle: { ...typography.bodyMd, color: commonColors.text },
  menuItemDanger: { color: semanticColors.danger },
  menuDivider: { height: 1, backgroundColor: commonColors.borderLight, marginLeft: 76 },
  // Preferencias de notificación
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight, gap: spacing.md },
  prefTextWrap: { flex: 1 },
  prefLabel: { ...typography.bodyMd, color: commonColors.text },
  prefLabelDisabled: { color: commonColors.textTertiary },
  prefDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  prefHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.md, lineHeight: 18 },
  // Edición de datos personales
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
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
});
