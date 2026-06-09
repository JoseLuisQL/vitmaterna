/**
 * VITMATERNA - Admin Users Screen
 * Fetch and display all users with options to view detail and activate/deactivate.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TextInput, Modal, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, CheckCircle, UserPlus, ChevronRight, Plus, X, LogOut } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { commonColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useAdminUsers, useCreateUser, useToggleUserActive } from '../../../src/services/admin-queries';
import { useAuthStore } from '../../../src/store/authStore';
import { useRouter } from 'expo-router';

// ─── UTILS & SUBCOMPONENTS ────────────────────────────────────────────────────
function DetailRow({ label, value, isLast = false }: { label: string; value?: string | number | null; isLast?: boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <View style={[detailRowStyles.row, !isLast && detailRowStyles.border]}>
      <Text style={detailRowStyles.label}>{label}</Text>
      <Text style={detailRowStyles.value}>{value}</Text>
    </View>
  );
}

const detailRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9', // slate-100
  },
  label: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: '#64748B', // slate-500
    flex: 1,
    lineHeight: 20,
  },
  value: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A', // slate-900
    flex: 1.5,
    textAlign: 'right',
    lineHeight: 20,
  },
});

export default function UsuariosScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  
  const [debouncedSearch, setDebouncedSearch] = useState('');
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  const { data: users, isLoading, refetch } = useAdminUsers();
  const createUserMutation = useCreateUser();
  const toggleUserActiveMutation = useToggleUserActive();
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Está seguro de que desea cerrar la sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar Sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/(auth)/login');
            } catch (err) {
              Alert.alert('Error', 'No se pudo cerrar la sesión.');
            }
          }
        }
      ]
    );
  };

  // Modal States
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form States for creation
  const [dni, setDni] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cop, setCop] = useState('');
  const [role, setRole] = useState('obstetra');

  const handleToggleActive = (user: any) => {
    const actionText = user.isActive ? 'desactivar' : 'activar/aprobar';
    Alert.alert(
      'Confirmar Acción',
      `¿Está seguro de que desea ${actionText} a ${user.firstName} ${user.lastName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Confirmar', 
          onPress: () => {
            toggleUserActiveMutation.mutate(user.id, {
              onSuccess: (updatedRes) => {
                const newActive = updatedRes.data?.isActive ?? !user.isActive;
                Alert.alert('Éxito', `Usuario ${newActive ? 'activado' : 'desactivado'} correctamente.`);
                
                // Update selectedUser if open in modal
                if (selectedUser && selectedUser.id === user.id) {
                  setSelectedUser({ ...selectedUser, isActive: newActive });
                }
              },
              onError: (err: any) => {
                Alert.alert('Error', err.response?.data?.message || 'No se pudo cambiar el estado del usuario.');
              }
            });
          }
        }
      ]
    );
  };

  const handleCreateSubmit = () => {
    if (!dni || !firstName || !lastName || !password) {
      return Alert.alert('Error', 'Los campos marcados con (*) son obligatorios.');
    }
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      return Alert.alert('Error', 'El DNI debe tener exactamente 8 dígitos numéricos.');
    }
    if (role === 'obstetra' && !cop) {
      return Alert.alert('Error', 'El número de COP es obligatorio para obstetras.');
    }
    if (password.length < 8) {
      return Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres.');
    }

    createUserMutation.mutate({
      dni,
      firstName,
      lastName,
      phone: phone || undefined,
      email: email || undefined,
      password,
      role,
      cop: role === 'obstetra' ? cop : undefined,
    }, {
      onSuccess: () => {
        Alert.alert('Éxito', 'Usuario creado correctamente.');
        setIsCreateModalVisible(false);
        // Reset form
        setDni('');
        setFirstName('');
        setLastName('');
        setPhone('');
        setEmail('');
        setPassword('');
        setCop('');
        setRole('obstetra');
      },
      onError: (err: any) => {
        Alert.alert('Error', err.response?.data?.message || 'No se pudo crear el usuario.');
      }
    });
  };

  const isCreating = createUserMutation.isPending;

  const filteredUsers = users?.filter((u: any) => 
    u.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    u.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    u.dni?.includes(debouncedSearch)
  );

  const renderHeader = () => (
    <View style={{ paddingBottom: 16 }}>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
              <Text style={styles.headerSubtitle}>Administra los accesos y roles de la plataforma</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
              <LogOut size={22} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color="#94A3B8" style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setIsDetailModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={[
          styles.avatarCircle, 
          item.role === 'admin' ? styles.avatarAdmin : item.role === 'obstetra' ? styles.avatarObstetra : styles.avatarGestante
        ]}>
          <Text style={[
            styles.avatarText, 
            item.role === 'admin' ? styles.avatarTextAdmin : item.role === 'obstetra' ? styles.avatarTextObstetra : styles.avatarTextGestante
          ]}>
            {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.details}>DNI: {item.dni} • Rol: {item.role.toUpperCase()}</Text>
        </View>
        <AppBadge 
          label={item.isActive ? 'Activo' : 'Inactivo'} 
          variant={item.isActive ? 'success' : 'danger'} 
          size="sm" 
        />
        <ChevronRight size={20} color="#94A3B8" style={{ marginLeft: 12 }} />
      </View>
    </TouchableOpacity>
  );

  const renderDetailModal = () => {
    if (!selectedUser) return null;
    const user = selectedUser;
    
    const formatDate = (dateString?: string) => {
      if (!dateString) return '—';
      return new Date(dateString).toLocaleDateString('es-PE', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <Modal
        visible={isDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>Detalle de Usuario</Text>
              <TouchableOpacity onPress={() => setIsDetailModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingBottom: 20 }}>
              {/* Profile card summary */}
              <View style={styles.detailUserSummaryCard}>
                <View style={[
                  styles.detailAvatarCircle,
                  user.role === 'admin' ? styles.avatarAdmin : user.role === 'obstetra' ? styles.avatarObstetra : styles.avatarGestante
                ]}>
                  <Text style={[
                    styles.detailAvatarText,
                    user.role === 'admin' ? styles.avatarTextAdmin : user.role === 'obstetra' ? styles.avatarTextObstetra : styles.avatarTextGestante
                  ]}>
                    {(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}
                  </Text>
                </View>
                <Text style={styles.detailName}>{user.firstName} {user.lastName}</Text>
                <View style={styles.badgeRow}>
                  <AppBadge label={user.role.toUpperCase()} variant="info" />
                  <AppBadge 
                    label={user.isActive ? 'Activo' : 'Inactivo'} 
                    variant={user.isActive ? 'success' : 'danger'} 
                  />
                </View>
              </View>

              {/* Group: General Account */}
              <View>
                <Text style={styles.sectionLabel}>Datos de la Cuenta</Text>
                <View style={styles.detailCard}>
                  <DetailRow label="DNI" value={user.dni} />
                  <DetailRow label="Teléfono" value={user.phone || '—'} />
                  <DetailRow label="Correo Electrónico" value={user.email || '—'} />
                  <DetailRow label="Fecha de Registro" value={formatDate(user.createdAt)} />
                  <DetailRow label="Último Acceso" value={formatDate(user.lastLoginAt)} isLast />
                </View>
              </View>

              {/* Group: Obstetra profile */}
              {user.role === 'obstetra' && user.obstetra && (
                <View>
                  <Text style={styles.sectionLabel}>Ficha Profesional (Obstetra)</Text>
                  <View style={styles.detailCard}>
                    <DetailRow label="Número COP" value={user.obstetra.cop || '—'} />
                    <DetailRow label="Especialidad" value={user.obstetra.especialidad || '—'} />
                    <DetailRow label="Establecimiento" value={user.obstetra.establecimiento || '—'} isLast />
                  </View>
                </View>
              )}

              {/* Group: Gestante profile */}
              {user.role === 'gestante' && user.gestante && (
                <View>
                  <Text style={styles.sectionLabel}>Ficha Clínica (Gestante)</Text>
                  <View style={styles.detailCard}>
                    <DetailRow 
                      label="Fecha Nacimiento" 
                      value={user.gestante.fechaNacimiento ? new Date(user.gestante.fechaNacimiento).toLocaleDateString('es-PE') : '—'} 
                    />
                    <DetailRow label="Nivel de Riesgo" value={user.gestante.nivelRiesgo ? user.gestante.nivelRiesgo.toUpperCase() : 'VERDE'} />
                    <DetailRow label="Estado" value={user.gestante.estado ? user.gestante.estado.toUpperCase() : 'ACTIVA'} />
                    <DetailRow 
                      label="Ubicación" 
                      value={`${user.gestante.distrito || '—'}, ${user.gestante.provincia || '—'}, ${user.gestante.departamento || '—'}`} 
                      isLast 
                    />
                  </View>
                </View>
              )}

              {/* Action Button: Toggle Active Status */}
              <TouchableOpacity
                style={[
                  styles.statusToggleButton,
                  user.isActive ? styles.statusToggleButtonDeactivate : styles.statusToggleButtonActivate
                ]}
                onPress={() => handleToggleActive(user)}
                disabled={toggleUserActiveMutation.isPending}
                activeOpacity={0.8}
              >
                {toggleUserActiveMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={[
                    styles.statusToggleButtonText,
                    user.isActive ? styles.statusToggleButtonTextDeactivate : styles.statusToggleButtonTextActivate
                  ]}>
                    {user.isActive ? 'Desactivar Cuenta' : 'Activar / Aprobar Cuenta'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refetch}
            colors={[semanticColors.info]}
            tintColor={semanticColors.info}
          />
        }
      />

      {/* FAB Button at the bottom right */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setIsCreateModalVisible(true)}
        activeOpacity={0.8}
      >
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* MODAL: CREATE USER */}
      <Modal
        visible={isCreateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCreateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeader}>Crear Nuevo Usuario</Text>
              <TouchableOpacity onPress={() => setIsCreateModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Rol del Usuario</Text>
                <View style={styles.roleTabs}>
                  {['obstetra', 'admin', 'gestante'].map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.roleTab, role === r && styles.roleTabActive]}
                      onPress={() => setRole(r)}
                    >
                      <Text style={[styles.roleTabText, role === r && styles.roleTabTextActive]}>
                        {r.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>DNI (8 dígitos) *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. 44556677"
                  keyboardType="numeric"
                  maxLength={8}
                  value={dni}
                  onChangeText={setDni}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Nombres *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. Juan Pablo"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Apellidos *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. Pérez Gómez"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>

              {role === 'obstetra' && (
                <View style={styles.inputFieldGroup}>
                  <Text style={styles.inputLabel}>Número de COP *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="ej. 12345"
                    keyboardType="numeric"
                    value={cop}
                    onChangeText={setCop}
                  />
                </View>
              )}

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Teléfono (ej. +51999888777)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. +51999888777"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Correo Electrónico (Opcional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="ej. correo@servidor.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Contraseña *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setIsCreateModalVisible(false)}
                disabled={isCreating}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleCreateSubmit} 
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar Usuario</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: DETAIL USER */}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
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
    marginBottom: 4, 
    letterSpacing: -0.5 
  },
  headerSubtitle: { 
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), 
    fontSize: 15, 
    color: '#64748B' 
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    height: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  searchInput: { 
    flex: 1, 
    fontFamily: typography.bodyMedium.fontFamily, 
    fontSize: 16, 
    color: '#0F172A' 
  },
  listContent: { 
    paddingBottom: 120 
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardContent: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  // Distinct avatar styles per role
  avatarAdmin: {
    backgroundColor: '#F3E8FF',
  },
  avatarObstetra: {
    backgroundColor: '#EFF6FF',
  },
  avatarGestante: {
    backgroundColor: '#FDF2F8',
  },
  avatarText: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 16,
    fontWeight: '800',
  },
  avatarTextAdmin: {
    color: '#7C3AED',
  },
  avatarTextObstetra: {
    color: '#2563EB',
  },
  avatarTextGestante: {
    color: '#BE185D',
  },
  info: { 
    flex: 1, 
    marginRight: 12 
  },
  name: { 
    fontFamily: typography.bodyMedium.fontFamily, 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#0F172A', 
    marginBottom: 4 
  },
  details: { 
    fontFamily: typography.caption.fontFamily, 
    fontSize: 13, 
    color: '#64748B' 
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563EB', // Blue matching admin styling
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
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
  roleTabs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  roleTabActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  roleTabText: {
    fontFamily: typography.bodyMedium.fontFamily,
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  roleTabTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#2563EB',
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
  // Detail Modal specific styles
  detailUserSummaryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  detailAvatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  detailAvatarText: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 28,
    fontWeight: '800',
  },
  detailName: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  sectionLabel: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 2,
  },
  statusToggleButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  statusToggleButtonDeactivate: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  statusToggleButtonActivate: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  statusToggleButtonText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  statusToggleButtonTextDeactivate: {
    color: '#EF4444',
  },
  statusToggleButtonTextActivate: {
    color: '#10B981',
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
