/**
 * VITMATERNA - Admin Users Screen
 * Fetch and display all users with options to view detail and activate/deactivate.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TextInput, ActivityIndicator, Alert, TouchableOpacity, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, CheckCircle, UserPlus, ChevronRight, Plus, LogOut } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton } from '../../../src/components/ui';
import { commonColors, obstetraColors, gestanteColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';
import { useAdminUsers, useCreateUser, useToggleUserActive } from '../../../src/services/admin-queries';
import { confirmAction, notify } from '../../../src/utils/confirm';

const BRAND = obstetraColors.primary;
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
    borderBottomColor: commonColors.borderLight,
  },
  label: {
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    flex: 1,
  },
  value: {
    ...typography.label,
    color: commonColors.text,
    flex: 1.5,
    textAlign: 'right',
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

  const handleLogout = async () => {
    const ok = await confirmAction({
      title: 'Cerrar Sesión',
      message: '¿Está seguro de que desea cerrar la sesión actual?',
      confirmText: 'Cerrar Sesión',
      destructive: true,
    });
    if (!ok) return;
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (err) {
      notify('Error', 'No se pudo cerrar la sesión.');
    }
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

  const handleToggleActive = async (user: any) => {
    const actionText = user.isActive ? 'desactivar' : 'activar/aprobar';
    const ok = await confirmAction({
      title: 'Confirmar Acción',
      message: `¿Está seguro de que desea ${actionText} a ${user.firstName} ${user.lastName}?`,
      confirmText: 'Confirmar',
      destructive: user.isActive,
    });
    if (!ok) return;
    toggleUserActiveMutation.mutate(user.id, {
      onSuccess: (updatedRes) => {
        const newActive = updatedRes.data?.isActive ?? !user.isActive;
        notify('Éxito', `Usuario ${newActive ? 'activado' : 'desactivado'} correctamente.`);
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, isActive: newActive });
        }
      },
      onError: (err: any) => {
        notify('Error', err.response?.data?.message || 'No se pudo cambiar el estado del usuario.');
      },
    });
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
      <LinearGradient
        colors={adminColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerWrapper}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
              <Text style={styles.headerSubtitle}>Administra los accesos y roles de la plataforma</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.7}>
              <LogOut size={22} color={commonColors.white} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Search size={20} color={commonColors.textTertiary} style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={commonColors.textTertiary}
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
        <ChevronRight size={20} color={commonColors.textTertiary} style={{ marginLeft: 12 }} />
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
      <AppModal
        visible={isDetailModalVisible}
        onClose={() => setIsDetailModalVisible(false)}
        title="Detalle de Usuario"
      >
        <View style={{ gap: 20 }}>
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
                  <ActivityIndicator color={commonColors.white} size="small" />
                ) : (
                  <Text style={[
                    styles.statusToggleButtonText,
                    user.isActive ? styles.statusToggleButtonTextDeactivate : styles.statusToggleButtonTextActivate
                  ]}>
                    {user.isActive ? 'Desactivar Cuenta' : 'Activar / Aprobar Cuenta'}
                  </Text>
                )}
              </TouchableOpacity>
        </View>
      </AppModal>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingHorizontal: spacing.lg }}>
              <ListSkeleton count={6} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.lg }}>
              <EmptyState
                icon={Users as any}
                title="Sin usuarios"
                description={search ? 'No se encontraron usuarios con esa búsqueda.' : 'Aún no hay usuarios registrados.'}
                themeColor={adminColors.primary}
              />
            </View>
          )
        }
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
        <Plus size={28} color={obstetraColors.onPrimary} />
      </TouchableOpacity>

      {/* MODAL: CREATE USER */}
      <AppModal
        visible={isCreateModalVisible}
        onClose={() => setIsCreateModalVisible(false)}
        title="Crear Nuevo Usuario"
        footer={
          <>
            <AppButton title="Cancelar" variant="outline" onPress={() => setIsCreateModalVisible(false)} style={{ flex: 1 }} disabled={isCreating} />
            <AppButton title="Guardar Usuario" onPress={handleCreateSubmit} style={{ flex: 1 }} themeColor={BRAND} disabled={isCreating} loading={isCreating} />
          </>
        }
      >
        <View style={{ gap: 14 }}>
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
              placeholderTextColor={commonColors.textTertiary}
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
              placeholderTextColor={commonColors.textTertiary}
              value={firstName}
              onChangeText={setFirstName}
            />
          </View>

          <View style={styles.inputFieldGroup}>
            <Text style={styles.inputLabel}>Apellidos *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ej. Pérez Gómez"
              placeholderTextColor={commonColors.textTertiary}
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
                placeholderTextColor={commonColors.textTertiary}
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
              placeholderTextColor={commonColors.textTertiary}
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
              placeholderTextColor={commonColors.textTertiary}
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
              placeholderTextColor={commonColors.textTertiary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        </View>
      </AppModal>

      {/* MODAL: DETAIL USER */}
      {renderDetailModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  headerWrapper: {
    paddingBottom: spacing.xl,
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
    marginBottom: 4,
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: -spacing.lg,
    marginBottom: spacing.sm,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: 20,
    height: 56,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: commonColors.text,
  },
  listContent: {
    paddingBottom: layout.tabBarSpace,
  },
  userCard: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: spacing.md,
    ...shadows.card,
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
    backgroundColor: semanticColors.infoLight,
  },
  avatarObstetra: {
    backgroundColor: obstetraColors.primaryLight,
  },
  avatarGestante: {
    backgroundColor: gestanteColors.primaryLight,
  },
  avatarText: {
    ...typography.h3,
    fontSize: 16,
  },
  avatarTextAdmin: {
    color: semanticColors.info,
  },
  avatarTextObstetra: {
    color: obstetraColors.primary,
  },
  avatarTextGestante: {
    color: gestanteColors.primary,
  },
  info: { 
    flex: 1, 
    marginRight: 12 
  },
  name: {
    ...typography.bodyMedium,
    fontFamily: typography.h3.fontFamily,
    color: commonColors.text,
    marginBottom: 4,
  },
  details: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: commonColors.surface,
    borderRadius: 32,
    width: '100%',
    maxHeight: '85%',
    padding: 24,
    gap: 16,
    borderWidth: 1,
    borderColor: commonColors.border,
    ...shadows.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
    paddingBottom: 16,
  },
  modalHeader: {
    ...typography.h2,
    color: commonColors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputFieldGroup: {
    gap: 6,
    marginBottom: 8,
  },
  inputLabel: {
    ...typography.label,
    color: commonColors.textSecondary,
  },
  textInput: {
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.bodySmall,
    color: commonColors.text,
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
    borderColor: commonColors.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: commonColors.surfaceAlt,
  },
  roleTabActive: {
    backgroundColor: BRAND,
    borderColor: BRAND,
  },
  roleTabText: {
    ...typography.overline,
    letterSpacing: 0.1,
    color: commonColors.textSecondary,
  },
  roleTabTextActive: {
    color: obstetraColors.onPrimary,
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
    borderColor: commonColors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    ...typography.label,
    color: commonColors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: BRAND,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
  },
  saveBtnText: {
    ...typography.label,
    color: obstetraColors.onPrimary,
  },
  // Detail Modal specific styles
  detailUserSummaryCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: commonColors.border,
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
    ...typography.h1,
    fontSize: 28,
  },
  detailName: {
    ...typography.h2,
    color: commonColors.text,
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
    ...typography.overline,
    color: commonColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
    paddingLeft: 4,
  },
  detailCard: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: commonColors.border,
    overflow: 'hidden',
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
    backgroundColor: semanticColors.dangerLight,
    borderWidth: 1,
    borderColor: semanticColors.dangerLight,
  },
  statusToggleButtonActivate: {
    backgroundColor: semanticColors.successLight,
    borderWidth: 1,
    borderColor: semanticColors.successLight,
  },
  statusToggleButtonText: {
    ...typography.label,
    fontSize: 15,
  },
  statusToggleButtonTextDeactivate: {
    color: semanticColors.danger,
  },
  statusToggleButtonTextActivate: {
    color: semanticColors.success,
  },
  logoutBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
