/**
 * VITMATERNA - Gestante Profile Screen
 * Displays gestante profile menu and allows editing personal/clinical data (FUM, dates).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, StatusBar, Modal, TextInput, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  User, Settings, Bell, Shield, HelpCircle, LogOut, ChevronRight, Activity, X
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../../src/store/authStore';
import { useMyProfile, useUpdatePatient } from '../../../src/services/api-queries';
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
  const { user: authUser, logout } = useAuthStore();
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

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  const proximamente = (titulo: string) =>
    Alert.alert(titulo, 'Esta sección estará disponible en una próxima actualización.');

  const mostrarAyuda = () =>
    Alert.alert(
      'Ayuda y Soporte',
      'Para consultas comunícate con tu obstetra desde el chat de la app.\n\nCentro de Salud Talavera\nTeléfono: 083 - 421800'
    );

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
        Alert.alert(
          'Datos Guardados', 
          'Tus datos y cronograma de controles prenatales se han auto-actualizado exitosamente.'
        );
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
        Alert.alert('Error', msg);
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
            <ActivityIndicator size="small" color="#7C3AED" />
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
          <MenuItem icon={<User size={20} color="#7C3AED" />} title="Datos Personales y FUM" onPress={openEditModal} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Activity size={20} color="#7C3AED" />} title="Mi Progreso" onPress={() => router.push('/(gestante)/(tabs)/mi-progreso')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Bell size={20} color="#7C3AED" />} title="Notificaciones" onPress={() => proximamente('Notificaciones')} />
        </View>

        <Text style={styles.sectionTitle}>Preferencias</Text>
        <View style={styles.menuCard}>
          <MenuItem icon={<Settings size={20} color="#7C3AED" />} title="Configuración" onPress={() => proximamente('Configuración')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<Shield size={20} color="#7C3AED" />} title="Privacidad y Seguridad" onPress={() => proximamente('Privacidad y Seguridad')} />
          <View style={styles.menuDivider} />
          <MenuItem icon={<HelpCircle size={20} color="#7C3AED" />} title="Ayuda y Soporte" onPress={mostrarAyuda} />
        </View>

        <View style={[styles.menuCard, { marginTop: 12 }]}>
          <MenuItem icon={<LogOut size={20} color="#EF4444" />} title="Cerrar Sesión" danger onPress={handleLogout} />
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
                <X size={24} color="#64748B" />
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
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar Datos</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  loadingText: {
    marginTop: 10,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: '#64748B',
  },
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
  profileName: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 4, textAlign: 'center' },
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

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    width: '100%',
    maxHeight: '85%',
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 16,
  },
  modalHeader: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFieldGroup: {
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  hintText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#BE185D', // Pink matching gestante branding
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  saveBtnText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
