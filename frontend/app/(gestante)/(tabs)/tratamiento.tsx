/**
 * VITMATERNA — Gestante: Mi Tratamiento (rediseño profesional)
 *
 * Jerarquía pensada para una gestante sin conocimientos técnicos:
 *   1) Constancia (racha + mejor racha + logros)  → motivación de un vistazo
 *   2) Mi adherencia (anillo + barra semanal)      → ¿cómo voy?
 *   3) Mis medicamentos (acción + calendario)      → ¿qué tomo y cuándo?
 *
 * Sin emojis: solo iconografía profesional (Lucide). El servidor calcula la
 * racha/adherencia; aquí se presenta de forma clara y ordenada.
 */
import React from 'react';
import {
  View, StyleSheet, Text, FlatList, RefreshControl, TouchableOpacity,
} from 'react-native';
import {
  Pill, Check, Clock, Info, Flame, Sprout, Shield, Trophy, Lock,
  CalendarDays, TrendingUp,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { ProgressRing } from '../../../src/components/ui/ProgressRing';
import { useToast } from '../../../src/components/ui';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useTreatments, useLogTreatment, useAdherenceGamification } from '../../../src/services/api-queries';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout, webLayout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { useResponsive } from '../../../src/theme/responsive';

const BRAND = gestanteColors.primary;

/** Mapa de identificador de logro (del backend) → icono profesional Lucide. */
const ACHIEVEMENT_ICONS: Record<string, any> = {
  sprout: Sprout,
  flame: Flame,
  shield: Shield,
  trophy: Trophy,
};

const INDICACIONES: Record<string, string> = {
  Sulfato: 'Tómalo con jugo de naranja para absorberlo mejor. Evita leche o té a esa hora.',
  Calcio: 'No lo tomes junto con el hierro. Acompáñalo con agua.',
  Ácido: 'Tómalo preferentemente con el desayuno.',
  Calcio_Carbonato: 'Sepáralo del hierro al menos 2 horas. Tómalo con agua.',
};

function getIndicacion(nombre: string): string {
  const key = Object.keys(INDICACIONES).find((k) => nombre.includes(k));
  return key ? INDICACIONES[key] : 'Tómalo según las indicaciones de tu obstetra.';
}

/** Color del nivel de adherencia (semáforo clínico). */
function adherenceColor(pct: number): string {
  if (pct >= 80) return semanticColors.success;
  if (pct >= 50) return semanticColors.warning;
  return semanticColors.danger;
}
function adherenceLabel(pct: number): string {
  if (pct >= 80) return 'Buena adherencia';
  if (pct >= 50) return 'Adherencia regular';
  return 'Adherencia baja';
}

// ─────────────────────────── 1. Constancia (racha) ───────────────────────────
function ConstanciaCard(): React.ReactElement | null {
  const { data: g } = useAdherenceGamification();
  if (!g || g.totalDiasTomados === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Flame size={18} color={BRAND} />
        <Text style={styles.cardHeaderTitle}>Tu constancia</Text>
      </View>

      {/* Racha actual + mejor racha, en dos columnas claras */}
      <View style={styles.streakRow}>
        <View style={styles.streakMain}>
          <Text style={styles.streakNumber}>{g.rachaActual}</Text>
          <Text style={styles.streakUnit}>
            día{g.rachaActual === 1 ? '' : 's'} seguidos
          </Text>
        </View>
        <View style={styles.streakDivider} />
        <View style={styles.streakSecondary}>
          <Text style={styles.streakSecValue}>{g.mejorRacha}</Text>
          <Text style={styles.streakSecLabel}>mejor racha</Text>
        </View>
      </View>

      <Text style={styles.streakMessage}>{g.mensaje}</Text>

      {/* Logros: iconos profesionales, estado claro (logrado / bloqueado) */}
      <View style={styles.achievementsRow}>
        {g.logros.map((l) => {
          const Icon = ACHIEVEMENT_ICONS[l.icono] ?? Trophy;
          return (
            <View
              key={l.id}
              style={styles.achievement}
              accessibilityLabel={`${l.titulo}: ${l.descripcion}. ${l.desbloqueado ? 'Logrado' : 'Bloqueado'}`}
            >
              <View style={[styles.achievementIcon, l.desbloqueado ? styles.achievementIconOn : styles.achievementIconOff]}>
                {l.desbloqueado
                  ? <Icon size={18} color={BRAND} />
                  : <Lock size={14} color={commonColors.textTertiary} />}
              </View>
              <Text
                style={[styles.achievementLabel, !l.desbloqueado && styles.achievementLabelOff]}
                numberOfLines={2}
              >
                {l.titulo}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface AdherenceReport {
  adherencePercentage: number;
  totalSupplements: number;
  takenSupplements: number;
  history: { date: string; taken: number; total: number }[];
}

// ─────────────────────────── 2. Mi adherencia ───────────────────────────
function AdherenciaCard(): React.ReactElement | null {
  const { data } = useQuery({
    queryKey: ['adherence'],
    queryFn: async () => {
      const res = await api.get('/reports/adherence');
      return res.data.data as AdherenceReport;
    },
  });

  if (!data) return null;

  const pct = data.adherencePercentage ?? 0;
  const color = adherenceColor(pct);
  // Últimos 7 días: barras verticales con etiqueta de día.
  const last7 = (data.history ?? []).slice(-7).map((h) => {
    const value = h.total > 0 ? Math.round((h.taken / h.total) * 100) : 0;
    const d = new Date(`${h.date}T00:00:00`);
    const dayLetter = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()];
    return { value, dayLetter, full: h.taken >= h.total && h.total > 0 };
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <TrendingUp size={18} color={BRAND} />
        <Text style={styles.cardHeaderTitle}>Mi adherencia</Text>
      </View>

      <View style={styles.adherenceTop}>
        <ProgressRing value={pct} size="lg" color={color} sublabel="cumplido" />
        <View style={styles.adherenceSummary}>
          <View style={[styles.adherencePill, { backgroundColor: color + '1A' }]}>
            <Text style={[styles.adherencePillText, { color }]}>{adherenceLabel(pct)}</Text>
          </View>
          <Text style={styles.adherenceDosesValue}>
            {data.takenSupplements ?? 0}<Text style={styles.adherenceDosesTotal}> / {data.totalSupplements ?? 0}</Text>
          </Text>
          <Text style={styles.adherenceDosesLabel}>dosis tomadas</Text>
        </View>
      </View>

      {last7.length > 0 && (
        <View style={styles.weekChart}>
          <Text style={styles.weekChartTitle}>Últimos 7 días</Text>
          <View style={styles.weekBars}>
            {last7.map((b, i) => (
              <View key={i} style={styles.weekBarCol}>
                <View style={styles.weekBarTrack}>
                  <View
                    style={[
                      styles.weekBarFill,
                      { height: `${Math.max(6, b.value)}%`, backgroundColor: b.full ? semanticColors.success : commonColors.border },
                    ]}
                  />
                </View>
                <Text style={styles.weekBarDay}>{b.dayLetter}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────── Calendario mensual (consumo) ───────────────────────────
function CalendarioConsumo({ diasTomados, diasOmitidos }: { diasTomados: string[]; diasOmitidos?: string[] }) {
  const hoy = new Date();
  const dias = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() - (27 - i));
    const fecha = d.toISOString().split('T')[0];
    return {
      fecha,
      tomado: diasTomados.includes(fecha),
      omitido: diasOmitidos?.includes(fecha) || false,
      dia: d.getDate(),
      esHoy: i === 27,
    };
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
              d.esHoy && calStyles.dayToday,
            ]}
          >
            {d.tomado ? (
              <Check size={13} color={commonColors.surface} strokeWidth={3} />
            ) : (
              <Text style={[calStyles.dayText, d.omitido ? calStyles.dayTextMissed : calStyles.dayTextEmpty]}>
                {d.dia}
              </Text>
            )}
          </View>
        ))}
      </View>
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: semanticColors.success }]} />
          <Text style={calStyles.legendText}>Tomado</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: semanticColors.dangerLight, borderWidth: 1, borderColor: semanticColors.danger }]} />
          <Text style={calStyles.legendText}>Omitido</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: commonColors.surfaceAlt }]} />
          <Text style={calStyles.legendText}>Sin registro</Text>
        </View>
      </View>
    </View>
  );
}

const calStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'space-between' },
  day: { width: '12%', aspectRatio: 1, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center' },
  dayTaken: { backgroundColor: semanticColors.success },
  dayMissed: { backgroundColor: semanticColors.dangerLight, borderWidth: 1, borderColor: semanticColors.danger },
  dayEmpty: { backgroundColor: commonColors.surfaceAlt },
  dayToday: { borderWidth: 2, borderColor: BRAND },
  dayText: { ...typography.caption, fontWeight: '600' },
  dayTextMissed: { color: semanticColors.danger },
  dayTextEmpty: { color: commonColors.textTertiary },
  legend: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 4 },
  legendText: { ...typography.caption, color: commonColors.textSecondary },
});

export default function TratamientoScreen(): React.ReactElement {
  const { webShell, select } = useResponsive();
  const tratamientoTourTarget = useTourTarget(TOUR_TARGETS.gestanteTratamiento);
  const webBodyMax = select({ base: 9999, lg: webLayout.contentMaxWidth.lg, xl: webLayout.contentMaxWidth.xl, xxl: webLayout.contentMaxWidth.xxl });
  const { data: treatments, isLoading, refetch, isRefetching } = useTreatments();
  const { mutate: logTreatment } = useLogTreatment();
  const toast = useToast();

  useRefetchOnFocus([refetch]);

  function handleRegistrar(id: string, nombre: string, yaTomado: boolean) {
    if (yaTomado) return;
    logTreatment(id, {
      onSuccess: () => toast.success('Consumo registrado', `Registraste ${nombre} para hoy.`),
      onError: () => toast.error('No se pudo registrar', 'Revisa tu conexión e inténtalo otra vez.'),
    });
  }

  const treatmentsData = treatments || [];
  const activos = treatmentsData.filter((t: any) => (t.estado || 'activo') === 'activo');
  const pendientesHoy = activos.filter((t: any) => !t.taken).length;

  const renderHeader = () => (
    <>
      {/* Resumen de HOY: lo más accionable, arriba del todo */}
      {activos.length > 0 && (
        <View ref={tratamientoTourTarget} collapsable={false} style={[styles.card, styles.todayCard]}>
          <View style={styles.todayIconWrap}>
            <Pill size={22} color={BRAND} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.todayTitle}>
              {pendientesHoy === 0 ? 'Todo tomado por hoy' : `Te falta${pendientesHoy === 1 ? '' : 'n'} ${pendientesHoy} de hoy`}
            </Text>
            <Text style={styles.todaySubtitle} numberOfLines={2}>
              {pendientesHoy === 0
                ? 'Buen trabajo. Mantén tu constancia mañana.'
                : 'Marca cada medicamento abajo cuando lo tomes.'}
            </Text>
          </View>
        </View>
      )}

      <ConstanciaCard />
      <AdherenciaCard />

      {activos.length > 0 && (
        <Text style={styles.sectionLabel}>Mis medicamentos</Text>
      )}
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
    const totalDias = item.totalDias || item.duracionDias || 30;
    const pct = typeof item.adherencia === 'number'
      ? item.adherencia
      : totalDias > 0 ? Math.round((diasTomados.length / totalDias) * 100) : 0;
    const yaRegistrado = !!item.taken;
    const color = adherenceColor(pct);

    return (
      <View style={styles.card}>
        {/* Identidad del medicamento + acción de hoy */}
        <View style={styles.medTop}>
          <View style={styles.medIcon}>
            <Pill size={22} color={BRAND} />
          </View>
          <View style={styles.medInfo}>
            <Text style={styles.medName} numberOfLines={1}>{nombre}</Text>
            <Text style={styles.medDosis} numberOfLines={1}>{dosis} · {frecuencia}</Text>
            {hora ? (
              <View style={styles.horaRow}>
                <Clock size={13} color={commonColors.textSecondary} />
                <Text style={styles.horaText}>{hora}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.registerBtn, yaRegistrado && styles.registerBtnDone]}
          onPress={() => handleRegistrar(id, nombre, yaRegistrado)}
          disabled={yaRegistrado}
          accessibilityRole="button"
          accessibilityLabel={yaRegistrado ? 'Ya registrado hoy' : `Marcar ${nombre} como tomado hoy`}
        >
          <Check size={18} color={yaRegistrado ? semanticColors.success : commonColors.surface} strokeWidth={3} />
          <Text style={[styles.registerBtnText, yaRegistrado && styles.registerBtnTextDone]}>
            {yaRegistrado ? 'Tomado hoy' : 'Marcar como tomado'}
          </Text>
        </TouchableOpacity>

        {/* Adherencia de este medicamento */}
        <View style={styles.medAdherence}>
          <View style={styles.medAdherenceHead}>
            <Text style={styles.medAdherenceLabel}>Adherencia</Text>
            <Text style={[styles.medAdherencePct, { color }]}>{pct}%</Text>
          </View>
          <View style={styles.medTrack}>
            <View style={[styles.medFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
          </View>
          <Text style={styles.medDays}>{diasTomados.length} de {totalDias} días registrados</Text>
        </View>

        {/* Calendario mensual */}
        <View style={styles.calSection}>
          <View style={styles.cardHeaderRow}>
            <CalendarDays size={16} color={commonColors.textSecondary} />
            <Text style={styles.calTitle}>Últimas 4 semanas</Text>
          </View>
          <CalendarioConsumo diasTomados={diasTomados} diasOmitidos={diasOmitidos} />
        </View>

        {/* Indicación clínica */}
        <View style={styles.indicacionRow}>
          <Info size={16} color={BRAND} />
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
        description="Tu plan de tratamiento aparecerá aquí una vez que tu obstetra lo prescriba."
        themeColor={BRAND}
      />
    </View>
  );

  return (
    <ScreenLayout
      role="gestante"
      title="Mi Tratamiento"
      subtitle="Suplementos y adherencia"
      loading={isLoading}
      accentColor={BRAND}
      scroll={false}
      width="wide"
      actions={<NotificationBell href="/(gestante)/notificaciones" color={commonColors.white} />}
    >
      <FlatList
        data={activos}
        keyExtractor={(item) => item.id || item._id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[styles.listContent, webShell && styles.listWeb, webShell && { maxWidth: webBodyMax }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={BRAND} />}
      />
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  listWeb: { width: '100%', alignSelf: 'center', paddingBottom: spacing.xl },

  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  cardHeaderTitle: { ...typography.label, fontWeight: '700', color: commonColors.text },

  // Resumen de hoy
  todayCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: gestanteColors.primaryLight },
  todayIconWrap: { width: 44, height: 44, borderRadius: 22, backgroundColor: commonColors.surface, alignItems: 'center', justifyContent: 'center' },
  todayTitle: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  todaySubtitle: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },

  // Constancia / racha
  streakRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  streakMain: { flex: 1, alignItems: 'flex-start' },
  streakNumber: { ...typography.display, color: BRAND, lineHeight: 46 },
  streakUnit: { ...typography.bodySm, fontWeight: '700', color: commonColors.text },
  streakDivider: { width: 1, height: 44, backgroundColor: commonColors.border, marginHorizontal: spacing.lg },
  streakSecondary: { alignItems: 'center', minWidth: 80 },
  streakSecValue: { ...typography.h2, color: commonColors.text },
  streakSecLabel: { ...typography.caption, color: commonColors.textSecondary },
  streakMessage: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.md },
  achievementsRow: { flexDirection: 'row', gap: spacing.sm, borderTopWidth: 1, borderTopColor: commonColors.borderLight, paddingTop: spacing.md },
  achievement: { flex: 1, alignItems: 'center', gap: 6 },
  achievementIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  achievementIconOn: { backgroundColor: gestanteColors.primaryLight },
  achievementIconOff: { backgroundColor: commonColors.surfaceAlt },
  achievementLabel: { ...typography.caption, fontWeight: '600', color: commonColors.text, textAlign: 'center' },
  achievementLabelOff: { color: commonColors.textTertiary },

  // Adherencia
  adherenceTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  adherenceSummary: { flex: 1, gap: 4 },
  adherencePill: { alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  adherencePillText: { ...typography.caption, fontWeight: '700' },
  adherenceDosesValue: { ...typography.h1, color: commonColors.text, marginTop: 2 },
  adherenceDosesTotal: { ...typography.h3, color: commonColors.textSecondary },
  adherenceDosesLabel: { ...typography.caption, color: commonColors.textSecondary },
  weekChart: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: commonColors.borderLight, paddingTop: spacing.md },
  weekChartTitle: { ...typography.caption, fontWeight: '700', color: commonColors.textSecondary, marginBottom: spacing.sm },
  weekBars: { flexDirection: 'row', justifyContent: 'space-between', height: 80, alignItems: 'flex-end' },
  weekBarCol: { flex: 1, alignItems: 'center', gap: 6 },
  weekBarTrack: { width: 10, height: 60, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, justifyContent: 'flex-end', overflow: 'hidden' },
  weekBarFill: { width: '100%', borderRadius: borderRadius.full },
  weekBarDay: { ...typography.caption, color: commonColors.textSecondary },

  sectionLabel: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.xs, marginLeft: 4 },

  // Medicamento
  medTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  medIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: gestanteColors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  medInfo: { flex: 1, minWidth: 0 },
  medName: { ...typography.h3, color: commonColors.text },
  medDosis: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  horaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  horaText: { ...typography.caption, color: commonColors.textSecondary },

  registerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: BRAND, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginTop: spacing.md },
  registerBtnDone: { backgroundColor: semanticColors.successLight },
  registerBtnText: { ...typography.button, color: commonColors.surface },
  registerBtnTextDone: { color: semanticColors.success },

  medAdherence: { marginTop: spacing.lg },
  medAdherenceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  medAdherenceLabel: { ...typography.label, fontWeight: '700', color: commonColors.text },
  medAdherencePct: { ...typography.label, fontWeight: '700' },
  medTrack: { height: 10, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, overflow: 'hidden' },
  medFill: { height: '100%', borderRadius: borderRadius.full },
  medDays: { ...typography.caption, color: commonColors.textSecondary, marginTop: 6 },

  calSection: { marginTop: spacing.lg },
  calTitle: { ...typography.label, fontWeight: '700', color: commonColors.text },

  indicacionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.lg },
  indicacionText: { flex: 1, ...typography.bodySm, color: commonColors.text },

  emptyContainer: { paddingTop: spacing.xl },
});
