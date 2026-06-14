import React from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import api from '../../../src/services/api';
import { ProgressRing } from '../../../src/components/ui/ProgressRing';
import { ChartBar, type ChartBarDatum } from '../../../src/components/ui/ChartBar';
import { CardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { gestanteColors, commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';

const BRAND = gestanteColors.primary;

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

  const adherence = data?.adherencePercentage || 0;
  const history = data?.history || [];

  const chartData: ChartBarDatum[] = React.useMemo(
    () =>
      history.slice(-7).map((h) => ({
        label: h.date.substring(8, 10),
        value: h.total > 0 ? Math.round((h.taken / h.total) * 100) : 0,
      })),
    [history],
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gestanteColors.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <Text style={styles.headerTitle}>Mi Progreso</Text>
          <Text style={styles.headerSubtitle}>Tu adherencia al tratamiento</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />
        }
      >
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton style={{ marginTop: spacing.lg }} />
          </>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Adherencia General</Text>
              <View style={styles.chartContainer}>
                <ProgressRing
                  value={adherence}
                  size={160}
                  strokeWidth={14}
                  color={BRAND}
                  sublabel="adherencia"
                />
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{data?.takenSupplements || 0}</Text>
                <Text style={styles.summaryLabel}>
                  de {data?.totalSupplements || 0} medicamentos
                </Text>
              </View>
            </View>

            {chartData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Últimos 7 días (%)</Text>
                <ChartBar
                  data={chartData}
                  color={BRAND}
                  maxValue={100}
                  height={160}
                  showValues
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: {
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
  },
  headerSubtitle: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: layout.tabBarSpace,
    marginTop: -spacing.lg,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.lg, textAlign: 'center' },
  chartContainer: { alignItems: 'center' },
  summaryBox: {
    backgroundColor: gestanteColors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  summaryValue: { ...typography.numeric, color: BRAND },
  summaryLabel: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 4 },
});
