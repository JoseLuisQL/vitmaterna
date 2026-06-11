import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { ProgressChart, LineChart } from 'react-native-chart-kit';
import { gestanteColors, commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = gestanteColors.primary;

/** Convierte un color hex (#RRGGBB) a una función rgba para react-native-chart-kit. */
const hexToRgba = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (opacity = 1) => `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

const brandColor = hexToRgba(gestanteColors.primary);
const textColor = hexToRgba(commonColors.text);
const textSecondaryColor = hexToRgba(commonColors.textSecondary);

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
        color: brandColor,
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
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
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
                backgroundColor: commonColors.surface,
                backgroundGradientFrom: commonColors.surface,
                backgroundGradientTo: commonColors.surface,
                color: brandColor,
                labelColor: textColor,
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
                  backgroundColor: commonColors.surface,
                  backgroundGradientFrom: commonColors.surface,
                  backgroundGradientTo: commonColors.surface,
                  decimalPlaces: 0,
                  color: brandColor,
                  labelColor: textSecondaryColor,
                  propsForLabels: { fontFamily: typography.caption.fontFamily },
                  propsForDots: { r: '5', strokeWidth: '2', stroke: gestanteColors.primary, fill: commonColors.surface }
                }}
                bezier
                style={{ marginVertical: spacing.sm, borderRadius: borderRadius.lg }}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: {
    paddingBottom: spacing.xl,
    backgroundColor: commonColors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    borderBottomWidth: 1,
    borderColor: commonColors.border,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: commonColors.text,
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, marginTop: -32 },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  cardTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.lg, textAlign: 'center' },
  chartContainer: { alignItems: 'center' },
  summaryBox: { backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', marginTop: spacing.md },
  summaryValue: { ...typography.display, color: BRAND },
  summaryLabel: { ...typography.bodySmall, color: commonColors.textSecondary, marginTop: 4 },
});
