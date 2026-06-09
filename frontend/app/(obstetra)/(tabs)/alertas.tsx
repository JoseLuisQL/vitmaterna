import React from 'react';
import { View, StyleSheet, Text, FlatList, ActivityIndicator, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, AlertTriangle, User, Clock } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { typography } from '../../../src/theme/typography';

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

const fetchDangerSigns = async (): Promise<DangerSign[]> => {
  return [] as DangerSign[];
};

export default function AlertasScreen(): React.ReactElement {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['danger-signs'],
    queryFn: fetchDangerSigns,
  });

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'rojo': case 'high': return '#EF4444';
      case 'amarillo': case 'medium': return '#F59E0B';
      case 'verde': case 'low': return '#10B981';
      default: return '#94A3B8';
    }
  };

  const getSeverityLabel = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'rojo': case 'high': return 'Alta';
      case 'amarillo': case 'medium': return 'Media';
      case 'verde': case 'low': return 'Baja';
      default: return 'Desconocida';
    }
  };

  const sortedData = React.useMemo(() => {
    if (!data) return [];
    const severityOrder: Record<string, number> = { 'rojo': 1, 'high': 1, 'amarillo': 2, 'medium': 2, 'verde': 3, 'low': 3 };
    return [...data].sort((a, b) => {
      const orderA = severityOrder[a.severity?.toLowerCase() || ''] || 4;
      const orderB = severityOrder[b.severity?.toLowerCase() || ''] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [data]);

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
        <Text style={styles.headerTitle}>Alertas</Text>
        <Text style={styles.headerSubtitle}>Signos de alarma de pacientes</Text>
      </SafeAreaView>
    </View>
  );

  const renderItem = ({ item }: { item: DangerSign }) => {
    const color = getSeverityColor(item.severity);
    
    return (
      <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.patientInfo}>
            <User size={16} color="#64748B" />
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
          <Clock size={14} color="#94A3B8" />
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={{ marginTop: 60, paddingHorizontal: 20 }}>
      {isLoading ? (
        <ActivityIndicator size="large" color="#BE185D" />
      ) : isError ? (
        <EmptyState
          icon={Bell as any}
          title="Error al cargar"
          description="Hubo un problema al obtener las alertas."
          themeColor="#BE185D"
        />
      ) : (
        <EmptyState
          icon={Bell as any}
          title="Sin alertas pendientes"
          description="Aquí recibirás alertas de signos de alarma reportados por tus gestantes."
          themeColor="#BE185D"
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerWrapper: {
    paddingBottom: 24,
    marginBottom: 8,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }), fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 4, letterSpacing: -0.5 },
  headerSubtitle: { fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }), fontSize: 16, color: '#64748B' },
  listContent: { paddingBottom: 100 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  patientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  patientName: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  severityBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  severityText: { fontFamily: typography.caption.fontFamily, fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  signInfo: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, marginBottom: 16 },
  signIcon: { marginTop: 2, marginRight: 12 },
  signTextContainer: { flex: 1 },
  signTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#0F172A', marginBottom: 4 },
  signNotes: { fontFamily: typography.bodySmall.fontFamily, fontSize: 14, color: '#64748B', lineHeight: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  timeText: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8' },
});
