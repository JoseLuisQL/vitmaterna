/**
 * VITMATERNA - Admin: Supervisión de Gestantes (solo lectura)
 * Lista global de gestantes del sistema con buscador y filtro de riesgo.
 *
 * Fase 2: migrada a `ListScreen` (tabla web ↔ tarjetas móvil en un solo
 * componente). Elimina el header manual duplicado y unifica estados.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Baby } from 'lucide-react-native';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { PrenatalRibbon } from '../../../src/components/ui/PrenatalRibbon';
import { ListScreen, type ListFilter } from '../../../src/components/patterns/ListScreen';
import { usePatients } from '../../../src/services/api-queries';
import { useDebouncedValue } from '../../../src/hooks/useDebouncedValue';
import { commonColors, adminColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import type { DataTableColumn } from '../../../src/components/web';

const BRAND = adminColors.primary;
const RISKS: ListFilter[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'Bajo', label: 'Bajo' },
  { key: 'Medio', label: 'Medio' },
  { key: 'Alto', label: 'Alto' },
];

interface GestanteRow {
  id: string;
  firstName?: string;
  lastName?: string;
  documentNumber?: string;
  currentWeek?: string | number;
  currentTrimester?: string | number;
  riskLevel?: string;
}

const initials = (p: GestanteRow) => `${p.firstName?.[0] || ''}${p.lastName?.[0] || ''}`;
const riskVariant = (lvl?: string) =>
  lvl === 'Alto' ? 'danger' : lvl === 'Medio' ? 'warning' : 'success';

export default function AdminGestantesScreen(): React.ReactElement {
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('todas');
  const { data: patients = [], isLoading } = usePatients();
  const debouncedSearch = useDebouncedValue(search, 400);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return (patients as GestanteRow[]).filter((p) => {
      if (riskFilter !== 'todas' && p.riskLevel !== riskFilter) return false;
      if (q && !`${p.firstName} ${p.lastName} ${p.documentNumber || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [patients, debouncedSearch, riskFilter]);

  const columns: DataTableColumn<GestanteRow>[] = [
    {
      key: 'nombre',
      header: 'Gestante',
      flex: 2,
      sortValue: (p) => `${p.firstName} ${p.lastName}`.toLowerCase(),
      render: (p) => (
        <View style={styles.tableUserCell}>
          <View style={styles.tableAvatar}><Text style={styles.avatarText}>{initials(p)}</Text></View>
          <Text style={styles.tableName} numberOfLines={1}>{p.firstName} {p.lastName}</Text>
        </View>
      ),
    },
    { key: 'dni', header: 'DNI', width: 120, sortValue: (p) => p.documentNumber || '', render: (p) => p.documentNumber || '—' },
    {
      key: 'sem',
      header: 'Avance',
      width: 200,
      sortValue: (p) => Number(p.currentWeek) || 0,
      render: (p) =>
        p.currentWeek ? (
          <View style={styles.tableRibbonCell}>
            <Text style={styles.tableRibbonLabel} numberOfLines={1}>
              Sem {p.currentWeek}{p.currentTrimester ? ` · ${p.currentTrimester}° trim` : ''}
            </Text>
            <PrenatalRibbon week={Number(p.currentWeek)} colors={adminColors.gradient} showCaption={false} animated={false} />
          </View>
        ) : (
          '—'
        ),
    },
    { key: 'riesgo', header: 'Riesgo', width: 120, align: 'center', sortValue: (p) => p.riskLevel || 'Bajo', render: (p) => <AppBadge label={p.riskLevel || 'Bajo'} variant={riskVariant(p.riskLevel)} size="sm" /> },
  ];

  const renderCard = (p: GestanteRow) => (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials(p)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{p.firstName} {p.lastName}</Text>
          <Text style={styles.meta}>DNI: {p.documentNumber || '—'}{p.currentWeek ? ` · ${p.currentWeek} sem` : ''}</Text>
        </View>
        <AppBadge label={p.riskLevel || 'Bajo'} variant={riskVariant(p.riskLevel)} />
      </View>
      {p.currentWeek ? (
        <PrenatalRibbon week={Number(p.currentWeek)} colors={adminColors.gradient} showCaption={false} animated={false} style={styles.cardRibbon} />
      ) : null}
    </View>
  );

  return (
    <ListScreen<GestanteRow>
      role="admin"
      title="Gestantes"
      subtitle={`${patients.length} registradas · solo lectura`}
      showBack
      accentColor={BRAND}
      width="full"
      data={filtered}
      keyExtractor={(p) => p.id}
      columns={columns}
      renderCard={renderCard}
      loading={isLoading}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder="Buscar por nombre o DNI…"
      filters={RISKS}
      activeFilter={riskFilter}
      onFilterChange={setRiskFilter}
      emptyIcon={Baby}
      emptyTitle="Sin gestantes"
      emptyMessage={search || riskFilter !== 'todas' ? 'No hay gestantes con ese filtro.' : 'Aún no hay gestantes registradas.'}
    />
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm2, ...shadows.card },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardRibbon: { marginTop: spacing.sm2 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.bodyMd, fontWeight: '700', color: BRAND },
  name: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  meta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  tableUserCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tableAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: adminColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },
  tableRibbonCell: { width: '100%', gap: 4 },
  tableRibbonLabel: { ...typography.caption, color: commonColors.textSecondary },
});
