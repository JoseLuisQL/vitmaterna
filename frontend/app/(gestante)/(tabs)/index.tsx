import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Pill,
  AlertTriangle,
  Phone,
  ChevronRight,
  BookOpen,
  Menu,
} from 'lucide-react-native';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { AppButton } from '../../../src/components/ui/AppButton';
import { StatusChip } from '../../../src/components/ui/StatusChip';
import { ProgressRing } from '../../../src/components/ui/ProgressRing';
import { useToast, AutoGrid, IconButton, PrenatalRibbon } from '../../../src/components/ui';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useAuthStore } from '../../../src/store/authStore';
import { useGestanteDashboard, useConfirmAppointment } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';
import { EmergencyAlert, type EmergencyCoords } from '../../../src/components/shared/EmergencyAlert';
import { useSidebar } from '../../../src/components/layout/SidebarProvider';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../../src/theme/responsive';

const BRAND = gestanteColors.primary;

export default function GestanteDashboard(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const { open: openSidebar } = useSidebar();
  const { webShell } = useResponsive();
  const displayName = user?.firstName || 'Gestante';

  const { data, isLoading, refetch } = useGestanteDashboard();
  const toast = useToast();
  useRefetchOnFocus([refetch]);
  const confirmMutation = useConfirmAppointment();

  const [emergencyVisible, setEmergencyVisible] = React.useState(false);

  // El envío real de la alerta. El modal EmergencyAlert gestiona GPS, estados
  // y errores; aquí solo se hace la llamada (debe lanzar si falla).
  const sendEmergency = React.useCallback(async (coords: EmergencyCoords) => {
    await api.post('/chat/emergencia', {
      latitude: coords.latitude,
      longitude: coords.longitude,
    });
  }, []);

  const handleEmergencyPress = () => setEmergencyVisible(true);

  const nextAppointment = data?.nextAppointment;
  const todayTreatments = data?.todayTreatments || [];
  const takenCount = todayTreatments.filter((t: any) => t.taken).length;
  const totalTreatments = todayTreatments.length;
  const treatmentPercentage = totalTreatments > 0 ? Math.round((takenCount / totalTreatments) * 100) : 0;

  const profile = data?.profile;

  // Cálculo memoizado de semanas de gestación (evita recálculo por render).
  // Cuenta días COMPLETOS desde la FUM hasta hoy (sin Math.abs, para que una FUM
  // futura no produzca semanas erróneas) y lo acota a 0–42.
  const weeks = React.useMemo(() => {
    if (!profile?.fum) return 0;
    const fum = new Date(profile.fum);
    if (isNaN(fum.getTime())) return 0;
    const diffDays = Math.floor((Date.now() - fum.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 0;
    return Math.min(42, Math.floor(diffDays / 7));
  }, [profile?.fum]);

  // Semana de gestación en la que cae la próxima cita → hito sobre la cinta.
  const ribbonMilestones = React.useMemo(() => {
    if (!profile?.fum || !nextAppointment?.date) return [];
    const fum = new Date(profile.fum);
    const cita = new Date(nextAppointment.date);
    if (isNaN(fum.getTime()) || isNaN(cita.getTime())) return [];
    const w = Math.floor((cita.getTime() - fum.getTime()) / (1000 * 60 * 60 * 24 * 7));
    if (w <= 0 || w > 42) return [];
    return [{ week: w, label: 'Próxima cita' }];
  }, [profile?.fum, nextAppointment?.date]);

  // Sin FUM registrada no podemos calcular semanas: ofrecemos onboarding (issue #12).
  const hasFum = !!profile?.fum && !isNaN(new Date(profile.fum).getTime());
  const gestationalWeekText = weeks > 0 ? `Semana ${weeks}` : 'Semana --';
  const progressText = weeks > 0 ? `Semana ${weeks} de 40` : 'Aún sin semana';

  // Datos de la próxima cita normalizados.
  const nextStatus: string = nextAppointment?.status || 'programada';
  const canConfirmNext = nextStatus === 'programada';

  const handleConfirmNext = () => {
    if (!nextAppointment?.id) return;
    confirmMutation.mutate(nextAppointment.id, {
      onSuccess: () => {
        toast.success('Cita confirmada', 'Tu obstetra fue notificada.');
        refetch();
      },
      onError: () => toast.error('No se pudo confirmar', 'Inténtalo nuevamente.'),
    });
  };

  const riskLevel = profile?.nivelRiesgo || 'verde';
  const getRiskLabel = (level: string) => {
    if (level === 'rojo') return 'Riesgo Alto';
    if (level === 'amarillo') return 'Riesgo Medio';
    return 'Riesgo Bajo';
  };
  const getRiskVariant = (level: string) => {
    if (level === 'rojo') return 'danger';
    if (level === 'amarillo') return 'warning';
    return 'success';
  };

  return (
    <>
      <ScreenLayout
        role="gestante"
        title={`Hola, ${displayName}`}
        subtitle={gestationalWeekText}
        loading={isLoading}
        onRefresh={refetch}
        accentColor={BRAND}
        width="full"
        actions={
          webShell ? undefined : (
            <>
              <NotificationBell href="/(gestante)/notificaciones" color={commonColors.white} />
              <IconButton icon={Menu} onPress={openSidebar} accessibilityLabel="Abrir menú" variant="onColor" />
            </>
          )
        }
      >
          {/* Onboarding (issue #12): si no hay FUM, invitamos a registrarla para
              ver de inmediato las semanas de embarazo. Convierte el estado vacío
              en una acción útil. */}
          {!hasFum && (
            <AppCard style={styles.onboardingCard} onPress={() => router.push('/(gestante)/(tabs)/perfil')}>
              <View style={styles.onboardingRow}>
                <View style={styles.onboardingIcon}>
                  <Calendar size={24} color={BRAND} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.onboardingTitle}>Empecemos por tu embarazo</Text>
                  <Text style={styles.onboardingText}>
                    Cuéntanos la fecha de tu última regla y te mostramos en qué semana estás.
                  </Text>
                </View>
                <ChevronRight size={20} color={commonColors.textTertiary} />
              </View>
            </AppCard>
          )}

          {/* Tu embarazo — la cinta prenatal es la firma de la app: muestra el
              avance real semana a semana, los trimestres y el "hoy" que late. */}
          <AppCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Tu embarazo</Text>
                <Text style={styles.progressSubtitle}>{progressText}</Text>
              </View>
              <AppBadge label={getRiskLabel(riskLevel)} variant={getRiskVariant(riskLevel) as any} />
            </View>
            <PrenatalRibbon week={weeks} colors={gestanteColors.gradient} milestones={ribbonMilestones} />
          </AppCard>

          {/* Next Appointment — sin onPress en la tarjeta para evitar botón
              anidado (contiene el botón "Confirmar asistencia"). La navegación
              a Citas se hace desde la fila de cabecera. */}
          <AppCard style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() => router.push('/(gestante)/(tabs)/citas')}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Ver mis citas"
            >
              <View style={styles.cardIconCircle}>
                <Calendar size={22} color={commonColors.textSecondary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle} numberOfLines={1}>Próxima Cita</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{nextAppointment?.type || 'Control Prenatal'}</Text>
              </View>
              <ChevronRight size={20} color={commonColors.textTertiary} />
            </TouchableOpacity>
            
            <View style={styles.cardDetails}>
              {nextAppointment ? (
                <>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Fecha:</Text>
                    <Text style={styles.detailValue}>{new Date(nextAppointment.date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hora:</Text>
                    <Text style={styles.detailValue}>{new Date(nextAppointment.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Estado:</Text>
                    <StatusChip status={nextStatus} />
                  </View>
                  {canConfirmNext && (
                    <AppButton
                      title={confirmMutation.isPending ? 'Confirmando...' : 'Confirmar asistencia'}
                      onPress={handleConfirmNext}
                      disabled={confirmMutation.isPending}
                      themeColor={BRAND}
                      style={{ marginTop: spacing.md }}
                    />
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>No tienes citas programadas próximamente.</Text>
              )}
            </View>
          </AppCard>

          {/* Today's Treatment */}
          <AppCard style={styles.sectionCard} onPress={() => router.push('/(gestante)/(tabs)/tratamiento')}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconCircle}>
                <Pill size={22} color={commonColors.textSecondary} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle} numberOfLines={1}>Tratamiento del Día</Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {totalTreatments > 0 ? `${takenCount} de ${totalTreatments} medicamentos tomados` : 'Sin tratamientos para hoy'}
                </Text>
              </View>
              <ChevronRight size={20} color={commonColors.textTertiary} />
            </View>
            {totalTreatments > 0 && (
              <View style={styles.treatmentProgress}>
                <ProgressRing
                  value={treatmentPercentage}
                  size="md"
                  color={BRAND}
                  label={`${takenCount}/${totalTreatments}`}
                />
                <View style={styles.treatmentInfo}>
                  <Text style={styles.treatmentInfoValue} numberOfLines={1}>{treatmentPercentage}% completado</Text>
                  <Text style={styles.treatmentInfoLabel} numberOfLines={2}>
                    {takenCount === totalTreatments
                      ? '¡Excelente! Tomaste todo hoy.'
                      : `Te faltan ${totalTreatments - takenCount} por tomar.`}
                  </Text>
                </View>
              </View>
            )}
          </AppCard>

          {/* Quick Actions — iconos limpios (minimalistas). Solo emergencia y
              signos de alarma conservan color semántico por criticidad clínica. */}
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <AutoGrid minColumnWidth={100} maxColumns={4}>
            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/alarmas')}>
              <View style={styles.quickActionIcon}>
                <AlertTriangle size={24} color={semanticColors.danger} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={1}>Reportar</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>Signo de alarma</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={handleEmergencyPress}>
              <View style={styles.quickActionIcon}>
                <Phone size={24} color={semanticColors.success} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={1}>Emergencia</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>Pedir auxilio</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/(tabs)/educacion')}>
              <View style={styles.quickActionIcon}>
                <BookOpen size={24} color={commonColors.textSecondary} />
              </View>
              <Text style={styles.quickActionTitle} numberOfLines={1}>Educación</Text>
              <Text style={styles.quickActionSubtitle} numberOfLines={1}>Aprende más</Text>
            </AppCard>
          </AutoGrid>
      </ScreenLayout>

      <EmergencyAlert
        visible={emergencyVisible}
        onClose={() => setEmergencyVisible(false)}
        onSend={sendEmergency}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  onboardingCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
    backgroundColor: gestanteColors.primaryLight,
  },
  onboardingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  onboardingIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: commonColors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  onboardingTitle: { ...typography.h4, color: commonColors.text },
  onboardingText: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  progressCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  progressTitle: {
    ...typography.h3,
    color: commonColors.text,
  },
  progressSubtitle: {
    ...typography.bodySm,
    color: commonColors.textSecondary,
    marginTop: 4,
  },
  sectionCard: { marginBottom: spacing.lg, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surfaceAlt },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...typography.h3, color: commonColors.text },
  cardSubtitle: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  cardDetails: { backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.sm },
  detailLabel: { ...typography.bodySm, color: commonColors.textSecondary },
  detailValue: { ...typography.label, color: commonColors.text },
  emptyText: { ...typography.bodySm, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm },
  treatmentProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  treatmentInfo: { flex: 1 },
  treatmentInfoValue: { ...typography.h4, color: commonColors.text },
  treatmentInfoLabel: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  quickActionCard: { flex: 1, alignItems: 'center', padding: spacing.md, gap: spacing.sm + 4 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surfaceAlt },
  quickActionTitle: { ...typography.label, color: commonColors.text, textAlign: 'center' },
  quickActionSubtitle: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0.1, color: commonColors.textSecondary, textAlign: 'center' },

});
