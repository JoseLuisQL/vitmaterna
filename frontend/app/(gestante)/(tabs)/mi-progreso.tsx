import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { ProgressChart, LineChart } from 'react-native-chart-kit';
import { typography } from '../../../src/theme/typography';

interface AdherenceReport {
  adherencePercentage: number;
  totalSupplements: number;
  takenSupplements: number;
  history: {
    date: string;
    taken: number;
    total: number;
  }[];
}

export default function MiProgresoScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['adherence'],
    queryFn: async () => {
      const res = await api.get('/reports/adherence');
      return res.data.data as AdherenceReport;
    },
  });

  if (isLoading) {
    return <LoadingScreen message="Cargando progreso..." />;
  }

  const adherence = data?.adherencePercentage || 0;
  const history = data?.history || [];

  const chartData = {
    labels: ['Adherencia'],
    data: [adherence / 100],
  };

  const lineChartData = {
    labels: history.slice(-7).map(h => h.date.substring(5, 10)),
    datasets: [
      {
        data: history.slice(-7).map(h => h.taken > 0 ? (h.taken / h.total) * 100 : 0),
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
        strokeWidth: 3
      }
    ],
  };

  const screenWidth = Dimensions.get('window').width - 40;

  return (
    <View style={styles.container}>
      <View style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mi Progreso</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#7C3AED" />}
      >
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Adherencia General</Text>
          <View style={styles.chartContainer}>
            <ProgressChart
              data={chartData}
              width={screenWidth - 48}
              height={200}
              strokeWidth={20}
              radius={80}
              chartConfig={{
                backgroundColor: '#ffffff',
                backgroundGradientFrom: '#ffffff',
                backgroundGradientTo: '#ffffff',
                color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(15, 23, 42, ${opacity})`,
                propsForLabels: {
                  fontFamily: typography.bodyMedium.fontFamily,
                  fontSize: 14,
                  fontWeight: '700'
                }
              }}
              hideLegend={false}
            />
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryValue}>{data?.takenSupplements || 0}</Text>
            <Text style={styles.summaryLabel}>de {data?.totalSupplements || 0} medicamentos</Text>
          </View>
        </View>

        {history.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Últimos 7 Días (%)</Text>
            <View style={styles.chartContainer}>
              <LineChart
                data={lineChartData}
                width={screenWidth - 48}
                height={220}
                withInnerLines={false}
                withOuterLines={true}
                chartConfig={{
                  backgroundColor: '#ffffff',
                  backgroundGradientFrom: '#ffffff',
                  backgroundGradientTo: '#ffffff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                  propsForLabels: { fontFamily: typography.caption.fontFamily },
                  propsForDots: { r: '5', strokeWidth: '2', stroke: '#7C3AED', fill: '#FFFFFF' }
                }}
                bezier
                style={{ marginVertical: 8, borderRadius: 16 }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: {
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 4,
  },
  safeAreaHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontFamily: typography.h1.fontFamily,
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
  },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, marginTop: -32 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 24, textAlign: 'center' },
  chartContainer: { alignItems: 'center' },
  summaryBox: { backgroundColor: '#F5F3FF', borderRadius: 20, padding: 16, alignItems: 'center', marginTop: 16 },
  summaryValue: { fontFamily: typography.h1.fontFamily, fontSize: 32, fontWeight: '800', color: '#7C3AED' },
  summaryLabel: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#64748B', marginTop: 4 },
});
