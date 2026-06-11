/**
 * VITMATERNA - Gestante Profile Screen
 * Displays gestante profile menu and allows editing personal/clinical data (FUM, dates).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, StatusBar, Modal, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Activity, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { useMyProfile, useUpdatePatient } from '../../../src/services/api-queries';
import { ProfileInfoModal, useToast } from '../../../src/components/ui';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

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
  const toast = useToast();
  const router = useRouter();

  const { data: profileData, isLoading: isProfileLoading, refetch: refetchProfile } = useMyProfile();
  const updatePatientMutation = useUpdatePatient();

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

  const abrirNotificaciones = () => setInfoModal({
    title: 'Preferencias de notificación',
    description: 'Tus recordatorios están activos para citas, tratamientos, signos de alarma y mensajes de la obstetra. Puedes modificar tus datos de contacto desde “Datos Personales y FUM”.',
    rows: [
      { label: 'Canales habilitados', value: 'Push en app, SMS y WhatsApp si el centro tiene credenciales activas' },
      { label: 'Momentos de aviso', value: '3 días antes, 1 día antes y alertas clínicas inmediatas' },
    ],
  });

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
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Perfil</Text>
        </SafeAreaView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isProfileLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={BRAND} />
            <Text style={styles.loadingText}>Cargando datos de perfil...</Text>
          </View>
        ) : (
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileRole}>Gestante</Text>
            {profileData?.user?.dni && <Text style={styles.profileDni}>DNI: {profileData.user.dni}</Text>}
          </View>
        )}

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<User size={20} color={BRAND} />} title="Datos Personales y FUM" onPress={openEditModal} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Activity size={20} color={BRAND} />} title="Mi Progreso" onPress={() => router.push('/(gestante)/(tabs)/mi-progreso')} />
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
      <Modal
        visible={isEditModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>Modificar Perfil y FUM</Text>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color={commonColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingBottom: 10 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Nombres *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nombres"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Apellidos *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Apellidos"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Teléfono</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. +51999888777"
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
                  value={fechaNacimiento}
                  onChangeText={setFechaNacimiento}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Fecha Última Menstruación (FUM) (YYYY-MM-DD) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. 2026-03-17"
                  value={fum}
                  onChangeText={setFum}
                />
                <Text style={styles.hintText}>
                  Nota: Modificar tu FUM reprogramará automáticamente tu cronograma de 8 controles prenatales MINSA.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsEditModalVisible(false)}
                disabled={isSaving}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSave} 
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={commonColors.surface} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar Datos</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.display,
    color: commonColors.text,
  },
  content: { paddingHorizontal: spacing.lg },
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
    backgroundColor: gestanteColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { ...typography.display, color: BRAND },
  profileName: { ...typography.h3, color: commonColors.text, marginBottom: 4, textAlign: 'center' },
  profileRole: { ...typography.bodySmall, color: commonColors.textSecondary },
  profileDni: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.sm },
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
});
