import React from 'react';
import { View, StyleSheet, Text, FlatList, StatusBar, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, AlertTriangle, User, Clock, CheckCircle, Share2 } from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ListSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { commonColors, obstetraColors, semanticColors, riskColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = obstetraColors.primary;

interface DangerSign {
  id: string;
  patientId?: string;
  patientName?: string;
  sign: string;
  notes?: string;
  severity?: 'rojo' | 'amarillo' | 'verde' | string;
  status?: 'pending' | 'reviewed' | string;
  createdAt: string;
}

import api from '../../../src/services/api';

const fetchDangerSigns = async (): Promise<DangerSign[]> => {
  try {
    const res = await api.get('/clinical/danger-signs', { params: { estado: 'pendiente' } });
    if (!res.data?.data) return [];
    
    return res.data.data.map((item: any) => ({
      id: item.id || item._id,
      patientId: item.gestante?.id,
      patientName: item.gestante?.user ? `${item.gestante.user.firstName} ${item.gestante.user.lastName}` : 'Paciente',
      sign: item.tipoSigno || 'Signo no especificado',
      notes: item.descripcion || '',
      severity: item.severidad || 'amarillo',
      status: item.estado,
      createdAt: item.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching danger signs:', error);
    return [];
  }
};

export default function AlertasScreen(): React.ReactElement {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['danger-signs'],
    queryFn: fetchDangerSigns,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, estado }: { id: string; estado: 'atendido' | 'derivado' }) => {
      const accionTomada =
        estado === 'atendido'
          ? 'Atendido por el obstetra'
          : 'Derivado al equipo de salud';
      const res = await api.patch(`/clinical/danger-signs/${id}`, { estado, accionTomada });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      // Refrescar la bandeja y el contador del dashboard del obstetra
      queryClient.invalidateQueries({ queryKey: ['danger-signs'] });
      queryClient.invalidateQueries({ queryKey: ['obstetraDashboard'] });
      Alert.alert(
        'Alerta actualizada',
        variables.estado === 'atendido'
          ? 'La alerta se marcó como atendida.'
          : 'La alerta se derivó al equipo de salud.'
      );
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo actualizar la alerta. Inténtalo de nuevo.');
    },
  });

  const confirmAction = (id: string, estado: 'atendido' | 'derivado') => {
    const titulo = estado === 'atendido' ? 'Atender alerta' : 'Derivar alerta';
    const mensaje =
      estado === 'atendido'
        ? '¿Marcar este signo de alarma como atendido?'
        : '¿Derivar este signo de alarma al equipo de salud?';
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => updateMutation.mutate({ id, estado }) },
    ]);
  };

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'rojo': case 'high': case 'grave': return riskColors.riskRed;
      case 'amarillo': case 'medium': case 'moderado': return riskColors.riskYellow;
      case 'verde': case 'low': case 'leve': return riskColors.riskGreen;
      default: return commonColors.textTertiary;
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'rojo': case 'high': case 'grave': return 'Grave';
      case 'amarillo': case 'medium': case 'moderado': return 'Moderado';
      case 'verde': case 'low': case 'leve': return 'Leve';
      default: return 'Desconocida';
    }
  };

  const sortedData = React.useMemo(() => {
    if (!data) return [];
    const severityOrder: Record<string, number> = { 
      'rojo': 1, 'high': 1, 'grave': 1,
      'amarillo': 2, 'medium': 2, 'moderado': 2,
      'verde': 3, 'low': 3, 'leve': 3 
    };
    return [...data].sort((a, b) => {
      const orderA = severityOrder[a.severity?.toLowerCase() || ''] || 4;
      const orderB = severityOrder[b.severity?.toLowerCase() || ''] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  const pendingCount = sortedData.length;
  const renderHeader = () => (
    <LinearGradient
      colors={obstetraColors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerWrapper}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
        <Text style={styles.headerTitle}>Alertas</Text>
        <Text style={styles.headerSubtitle}>
          {pendingCount > 0
            ? `${pendingCount} signo(s) de alarma por revisar`
            : 'Signos de alarma de pacientes'}
        </Text>
      </SafeAreaView>
    </LinearGradient>
  );

  const renderItem = ({ item }: { item: DangerSign }) => {
    const color = getSeverityColor(item.severity);
    
    return (
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <User size={16} color={commonColors.textSecondary} />
            <Text style={styles.patientName}>{item.patientName || 'Paciente'}</Text>
          </View>
          <View style={[styles.severityBadge, { backgroundColor: color + '15' }]}>
            <Text style={[styles.severityText, { color }]}>{getSeverityLabel(item.severity)}</Text>
          </View>
        </View>

        <View style={styles.signInfo}>
          <AlertTriangle size={20} color={color} style={styles.signIcon} />
          <View style={styles.signTextContainer}>
            <Text style={styles.signTitle}>{item.sign}</Text>
            {item.notes ? (
              <Text style={styles.signNotes} numberOfLines={2}>{item.notes}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Clock size={14} color={commonColors.textTertiary} />
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionDerive]}
            onPress={() => confirmAction(item.id, 'derivado')}
            disabled={updateMutation.isPending}
            activeOpacity={0.7}
          >
            <Share2 size={16} color={semanticColors.warning} />
            <Text style={[styles.actionText, { color: semanticColors.warning }]}>Derivar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionAttend]}
            onPress={() => confirmAction(item.id, 'atendido')}
            disabled={updateMutation.isPending}
            activeOpacity={0.7}
          >
            <CheckCircle size={16} color={semanticColors.success} />
            <Text style={[styles.actionText, { color: semanticColors.success }]}>Atender</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: spacing.lg, paddingHorizontal: spacing.lg }}>
      {isLoading ? (
        <ListSkeleton count={4} />
      ) : isError ? (
        <EmptyState
          icon={Bell as any}
          title="Error al cargar"
          description="Hubo un problema al obtener las alertas."
          themeColor={BRAND}
        />
      ) : (
        <EmptyState
          icon={Bell as any}
          title="Sin alertas pendientes"
          description="Aquí recibirás alertas de signos de alarma reportados por tus gestantes."
          themeColor={BRAND}
        />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={sortedData}
        keyExtractor={(item) => item.id || Math.random().toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onRefresh={refetch}
        refreshing={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: 24,
    marginBottom: 8,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: { ...typography.display, color: commonColors.white, marginBottom: 4 },
  headerSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.85)' },
  listContent: { paddingBottom: 100 },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  patientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patientName: { ...typography.bodyMedium, color: commonColors.text },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  severityText: { ...typography.overline, textTransform: 'uppercase' },
  signInfo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: commonColors.surfaceAlt, padding: 16, borderRadius: 16, marginBottom: 16 },
  signIcon: { marginTop: 2, marginRight: 12 },
  signTextContainer: { flex: 1 },
  signTitle: { ...typography.bodyMedium, color: commonColors.text, marginBottom: 4 },
  signNotes: { ...typography.bodySmall, color: commonColors.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { ...typography.caption, color: commonColors.textTertiary },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 14 },
  actionDerive: { backgroundColor: semanticColors.warningLight },
  actionAttend: { backgroundColor: semanticColors.successLight },
  actionText: { ...typography.label, fontWeight: '700' },
});
