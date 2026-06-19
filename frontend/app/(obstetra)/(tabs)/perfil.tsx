import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, StatusBar, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Stethoscope, ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { ProfileInfoModal, useToast, AppModal, AppButton } from '../../../src/components/ui';
import { useMyProfile, useUpdateNotificationPreferences, useChannelsStatus } from '../../../src/services/api-queries';
import { LinearGradient } from 'expo-linear-gradient';
import { commonColors, obstetraColors, semanticColors } from '../../../src/theme/colors';
import { layout, spacing, borderRadius } from '../../../src/theme/spacing';
import { WebMaxWidth } from '../../../src/components/web';
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
  const toast = useToast();
  const router = useRouter();
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

  const abrirConfiguracion = () => setInfoModal({
    title: 'Configuración profesional',
    description: 'Parámetros operativos de tu cuenta de obstetra.',
    rows: [
      { label: 'Panel', value: 'Gestantes activas, cronograma, alertas y reportes' },
      { label: 'Acceso', value: 'Autorizado por rol obstetra' },
      { label: 'Edición clínica', value: 'Controles, laboratorio, vacunas, tratamientos y tamizajes' },
    ],
  });

  const abrirPrivacidad = () => setInfoModal({
    title: 'Privacidad y seguridad',
    description: 'Los datos de salud son sensibles. El sistema aplica autenticación, RBAC y auditoría para protegerlos.',
    rows: [
      { label: 'RBAC', value: 'Solo accedes a funciones clínicas autorizadas' },
      { label: 'Auditoría', value: 'Las acciones administrativas y clínicas quedan registradas' },
      { label: 'Recomendación', value: 'No compartas tu cuenta ni tokens de acceso' },
    ],
  });

  const abrirAyuda = () => setInfoModal({
    title: 'Ayuda y soporte',
    description: 'Guía rápida para operar los módulos clínicos principales.',
    rows: [
      { label: 'Gestantes', value: 'Registra y actualiza datos clínicos desde la ficha' },
      { label: 'Alertas', value: 'Atiende o deriva signos de alarma desde la bandeja' },
      { label: 'Mensajes', value: 'Usa consultas o mensaje masivo para comunicados' },
    ],
  });

  const verDatosProfesionales = () =>
    setInfoModal({
      title: 'Datos profesionales',
      rows: [
        { label: 'Nombre', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '—' },
        { label: 'DNI', value: user?.dni || '—' },
        { label: 'Rol', value: 'Obstetra' },
      ],
    });

  const displayName = user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Obstetra';
  const initials = (user?.firstName?.charAt(0) || '') + (user?.lastName?.charAt(0) || '') || 'O';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={obstetraColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(obstetra)/(tabs)'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Mi Perfil</Text>
              <Text style={styles.headerSubtitle}>Ajustes de cuenta</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="readable">
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
          <MenuItem icon={<Bell size={20} color={BRAND} />} title="Notificaciones" onPress={abrirNotificaciones} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Settings size={20} color={BRAND} />} title="Configuración" onPress={abrirConfiguracion} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color={BRAND} />} title="Privacidad y Seguridad" onPress={abrirPrivacidad} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color={BRAND} />} title="Ayuda y Soporte" onPress={abrirAyuda} />
        </View>

        <View style={[styles.menuCard, { marginTop: 24 }]}>
          <MenuItem icon={<LogOut size={20} color={semanticColors.danger} />} title="Cerrar Sesión" danger onPress={handleLogout} />
        </View>
        </WebMaxWidth>
      </ScrollView>

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
  headerWrapper: {
    paddingBottom: spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  headerTitle: { ...typography.h1, color: commonColors.white, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)' },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: layout.tabBarSpace, paddingTop: 16 },
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
  // Preferencias de notificación
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight, gap: spacing.md },
  prefTextWrap: { flex: 1 },
  prefLabel: { ...typography.bodyMedium, color: commonColors.text },
  prefLabelDisabled: { color: commonColors.textTertiary },
  prefDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  prefHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.md, lineHeight: 18 },
});
