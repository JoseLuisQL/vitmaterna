/**
 * VITMATERNA - Gestante Profile Screen
 * Displays gestante profile menu and allows editing personal/clinical data (FUM, dates).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, TextInput, ActivityIndicator, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Activity, Home, CloudOff
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { useMyProfile, useUpdatePatient, useUpdateNotificationPreferences } from '../../../src/services/api-queries';
import { ProfileInfoModal, useToast, AppModal, AppButton } from '../../../src/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { usePendingSync } from '../../../src/hooks/usePendingSync';

const BRAND = gestanteColors.primary;

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
    <ChevronRight size={18} color={commonColors.textTertiary} />
  </Pressable>
);

export default function PerfilScreen(): React.ReactElement {
  const { user: authUser, logout } = useAuthStore();
  const pendingSync = usePendingSync();
  const toast = useToast();
  const router = useRouter();

  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = useMyProfile();
  const updatePatientMutation = useUpdatePatient();
  const updatePrefsMutation = useUpdateNotificationPreferences();

  // Preferencias de notificación (RF-7.13)
  const [isPrefsVisible, setIsPrefsVisible] = useState(false);
  const [prefPush, setPrefPush] = useState(true);
  const [prefSms, setPrefSms] = useState(true);
  const [prefWhatsapp, setPrefWhatsapp] = useState(true);

  // Modal & Form States
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [fum, setFum] = useState('');
  const [infoModal, setInfoModal] = useState<{ title: string; description?: string; rows?: { label: string; value: string }[] } | null>(null);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const abrirNotificaciones = () => {
    const prefs = (profileData?.user?.notificationPreferences ?? {}) as { push?: boolean; sms?: boolean; whatsapp?: boolean };
    setPrefPush(prefs.push ?? true);
    setPrefSms(prefs.sms ?? true);
    setPrefWhatsapp(prefs.whatsapp ?? true);
    setIsPrefsVisible(true);
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

  const abrirConfiguracion = () => setInfoModal({
    title: 'Configuración de cuenta',
    description: 'Configuración segura para tu cuenta de gestante.',
    rows: [
      { label: 'Sesión', value: 'Persistente con token seguro' },
      { label: 'Privacidad', value: 'Tus datos clínicos solo son visibles para el personal autorizado' },
      { label: 'Soporte', value: 'Usa el chat para consultas no urgentes' },
    ],
  });

  const abrirPrivacidad = () => setInfoModal({
    title: 'Privacidad y seguridad',
    description: 'VITMATERNA protege tus datos personales y de salud con autenticación, roles y validación de acceso.',
    rows: [
      { label: 'Datos sensibles', value: 'Historial clínico, controles, tratamientos y tamizajes' },
      { label: 'Acceso', value: 'Solo tú y el equipo clínico autorizado' },
      { label: 'Trazabilidad', value: 'Las acciones importantes quedan registradas para auditoría' },
    ],
  });

  const mostrarAyuda = () => setInfoModal({
    title: 'Ayuda y soporte',
    description: 'Para consultas comunícate con tu obstetra desde el chat de la app. Si es urgente, llama o acude al centro de salud.',
    rows: [
      { label: 'Centro de Salud Talavera', value: '083 - 421800' },
      { label: 'Emergencia', value: 'Usa el botón de emergencia o el asistente 24/7' },
    ],
  });

  const openEditModal = () => {
    if (!profileData) {
      return Alert.alert('Cargando', 'Los datos del perfil se están descargando. Intenta en un momento.');
    }
    const { user, profile } = profileData;
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setPhone(user?.phone || '');
    setEmail(user?.email || '');
    
    const formatDate = (dateStr?: string) => {
      if (!dateStr) return '';
      return dateStr.split('T')[0];
    };
    
    setFechaNacimiento(formatDate(profile?.fechaNacimiento));
    setFum(formatDate(profile?.fum));
    setIsEditModalVisible(true);
  };

  const handleSave = () => {
    if (!firstName || !lastName) {
      return Alert.alert('Error', 'Nombres y Apellidos son campos obligatorios.');
    }
    
    if (!fechaNacimiento) {
      return Alert.alert('Error', 'La fecha de nacimiento es obligatoria.');
    }

    // Date formats (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(fechaNacimiento)) {
      return Alert.alert('Error', 'La fecha de nacimiento debe estar en formato YYYY-MM-DD.');
    }
    if (fum && !dateRegex.test(fum)) {
      return Alert.alert('Error', 'La fecha FUM debe estar en formato YYYY-MM-DD.');
    }

    if (!profileData?.profile?.id) {
      return Alert.alert('Error', 'No se ha podido localizar el identificador de tu perfil clínico.');
    }

    updatePatientMutation.mutate({
      id: profileData.profile.id,
      data: {
        firstName,
        lastName,
        phone: phone || null,
        email: email || null,
        fechaNacimiento: new Date(fechaNacimiento).toISOString(),
        fum: fum ? new Date(fum).toISOString() : null,
      }
    }, {
      onSuccess: () => {
        toast.success('Datos guardados', 'Tu perfil y cronograma prenatal se actualizaron correctamente.');
        setIsEditModalVisible(false);
        refetchProfile();
      },
      onError: (err: any) => {
        console.error('Update profile error:', err);
        const serverError = err.response?.data?.error;
        let msg = 'No se pudieron guardar tus cambios.';
        if (serverError) {
          msg = serverError.message;
          if (serverError.details && Array.isArray(serverError.details)) {
            const detailMsgs = serverError.details.map((d: any) => `${d.field}: ${d.message}`).join('\n');
            msg += `\n\nDetalles:\n${detailMsgs}`;
          }
        }
        toast.error('No se pudo guardar', msg);
      }
    });
  };

  const isSaving = updatePatientMutation.isPending;

  const displayName = profileData?.user?.firstName && profileData?.user?.lastName 
    ? `${profileData.user.firstName} ${profileData.user.lastName}` 
    : authUser?.firstName && authUser?.lastName 
      ? `${authUser.firstName} ${authUser.lastName}` 
      : 'Gestante';

  const initials = (profileData?.user?.firstName?.charAt(0) || authUser?.firstName?.charAt(0) || '') + 
    (profileData?.user?.lastName?.charAt(0) || authUser?.lastName?.charAt(0) || '') || 'G';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gestanteColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <View style={styles.headerProfile}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileRole}>Gestante</Text>
            {profileData?.user?.dni && <Text style={styles.profileDni}>DNI: {profileData.user.dni}</Text>}
            {pendingSync > 0 && (
              <View style={styles.syncChip}>
                <CloudOff size={13} color={commonColors.white} />
                <Text style={styles.syncChipText}>
                  {pendingSync} cambio{pendingSync > 1 ? 's' : ''} por sincronizar
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isProfileLoading && (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={BRAND} />
            <Text style={styles.loadingText}>Cargando datos de perfil...</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User size={20} color={BRAND} />} title="Datos Personales y FUM" onPress={openEditModal} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Activity size={20} color={BRAND} />} title="Mi Progreso" onPress={() => router.push('/(gestante)/(tabs)/mi-progreso')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Home size={20} color={BRAND} />} title="Visitas Domiciliarias" onPress={() => router.push('/(gestante)/visitas')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Bell size={20} color={BRAND} />} title="Notificaciones" onPress={abrirNotificaciones} />
        </View>

        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<Settings size={20} color={BRAND} />} title="Configuración" onPress={abrirConfiguracion} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color={BRAND} />} title="Privacidad y Seguridad" onPress={abrirPrivacidad} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color={BRAND} />} title="Ayuda y Soporte" onPress={mostrarAyuda} />
        </View>

        <View style={[styles.menuCard, { marginTop: spacing.sm + 4 }]}>
          <MenuItem icon={<LogOut size={20} color={semanticColors.danger} />} title="Cerrar Sesión" danger onPress={handleLogout} />
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* MODAL: EDIT DATA & FUM */}
      <AppModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        title="Modificar Perfil y FUM"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsEditModalVisible(false)} style={{ flex: 1 }} disabled={isSaving} />
            <AppButton title="Guardar Datos" onPress={handleSave} style={{ flex: 1 }} themeColor={BRAND} disabled={isSaving} loading={isSaving} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Nombres *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nombres"
              placeholderTextColor={commonColors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Apellidos *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Apellidos"
              placeholderTextColor={commonColors.textTertiary}
              value={lastName}
              onChangeText={setLastName}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Teléfono</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. +51999888777"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Correo Electrónico</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. correo@servidor.com"
              placeholderTextColor={commonColors.textTertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Fecha de Nacimiento (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. 1998-08-25"
              placeholderTextColor={commonColors.textTertiary}
              value={fechaNacimiento}
              onChangeText={setFechaNacimiento}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Fecha Última Menstruación (FUM) (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. 2026-03-17"
              placeholderTextColor={commonColors.textTertiary}
              value={fum}
              onChangeText={setFum}
            />
            <Text style={styles.hintText}>
              Nota: Modificar tu FUM reprogramará automáticamente tu cronograma de 8 controles prenatales MINSA.
            </Text>
          </View>
        </View>
      </AppModal>

      {/* MODAL: PREFERENCIAS DE NOTIFICACIÓN (RF-7.13) */}
      <AppModal
        visible={isPrefsVisible}
        onClose={() => setIsPrefsVisible(false)}
        title="Preferencias de notificación"
        subtitle="Elige por qué canales quieres recibir recordatorios y alertas."
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
            <Switch value={prefPush} onValueChange={setPrefPush} trackColor={{ false: commonColors.border, true: gestanteColors.primaryLight }} thumbColor={prefPush ? BRAND : commonColors.textSecondary} />
          </View>
          <View style={styles.prefRow}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>SMS</Text>
              <Text style={styles.prefDesc}>Mensajes de texto a tu teléfono</Text>
            </View>
            <Switch value={prefSms} onValueChange={setPrefSms} trackColor={{ false: commonColors.border, true: gestanteColors.primaryLight }} thumbColor={prefSms ? BRAND : commonColors.textSecondary} />
          </View>
          <View style={[styles.prefRow, { borderBottomWidth: 0 }]}>
            <View style={styles.prefTextWrap}>
              <Text style={styles.prefLabel}>WhatsApp</Text>
              <Text style={styles.prefDesc}>Recordatorios y tips por WhatsApp</Text>
            </View>
            <Switch value={prefWhatsapp} onValueChange={setPrefWhatsapp} trackColor={{ false: commonColors.border, true: gestanteColors.primaryLight }} thumbColor={prefWhatsapp ? BRAND : commonColors.textSecondary} />
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
  headerTitle: {
    ...typography.h1,
    color: commonColors.white,
  },
  headerProfile: { alignItems: 'center', marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: layout.tabBarSpace, paddingTop: spacing.lg },
  loadingCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  loadingText: {
    marginTop: 10,
    ...typography.bodySmall,
    color: commonColors.textSecondary,
  },
  profileCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.display, color: commonColors.white },
  profileName: { ...typography.h3, color: commonColors.white, marginBottom: 4, textAlign: 'center' },
  profileRole: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)' },
  profileDni: { ...typography.caption, color: 'rgba(255,255,255,0.75)', marginTop: spacing.xs },
  syncChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 5,
    marginTop: spacing.sm2,
  },
  syncChipText: { ...typography.caption, color: commonColors.white, fontWeight: '600' },
  sectionTitle: { ...typography.label, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: spacing.md, marginBottom: spacing.sm },
  menuCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  menuItemTitle: { ...typography.bodyMedium, color: commonColors.text },
  menuItemDanger: { color: semanticColors.danger },
  menuDivider: { height: 1, backgroundColor: commonColors.border, marginLeft: 56 },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    width: '100%',
    maxHeight: '85%',
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: commonColors.border,
    paddingBottom: spacing.md,
  },
  modalHeader: {
    ...typography.h3,
    color: commonColors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: commonColors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFieldGroup: {
    gap: 6,
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.caption,
    fontFamily: typography.label.fontFamily,
    fontWeight: '600',
    color: commonColors.textSecondary,
  },
  textInput: {
    backgroundColor: commonColors.background,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    ...typography.bodySmall,
    fontSize: 15,
    color: commonColors.text,
  },
  hintText: {
    ...typography.overline,
    fontWeight: typography.caption.fontWeight,
    letterSpacing: 0,
    color: commonColors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm + 4,
    marginTop: spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.label,
    color: commonColors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  saveBtnText: {
    ...typography.label,
    fontWeight: '700',
    color: commonColors.surface,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
    gap: spacing.md,
  },
  prefTextWrap: { flex: 1 },
  prefLabel: { ...typography.bodyMedium, color: commonColors.text },
  prefDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  prefHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.md, lineHeight: 18 },
});
