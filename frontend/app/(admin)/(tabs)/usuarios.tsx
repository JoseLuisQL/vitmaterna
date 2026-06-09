/**
 * VITMATERNA - Admin Users Screen
 * Fetch and display all users with an option to approve awaiting users.
 */
import React, { useState } from 'react';
import { View, StyleSheet, Text, FlatList, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, Search, CheckCircle } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { AppButton } from '../../../src/components/ui/AppButton';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { commonColors, semanticColors } from '../../../src/theme/colors';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { typography } from '../../../src/theme/typography';
import { useAdminUsers, useApproveUser } from '../../../src/services/admin-queries';

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
  const approveUserMutation = useApproveUser();

  const handleApprove = (id: string) => {
    approveUserMutation.mutate(id);
  };

  const filteredUsers = users?.filter((u: any) => 
    u.firstName?.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
    u.lastName?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    u.dni?.includes(debouncedSearch)
  );

  const renderItem = ({ item }: { item: any }) => (
    <AppCard style={styles.card}>
      <View style={styles.cardContent}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.firstName?.[0] || '') + (item.lastName?.[0] || '')}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.firstName} {item.lastName}</Text>
          <Text style={styles.details}>DNI: {item.dni} • Rol: {item.role}</Text>
        </View>
        <AppBadge 
          label={item.isActive ? 'Activo' : 'Pendiente'} 
          variant={item.isActive ? 'success' : 'warning'} 
          size="sm" 
        />
      </View>
      {!item.isActive && (
        <View style={styles.actions}>
          <AppButton
            title="Aprobar"
            onPress={() => handleApprove(item.id || item._id)}
            variant="primary"
            style={{ backgroundColor: semanticColors.info }}
            size="sm"
            icon={CheckCircle}
            loading={approveUserMutation.isPending}
          />
        </View>
      )}
    </AppCard>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color={commonColors.textSecondary} style={{ marginRight: spacing.sm }} />
          <TextInput
            placeholder="Buscar por nombre o DNI..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholderTextColor={commonColors.textTertiary}
          />
        </View>
      </View>

      {isLoading ? (
        <LoadingScreen message="Cargando usuarios..." />
      ) : !filteredUsers || filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users as any}
          title="Sin resultados"
          description={search ? "No se encontraron usuarios con esa búsqueda." : "No hay usuarios registrados."}
          themeColor={semanticColors.info}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id || item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={refetch}
              colors={[semanticColors.info]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: commonColors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    fontFamily: typography.h1.fontFamily,
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: commonColors.text,
  },
  searchContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: commonColors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: commonColors.text,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: semanticColors.infoLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: semanticColors.info,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodyMedium.fontSize,
    fontWeight: '600',
    color: commonColors.text,
  },
  details: {
    fontFamily: typography.caption.fontFamily,
    fontSize: typography.caption.fontSize,
    color: commonColors.textSecondary,
    marginTop: 2,
  },
  actions: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
    alignItems: 'flex-end',
  },
});
