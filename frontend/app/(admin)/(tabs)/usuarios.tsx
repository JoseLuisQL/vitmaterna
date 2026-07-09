/**
 * VITMATERNA - Admin Users Screen
 * Fetch and display all users with options to view detail and activate/deactivate.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Text, RefreshControl, TextInput, ActivityIndicator, TouchableOpacity, StatusBar } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, CheckCircle, UserPlus, ChevronRight, Plus, Menu } from 'lucide-react-native';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { AppModal, AppButton, useToast, TextField } from '../../../src/components/ui';
import { SearchField } from '../../../src/components/ui/Field';
import { Pencil, KeyRound, Trash2 } from 'lucide-react-native';
import { commonColors, obstetraColors, gestanteColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';
import { useAdminUsers, useCreateUser, useToggleUserActive, useUpdateUser, useResetUserPassword, useDeleteUser, useApproveUser, useObstetras } from '../../../src/services/admin-queries';

/**
 * Estado real de una cuenta de 3 valores (issue #8):
 *  - Pendiente: registrada pero NO verificada (no puede iniciar sesión).
 *  - Activo:    verificada y activa.
 *  - Inactivo:  desactivada por el admin.
 * El login del backend bloquea por `isVerified`, así que `isActive` por sí solo
 * no refleja si la cuenta puede entrar.
 */
function getUserStatus(u: { isActive?: boolean; isVerified?: boolean }): {
  label: string;
  variant: 'success' | 'danger' | 'warning';
  pending: boolean;
} {
  if (u?.isVerified === false) return { label: 'Pendiente', variant: 'warning', pending: true };
  if (u?.isActive) return { label: 'Activo', variant: 'success', pending: false };
  return { label: 'Inactivo', variant: 'danger', pending: false };
}
import { confirmAction } from '../../../src/utils/confirm';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { useResponsive } from '../../../src/theme/responsive';
import { DataTable, type DataTableColumn } from '../../../src/components/web';

const BRAND = adminColors.primary;
import { useAuthStore } from '../../../src/store/authStore';

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
    ...typography.bodySm,
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
  const debouncedSearch = useDebouncedValue(search, 400);

  const { data: users, isLoading, refetch } = useAdminUsers();
  const createUserMutation = useCreateUser();
  const toggleUserActiveMutation = useToggleUserActive();
  const approveUserMutation = useApproveUser();
  const updateUserMutation = useUpdateUser();
  const resetPasswordMutation = useResetUserPassword();
  const deleteUserMutation = useDeleteUser();
  const toast = useToast();
  const { open: openSidebar } = useSidebar();
  const { user: authUser } = useAuthStore();
  const { webShell } = useResponsive();
  const usuariosTourTarget = useTourTarget(TOUR_TARGETS.adminUsuarios);
  const nuevoUsuarioTourTarget = useTourTarget(TOUR_TARGETS.adminNuevoUsuario);

  // Edición / reset / baja
  const [isEditVisible, setIsEditVisible] = useState(false);
  const [isResetVisible, setIsResetVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCop, setEditCop] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const openEdit = () => {
    if (!selectedUser) return;
    setEditFirstName(selectedUser.firstName || '');
    setEditLastName(selectedUser.lastName || '');
    setEditPhone(selectedUser.phone || '');
    setEditEmail(selectedUser.email || '');
    setEditCop(selectedUser.obstetra?.cop || '');
    // Un solo modal a la vez: cerramos el detalle antes de abrir el de edición.
    // (Dos Modal nativos montados a la vez se apilan mal en react-native-web y
    // el nuevo queda detrás del principal.)
    setIsDetailModalVisible(false);
    setIsEditVisible(true);
  };

  const openReset = () => {
    if (!selectedUser) return;
    setNewPassword('');
    setIsDetailModalVisible(false);
    setIsResetVisible(true);
  };

  // Cierra un sub-modal y regresa a la ficha de detalle (si aún hay usuario).
  const closeEditBackToDetail = () => {
    setIsEditVisible(false);
    if (selectedUser) setIsDetailModalVisible(true);
  };
  const closeResetBackToDetail = () => {
    setIsResetVisible(false);
    if (selectedUser) setIsDetailModalVisible(true);
  };

  const handleSaveEdit = () => {
    if (!selectedUser) return;
    if (!editFirstName.trim() || !editLastName.trim()) {
      return toast.error('Datos incompletos', 'Nombre y apellido son obligatorios.');
    }
    const data: Record<string, unknown> = {
      firstName: editFirstName.trim(), lastName: editLastName.trim(),
      phone: editPhone.trim(), email: editEmail.trim(),
    };
    if (selectedUser.role === 'obstetra' && editCop.trim()) data.cop = editCop.trim();
    updateUserMutation.mutate({ id: selectedUser.id, data }, {
      onSuccess: () => {
        toast.success('Usuario actualizado', 'Los datos se guardaron correctamente.');
        setSelectedUser({ ...selectedUser, ...data, obstetra: selectedUser.obstetra ? { ...selectedUser.obstetra, cop: data.cop ?? selectedUser.obstetra.cop } : undefined });
        closeEditBackToDetail();
      },
      onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo actualizar.'),
    });
  };

  const handleResetPassword = () => {
    if (!selectedUser) return;
    if (newPassword.trim().length < 8) {
      return toast.error('Contraseña inválida', 'Debe tener al menos 8 caracteres.');
    }
    resetPasswordMutation.mutate({ id: selectedUser.id, newPassword: newPassword.trim() }, {
      onSuccess: () => {
        toast.success('Contraseña actualizada', `Nueva contraseña establecida para ${selectedUser.firstName}.`);
        setNewPassword('');
        closeResetBackToDetail();
      },
      onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo restablecer.'),
    });
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (authUser?.id === selectedUser.id) {
      return toast.error('Acción no permitida', 'No puedes eliminar tu propia cuenta.');
    }
    const ok = await confirmAction({
      title: 'Eliminar usuario',
      message: `¿Dar de baja a ${selectedUser.firstName} ${selectedUser.lastName}? No podrá iniciar sesión.`,
      confirmText: 'Eliminar',
      destructive: true,
    });
    if (!ok) return;
    deleteUserMutation.mutate(selectedUser.id, {
      onSuccess: () => {
        toast.success('Usuario dado de baja', 'La cuenta fue desactivada.');
        setIsDetailModalVisible(false);
        setSelectedUser(null);
      },
      onError: (e: any) => toast.error('No se pudo eliminar', e?.response?.data?.error?.message || 'Inténtalo nuevamente.'),
    });
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
  // Issue #33: al registrar una gestante, el admin puede asignarle un obstetra
  // y capturar su fecha de nacimiento.
  const [obstetraId, setObstetraId] = useState<string | null>(null);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const { data: obstetras = [] } = useObstetras();

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
        toast.success(newActive ? 'Usuario activado' : 'Usuario desactivado', `${user.firstName} ${user.lastName} ya está ${newActive ? 'activo' : 'inactivo'}.`);
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, isActive: newActive });
        }
      },
      onError: (err: any) => {
        toast.error('No se pudo cambiar el estado', err.response?.data?.message || 'Inténtalo de nuevo en unos momentos.');
      },
    });
  };

  // Aprobar una cuenta pendiente (issue #5): verifica + activa, permitiendo el
  // ingreso. Se basa en `isVerified`, no en `isActive`.
  const handleApprove = async (user: any) => {
    const ok = await confirmAction({
      title: 'Aprobar cuenta',
      message: `¿Aprobar el acceso de ${user.firstName} ${user.lastName}? Podrá iniciar sesión de inmediato.`,
      confirmText: 'Aprobar',
    });
    if (!ok) return;
    approveUserMutation.mutate(user.id, {
      onSuccess: () => {
        toast.success('Cuenta aprobada', `${user.firstName} ${user.lastName} ya puede iniciar sesión.`);
        if (selectedUser && selectedUser.id === user.id) {
          setSelectedUser({ ...selectedUser, isActive: true, isVerified: true });
        }
      },
      onError: (err: any) => {
        toast.error('No se pudo aprobar', err.response?.data?.message || 'Inténtalo de nuevo en unos momentos.');
      },
    });
  };

  const handleCreateSubmit = () => {
    if (!dni || !firstName || !lastName || !password) {
      return toast.warning('Faltan datos', 'Completa los campos marcados con (*).');
    }
    if (dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      return toast.warning('DNI inválido', 'El DNI debe tener exactamente 8 dígitos.');
    }
    if (role === 'obstetra' && !cop) {
      return toast.warning('Falta el COP', 'El número de colegiatura es obligatorio para obstetras.');
    }
    if (password.length < 8) {
      return toast.warning('Contraseña muy corta', 'Usa al menos 8 caracteres.');
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
      // Issue #33: asignación de obstetra y fecha de nacimiento solo para gestantes.
      obstetraId: role === 'gestante' && obstetraId ? obstetraId : undefined,
      fechaNacimiento: role === 'gestante' && fechaNacimiento ? fechaNacimiento : undefined,
    }, {
      onSuccess: () => {
        toast.success('Usuario creado', `${firstName} ${lastName} ya puede ingresar.`);
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
        setObstetraId(null);
        setFechaNacimiento('');
      },
      onError: (err: any) => {
        toast.error('No se pudo crear el usuario', err.response?.data?.message || 'Revisa los datos e inténtalo de nuevo.');
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <TouchableOpacity onPress={openSidebar} style={styles.logoutBtn} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Abrir menú">
              <Menu size={22} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Gestión de Usuarios</Text>
              <Text style={styles.headerSubtitle}>Administra los accesos y roles de la plataforma</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View ref={!webShell ? usuariosTourTarget : undefined} collapsable={false} style={styles.searchContainer}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o DNI..."
        />
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
          label={getUserStatus(item).label} 
          variant={getUserStatus(item).variant} 
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
                    label={getUserStatus(user).label} 
                    variant={getUserStatus(user).variant} 
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

              {/* Acción principal de cuenta (issue #5).
                  - Pendiente (no verificada) → "Aprobar Cuenta" (verifica + activa).
                  - Verificada → activar/desactivar según isActive. */}
              {getUserStatus(user).pending ? (
                <TouchableOpacity
                  style={[styles.statusToggleButton, styles.statusToggleButtonActivate]}
                  onPress={() => handleApprove(user)}
                  disabled={approveUserMutation.isPending}
                  activeOpacity={0.8}
                >
                  {approveUserMutation.isPending ? (
                    <ActivityIndicator color={commonColors.white} size="small" />
                  ) : (
                    <Text style={[styles.statusToggleButtonText, styles.statusToggleButtonTextActivate]}>
                      Aprobar Cuenta
                    </Text>
                  )}
                </TouchableOpacity>
              ) : (
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
                      {user.isActive ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Acciones de gestión */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionBtn} onPress={openEdit} activeOpacity={0.8}>
                  <Pencil size={18} color={BRAND} />
                  <Text style={styles.actionBtnText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={openReset} activeOpacity={0.8}>
                  <KeyRound size={18} color={BRAND} />
                  <Text style={styles.actionBtnText}>Contraseña</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={handleDeleteUser} activeOpacity={0.8}>
                  <Trash2 size={18} color={semanticColors.danger} />
                  <Text style={[styles.actionBtnText, { color: semanticColors.danger }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
        </View>
      </AppModal>
    );
  };

  // Modal: editar datos del usuario
  const renderEditModal = () => (
    <AppModal
      visible={isEditVisible}
      onClose={closeEditBackToDetail}
      title="Editar usuario"
      footer={
        <>
          <AppButton title="Cancelar" variant="outline" onPress={closeEditBackToDetail} style={{ flex: 1 }} disabled={updateUserMutation.isPending} />
          <AppButton title="Guardar" onPress={handleSaveEdit} style={{ flex: 1 }} themeColor={BRAND} loading={updateUserMutation.isPending} />
        </>
      }
    >
      <View style={{ gap: 12 }}>
        <TextField label="Nombres *" value={editFirstName} onChangeText={setEditFirstName} placeholder="Nombres" themeColor={BRAND} />
        <TextField label="Apellidos *" value={editLastName} onChangeText={setEditLastName} placeholder="Apellidos" themeColor={BRAND} />
        <TextField label="Teléfono" value={editPhone} onChangeText={setEditPhone} placeholder="987654321" keyboardType="phone-pad" themeColor={BRAND} />
        <TextField label="Correo electrónico" value={editEmail} onChangeText={setEditEmail} placeholder="correo@ejemplo.com" keyboardType="email-address" autoCapitalize="none" themeColor={BRAND} />
        {selectedUser?.role === 'obstetra' && (
          <TextField label="Número COP" value={editCop} onChangeText={setEditCop} placeholder="COP" themeColor={BRAND} />
        )}
      </View>
    </AppModal>
  );

  // Modal: resetear contraseña
  const renderResetModal = () => (
    <AppModal
      visible={isResetVisible}
      onClose={closeResetBackToDetail}
      title="Restablecer contraseña"
      subtitle={selectedUser ? `Nueva contraseña para ${selectedUser.firstName} ${selectedUser.lastName}` : undefined}
      footer={
        <>
          <AppButton title="Cancelar" variant="outline" onPress={closeResetBackToDetail} style={{ flex: 1 }} disabled={resetPasswordMutation.isPending} />
          <AppButton title="Restablecer" onPress={handleResetPassword} style={{ flex: 1 }} themeColor={BRAND} loading={resetPasswordMutation.isPending} />
        </>
      }
    >
      <TextField label="Nueva contraseña (mín. 8 caracteres)" value={newPassword} onChangeText={setNewPassword} placeholder="Nueva contraseña" secureTextEntry autoCapitalize="none" themeColor={BRAND} />
      <Text style={styles.resetHint}>El usuario deberá iniciar sesión con esta nueva contraseña.</Text>
    </AppModal>
  );

  // Columnas de la tabla web (portal de escritorio). En móvil se usa la lista
  // de tarjetas (renderItem) de siempre.
  const tableColumns: DataTableColumn<any>[] = [
    {
      key: 'nombre',
      header: 'Usuario',
      flex: 2,
      sortValue: (u) => `${u.firstName} ${u.lastName}`.toLowerCase(),
      render: (u) => (
        <View style={styles.tableUserCell}>
          <View style={[
            styles.tableAvatar,
            u.role === 'admin' ? styles.avatarAdmin : u.role === 'obstetra' ? styles.avatarObstetra : styles.avatarGestante,
          ]}>
            <Text style={[
              styles.tableAvatarText,
              u.role === 'admin' ? styles.avatarTextAdmin : u.role === 'obstetra' ? styles.avatarTextObstetra : styles.avatarTextGestante,
            ]}>
              {(u.firstName?.[0] || '') + (u.lastName?.[0] || '')}
            </Text>
          </View>
          <Text style={styles.tableName} numberOfLines={1}>{u.firstName} {u.lastName}</Text>
        </View>
      ),
    },
    { key: 'dni', header: 'DNI', width: 110, align: 'center', sortValue: (u) => u.dni, render: (u) => u.dni },
    {
      key: 'rol',
      header: 'Rol',
      width: 130,
      align: 'center',
      sortValue: (u) => u.role,
      render: (u) => <AppBadge label={u.role.toUpperCase()} variant="info" size="sm" />,
    },
    {
      key: 'estado',
      header: 'Estado',
      width: 110,
      align: 'center',
      sortValue: (u) => (u.isVerified === false ? 2 : u.isActive ? 1 : 0),
      render: (u) => { const s = getUserStatus(u); return <AppBadge label={s.label} variant={s.variant} size="sm" />; },
    },
  ];

  // ── PORTAL WEB: tabla densa dentro del molde ScreenLayout ──
  // Solo se sustituye la cabecera + lista; los modales y el FAB del return
  // principal se comparten con la versión móvil.
  const webBody = (
    <ScreenLayout
      role="admin"
      title="Gestión de Usuarios"
      subtitle="Administra los accesos y roles de la plataforma"
      width="full"
      accentColor={adminColors.primary}
      scroll={false}
    >
      <View ref={webShell ? usuariosTourTarget : undefined} collapsable={false} style={styles.webToolbar}>
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre o DNI..."
          containerStyle={styles.webSearchBox}
        />
        <View ref={webShell ? nuevoUsuarioTourTarget : undefined} collapsable={false}>
          <TouchableOpacity style={styles.webCreateBtn} onPress={() => setIsCreateModalVisible(true)} activeOpacity={0.85}>
            <Plus size={18} color={commonColors.white} />
            <Text style={styles.webCreateText}>Nuevo usuario</Text>
          </TouchableOpacity>
        </View>
      </View>

      <DataTable
        columns={tableColumns}
        data={filteredUsers ?? []}
        keyExtractor={(u) => u.id || u._id}
        loading={isLoading}
        onRowPress={(u) => { setSelectedUser(u); setIsDetailModalVisible(true); }}
        rowLabel={(u: any) => `Ver usuario ${u.firstName || ''} ${u.lastName || ''}`.trim()}
        emptyIcon={Users as any}
        emptyTitle="Sin usuarios"
        emptyMessage={search ? 'No se encontraron usuarios con esa búsqueda.' : 'Aún no hay usuarios registrados.'}
        emptyAccent={adminColors.primary}
      />
    </ScreenLayout>
  );

  return (
    <View style={styles.container}>
      {webShell ? webBody : renderHeader()}
      {!webShell && (
      <FlashList
        data={filteredUsers}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
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
      )}

      {/* FAB Button at the bottom right (solo móvil; en web está en la toolbar) */}
      {!webShell && (
      <TouchableOpacity 
        ref={nuevoUsuarioTourTarget as any}
        style={styles.fab} 
        onPress={() => setIsCreateModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Crear usuario"
      >
        <Plus size={28} color={adminColors.onPrimary} />
      </TouchableOpacity>
      )}

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

          <TextField label="DNI (8 dígitos) *" placeholder="ej. 44556677" keyboardType="numeric" maxLength={8} value={dni} onChangeText={setDni} themeColor={BRAND} />

          <TextField label="Nombres *" placeholder="ej. Juan Pablo" value={firstName} onChangeText={setFirstName} themeColor={BRAND} />

          <TextField label="Apellidos *" placeholder="ej. Pérez Gómez" value={lastName} onChangeText={setLastName} themeColor={BRAND} />

          {role === 'obstetra' && (
            <TextField label="Número de COP *" placeholder="ej. 12345" keyboardType="numeric" value={cop} onChangeText={setCop} themeColor={BRAND} />
          )}

          {role === 'gestante' && (
            <>
              <TextField
                label="Fecha de nacimiento (opcional)"
                placeholder="AAAA-MM-DD (ej. 1998-05-20)"
                value={fechaNacimiento}
                onChangeText={setFechaNacimiento}
                themeColor={BRAND}
              />
              <View style={styles.inputFieldGroup}>
                <Text style={styles.inputLabel}>Obstetra asignado (opcional)</Text>
                {obstetras.length === 0 ? (
                  <Text style={styles.assignHint}>No hay obstetras activos para asignar.</Text>
                ) : (
                  <View style={styles.obstetraList}>
                    <TouchableOpacity
                      style={[styles.obstetraItem, obstetraId === null && styles.obstetraItemActive]}
                      onPress={() => setObstetraId(null)}
                      accessibilityRole="button"
                      accessibilityLabel="Sin asignar obstetra"
                    >
                      <Text style={[styles.obstetraItemText, obstetraId === null && styles.obstetraItemTextActive]}>
                        Sin asignar
                      </Text>
                    </TouchableOpacity>
                    {obstetras.map((o) => (
                      <TouchableOpacity
                        key={o.id}
                        style={[styles.obstetraItem, obstetraId === o.id && styles.obstetraItemActive]}
                        onPress={() => setObstetraId(o.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`Asignar a ${o.nombre}`}
                      >
                        <Text style={[styles.obstetraItemText, obstetraId === o.id && styles.obstetraItemTextActive]}>
                          {o.nombre}
                        </Text>
                        <Text style={[styles.obstetraItemMeta, obstetraId === o.id && styles.obstetraItemTextActive]}>
                          COP {o.cop}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </>
          )}

          <TextField label="Teléfono (ej. +51999888777)" placeholder="ej. +51999888777" keyboardType="phone-pad" value={phone} onChangeText={setPhone} themeColor={BRAND} />

          <TextField label="Correo Electrónico (Opcional)" placeholder="ej. correo@servidor.com" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} themeColor={BRAND} />

          <TextField label="Contraseña *" placeholder="Mínimo 8 caracteres" secureTextEntry value={password} onChangeText={setPassword} themeColor={BRAND} />
        </View>
      </AppModal>

      {/* MODAL: DETAIL USER */}
      {renderDetailModal()}
      {renderEditModal()}
      {renderResetModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Portal web ──
  webToolbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.md },
  webSearchBox: { flex: 1 },
  webCreateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: adminColors.primary, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, height: 44,
  },
  webCreateText: { ...typography.button, color: commonColors.white, fontSize: 14 },
  tableUserCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  tableAvatarText: { ...typography.caption, fontWeight: '700' },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },

  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: borderRadius.lg, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  actionBtnDanger: { backgroundColor: semanticColors.dangerLight, borderColor: semanticColors.danger },
  actionBtnText: { ...typography.caption, fontWeight: '700', color: BRAND },
  fieldLabel: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary, marginBottom: 4 },
  fieldInput: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, ...typography.body, fontSize: 15, color: commonColors.text },
  resetHint: { ...typography.caption, color: commonColors.textTertiary, marginTop: spacing.sm, lineHeight: 18 },
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
    color: commonColors.onColorTextSoft,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    marginBottom: spacing.sm,
  },

  listContent: {
    paddingBottom: layout.tabBarSpace + 80,
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
    ...typography.bodyMd,
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
    // Sobre la barra de tabs flotante (64 + safe-area). Antes en bottom:32 el
    // FAB quedaba TAPADO por la barra inferior en móvil.
    bottom: layout.tabBarSpace + spacing.sm,
    right: spacing.lg,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card,
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
    ...shadows.card,
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
    ...typography.bodySm,
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
  assignHint: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  obstetraList: {
    gap: spacing.xs,
  },
  obstetraItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    backgroundColor: commonColors.surface,
  },
  obstetraItemActive: {
    borderColor: adminColors.primary,
    backgroundColor: adminColors.primaryLight,
  },
  obstetraItemText: {
    ...typography.body,
    color: commonColors.text,
  },
  obstetraItemMeta: {
    ...typography.caption,
    color: commonColors.textSecondary,
  },
  obstetraItemTextActive: {
    color: adminColors.primary,
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
    backgroundColor: commonColors.onColorSurfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
});
