/**
 * VITMATERNA - Admin: Supervisión de Citas (solo lectura)
 * Agenda global del sistema con filtro por estado.
 *
 * Fase 2: migrada a `ListScreen` (tabla web ↔ tarjetas móvil en un solo
 * componente). Elimina el header manual duplicado (LinearGradient +
 * SafeAreaView) de la rama móvil y unifica los 4 estados.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar } from 'lucide-react-native';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { ListScreen, type ListFilter } from '../../../src/components/patterns/ListScreen';
import { useAppointments } from '../../../src/services/api-queries';
import { commonColors, adminColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import type { DataTableColumn } from '../../../src/components/web';

const BRAND = adminColors.primary;

const FILTERS: ListFilter[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'proximas', label: 'Próximas' },
  { key: 'hoy', label: 'Hoy' },
];

const STATUS_VARIANT: Record<string, any> = {
  asistida: 'success', confirmada: 'success', programada: 'info',
  reprogramada: 'warning', solicitud_reprogramacion: 'warning',
  no_asistida: 'danger', cancelada: 'danger',
};
const STATUS_LABEL: Record<string, string> = {
  asistida: 'Asistida', confirmada: 'Confirmada', programada: 'Programada',
  reprogramada: 'Reprogramada', solicitud_reprogramacion: 'Solicita reprog.',
  no_asistida: 'No asistió', cancelada: 'Cancelada',
};

interface CitaRow {
  id: string;
  date: string;
  patientName?: string;
  type?: string;
  status: string;
}

const fmt = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export default function AdminCitasScreen(): React.ReactElement {
  const [filter, setFilter] = useState<string>('todas');
  const { data: appointments = [], isLoading } = useAppointments();

  const filtered = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return (appointments as CitaRow[])
      .filter((a) => {
        const d = new Date(a.date).toISOString().split('T')[0];
        if (filter === 'hoy') return d === today;
        if (filter === 'proximas') return d >= today;
        return true;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [appointments, filter]);

  const columns: DataTableColumn<CitaRow>[] = [
    {
      key: 'fecha',
      header: 'Fecha y hora',
      width: 150,
      sortValue: (a) => new Date(a.date).getTime(),
      render: (a) => (
        <View style={styles.tableDateCell}>
          <Calendar size={16} color={BRAND} />
          <Text style={styles.dateText}>{fmt(a.date)}</Text>
        </View>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      flex: 2,
      sortValue: (a) => (a.patientName || '').toLowerCase(),
      render: (a) => (
        <Text style={styles.tableName} numberOfLines={1}>{a.patientName || 'Paciente'}</Text>
      ),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      flex: 1,
      sortValue: (a) => a.type || '',
      render: (a) => a.type || 'Control Prenatal',
    },
    {
      key: 'estado',
      header: 'Estado',
      width: 150,
      align: 'center',
      sortValue: (a) => a.status || '',
      render: (a) => (
        <AppBadge label={STATUS_LABEL[a.status] || a.status} variant={STATUS_VARIANT[a.status] || 'default'} size="sm" />
      ),
    },
  ];

  const renderCard = (a: CitaRow) => (
    <View style={styles.card}>
      <View style={styles.dateBox}>
        <Calendar size={18} color={BRAND} />
        <Text style={styles.dateText}>{fmt(a.date)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{a.patientName || 'Paciente'}</Text>
        <Text style={styles.meta}>{a.type || 'Control Prenatal'}</Text>
      </View>
      <AppBadge label={STATUS_LABEL[a.status] || a.status} variant={STATUS_VARIANT[a.status] || 'default'} />
    </View>
  );

  return (
    <ListScreen<CitaRow>
      role="admin"
      title="Citas"
      subtitle="Agenda global · solo lectura"
      showBack
      accentColor={BRAND}
      width="full"
      data={filtered}
      keyExtractor={(a) => a.id}
      columns={columns}
      renderCard={renderCard}
      loading={isLoading}
      filters={FILTERS}
      activeFilter={filter}
      onFilterChange={setFilter}
      emptyIcon={Calendar}
      emptyTitle="Sin citas"
      emptyMessage="No hay citas con ese filtro."
    />
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    marginBottom: spacing.sm2,
    ...shadows.card,
  },
  dateBox: { alignItems: 'center', gap: 2, minWidth: 64 },
  dateText: { ...typography.caption, fontWeight: '700', color: BRAND },
  name: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  meta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  tableDateCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tableName: { ...typography.bodySm, fontWeight: '600', color: commonColors.text, flex: 1, minWidth: 0 },
});
