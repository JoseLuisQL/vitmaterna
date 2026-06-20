/**
 * VITMATERNA — DashboardScreen (patrón de panel de inicio)
 *
 * Plantilla para los 3 dashboards (gestante/obstetra/admin). Estandariza:
 *   - Saludo + fecha discretos.
 *   - Fila de KPIs (AutoGrid) con skeleton de carga (KpiRowSkeleton).
 *   - Cuerpo de secciones (SectionCard) que en web puede ir a 2 columnas.
 *
 * El obstetra ya tenía este patrón en línea; aquí se extrae para reutilizarlo.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenLayout, type ScreenRole } from '../layout/ScreenLayout';
import { AppText } from '../ui/AppText';
import { KpiRowSkeleton } from '../ui/SkeletonLoader';
import { commonColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useResponsive } from '../../theme/responsive';

interface DashboardScreenProps {
  role: ScreenRole;
  title: string;
  subtitle?: string;
  accentColor: string;
  /** Saludo (p. ej. "Hola, Ana"). */
  greeting?: string;
  /** Fecha o contexto del día. */
  contextLine?: string;
  actions?: React.ReactNode;

  /** Fila de KPIs (ya compuesta por la pantalla). */
  kpis?: React.ReactNode;
  /** Secciones del panel. */
  children: React.ReactNode;

  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function DashboardScreen({
  role,
  title,
  subtitle,
  accentColor,
  greeting,
  contextLine,
  actions,
  kpis,
  children,
  loading = false,
  refreshing = false,
  onRefresh,
}: DashboardScreenProps): React.ReactElement {
  const { webShell } = useResponsive();

  return (
    <ScreenLayout
      role={role}
      title={title}
      subtitle={subtitle}
      accentColor={accentColor}
      actions={actions}
      width={webShell ? 'wide' : 'full'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {greeting ? <AppText variant="h3">{greeting}</AppText> : null}
      {contextLine ? (
        <AppText variant="bodySm" color={commonColors.textSecondary} style={styles.context}>
          {contextLine}
        </AppText>
      ) : null}

      {loading ? (
        <KpiRowSkeleton count={3} />
      ) : kpis ? (
        <View style={styles.kpis}>{kpis}</View>
      ) : null}

      {!loading ? <View style={styles.body}>{children}</View> : null}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  context: { textTransform: 'capitalize', marginTop: 2, marginBottom: spacing.lg },
  kpis: { marginBottom: spacing.lg },
  body: {},
});

export default DashboardScreen;
