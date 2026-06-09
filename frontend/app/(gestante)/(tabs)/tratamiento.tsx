import React, { useState } from 'react';
import {
  View, StyleSheet, Text, FlatList, RefreshControl,
  TouchableOpacity, Alert, Platform, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Pill, CheckCircle, Clock, Info } from 'lucide-react-native';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useTreatments, useLogTreatment } from '../../../src/services/api-queries';
import { typography } from '../../../src/theme/typography';

const INDICACIONES: Record<string, string> = {
  Sulfato: 'Tomar con jugo de naranja para mejor absorción. No tomar con leche o té.',
  Calcio: 'No tomar al mismo tiempo que el hierro. Tomar con agua.',
  Ácido: 'Tomar preferentemente con el desayuno.',
  Calcio_Carbonato: 'Separar del hierro por al menos 2 horas. Tomar con agua.',
};

function getIndicacion(nombre: string): string {
  const key = Object.keys(INDICACIONES).find((k) => nombre.includes(k));
  return key ? INDICACIONES[key] : 'Tomar según indicaciones de su obstetra.';
}

function AdherenciaBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';
  return (
    <View>
      <View style={adhStyles.track}>
        <View style={[adhStyles.fill, { width: `${Math.min(100, pct)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[adhStyles.pctLabel, { color }]}>{pct}% Adherencia</Text>
    </View>
  );
}

const adhStyles = StyleSheet.create({
  track: { height: 12, backgroundColor: '#F1F5F9', borderRadius: 99, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99 },
  pctLabel: { fontFamily: typography.bodySmall.fontFamily, fontSize: 13, fontWeight: '700', marginTop: 8 },
});

function CalendarioConsumo({ diasTomados, diasOmitidos }: { diasTomados: string[]; diasOmitidos?: string[] }) {
  const hoy = new Date();
  const dias = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (29 - i));
    const fecha = d.toISOString().split('T')[0];
    const tomado = diasTomados.includes(fecha);
    const omitido = diasOmitidos?.includes(fecha) || false;
    return { fecha, tomado, omitido, dia: d.getDate() };
  });

  return (
    <View>
      <View style={calStyles.grid}>
        {dias.map((d) => (
          <View
            key={d.fecha}
            style={[
              calStyles.day,
              d.tomado ? calStyles.dayTaken : d.omitido ? calStyles.dayMissed : calStyles.dayEmpty,
            ]}
          >
            <Text style={[calStyles.dayText, d.tomado ? calStyles.dayTextTaken : calStyles.dayTextOther]}>
              {d.dia}
            </Text>
          </View>
        ))}
      </View>
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: '#10B981' }]} />
          <Text style={calStyles.legendText}>Tomado</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: '#FEE2E2' }]} />
          <Text style={calStyles.legendText}>Omitido</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: '#F1F5F9' }]} />
          <Text style={calStyles.legendText}>Sin dato</Text>
        </View>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
  day: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayTaken: { backgroundColor: '#10B981' },
  dayMissed: { backgroundColor: '#FEE2E2' },
  dayEmpty: { backgroundColor: '#F1F5F9' },
  dayText: { fontFamily: typography.bodySmall.fontFamily, fontSize: 13, fontWeight: '600' },
  dayTextTaken: { color: '#FFFFFF' },
  dayTextOther: { color: '#64748B' },
  legend: { flexDirection: 'row', gap: 16, marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: '#64748B' },
});

export default function TratamientoScreen(): React.ReactElement {
  const { data: treatments, isLoading, refetch } = useTreatments();
  const { mutate: logTreatment, isPending: isLogging } = useLogTreatment();
  const [registradosHoy, setRegistradosHoy] = useState<string[]>([]);

  if (isLoading) return <LoadingScreen message="Cargando tu tratamiento..." />;

  function handleRegistrar(id: string, nombre: string) {
    if (registradosHoy.includes(id)) return;
    setRegistradosHoy((prev) => [...prev, id]);
    logTreatment(id);
    Alert.alert('✓ Registrado', `Consumo de ${nombre} registrado para hoy.`);
  }

  const semanaGestacional = (treatments as any)?.[0]?.weekNumber || null;
  const treatmentsData = treatments || [];

  const renderHeader = () => (
    <>
      <View style={styles.headerWrapper}>
        <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mi Tratamiento</Text>
          {semanaGestacional && (
            <Text style={styles.headerSubtitle}>Semana {semanaGestacional} de gestación</Text>
          )}
        </SafeAreaView>
      </View>

      <View style={styles.contentWrapper}>
        {semanaGestacional && (
          <View style={styles.infoBanner}>
            <Info size={20} color="#2563EB" />
            <Text style={styles.infoBannerText}>
              {semanaGestacional < 14
                ? 'Está tomando Ácido Fólico para proteger el sistema nervioso del bebé.'
                : semanaGestacional < 20
                ? 'Ya inició el Sulfato Ferroso + Ácido Fólico. Continúe el tratamiento diariamente.'
                : 'Toma Sulfato Ferroso y Calcio para apoyar el desarrollo óseo del bebé.'}
            </Text>
          </View>
        )}
      </View>
    </>
  );

  const renderItem = ({ item }: { item: any }) => {
    const id = item.id || item._id;
    const nombre = item.medicationName || item.nombre || 'Medicamento';
    const dosis = item.dosage || item.dosis || '1 tableta';
    const frecuencia = item.frequency || item.frecuencia || 'Diario';
    const hora = item.scheduleTime || item.horaRecordatorio || '';
    const diasTomados: string[] = item.diasTomados || [];
    const diasOmitidos: string[] = item.diasOmitidos || [];
    const totalDias = item.totalDias || 30;
    const pct = totalDias > 0 ? Math.round((diasTomados.length / totalDias) * 100) : 0;
    const yaRegistrado = item.taken || registradosHoy.includes(id);

    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.pillIcon}>
            <Pill size={24} color="#7C3AED" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.medName}>{nombre}</Text>
            <Text style={styles.medDosis}>{dosis} · {frecuencia}</Text>
            {hora ? (
              <View style={styles.horaRow}>
                <Clock size={14} color="#64748B" />
                <Text style={styles.horaText}>{hora}</Text>
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.registerBtn, yaRegistrado && styles.registerBtnDone]}
            onPress={() => handleRegistrar(id, nombre)}
            disabled={yaRegistrado || isLogging}
          >
            <CheckCircle size={18} color={yaRegistrado ? '#10B981' : '#FFFFFF'} />
            <Text style={[styles.registerBtnText, yaRegistrado && styles.registerBtnTextDone]}>
              {yaRegistrado ? 'Registrado' : 'Tomé hoy'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <View style={styles.adherenciaWrap}>
          <AdherenciaBar pct={pct} />
          <Text style={styles.adherenciaDays}>{diasTomados.length} de {totalDias} días registrados</Text>
        </View>

        <View style={styles.calendarioSection}>
          <Text style={styles.calendarioTitle}>Últimos 30 días</Text>
          <CalendarioConsumo diasTomados={diasTomados} diasOmitidos={diasOmitidos} />
        </View>

        <View style={styles.indicacionRow}>
          <Info size={16} color="#64748B" />
          <Text style={styles.indicacionText}>{getIndicacion(nombre)}</Text>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <EmptyState
        icon={Pill}
        title="Sin tratamiento activo"
        description="Tu plan de tratamiento aparecerá aquí una vez prescrito por tu obstetra."
        themeColor="#7C3AED"
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={treatmentsData}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor="#7C3AED" />}
      />
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
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }),
    fontSize: 16,
    color: '#64748B',
  },
  contentWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
  },
  infoBannerText: {
    flex: 1,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: '#1E3A8A',
    lineHeight: 20,
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pillIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  medName: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  medDosis: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: '#64748B',
  },
  horaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  horaText: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 13,
    color: '#64748B',
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  registerBtnDone: { backgroundColor: '#DCFCE7' },
  registerBtnText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  registerBtnTextDone: { color: '#10B981' },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 20,
  },
  adherenciaWrap: { marginBottom: 20 },
  adherenciaDays: {
    fontFamily: typography.caption.fontFamily,
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
  },
  calendarioSection: { marginBottom: 20 },
  calendarioTitle: {
    fontFamily: typography.h3.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  indicacionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  indicacionText: {
    flex: 1,
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  emptyContainer: {
    paddingHorizontal: 20,
    paddingTop: 40,
  },
});
