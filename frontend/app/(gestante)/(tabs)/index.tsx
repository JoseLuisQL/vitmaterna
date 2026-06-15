import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Pill,
  AlertTriangle,
  Phone,
  ChevronRight,
  Heart,
  BookOpen,
  MessageCircle,
} from 'lucide-react-native';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { AppButton } from '../../../src/components/ui/AppButton';
import { StatusChip } from '../../../src/components/ui/StatusChip';
import { ProgressRing } from '../../../src/components/ui/ProgressRing';
import { DashboardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast, AutoGrid } from '../../../src/components/ui';
import { NotificationBell } from '../../../src/components/shared/NotificationBell';
import { useAuthStore } from '../../../src/store/authStore';
import { useGestanteDashboard, useConfirmAppointment } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useMutation } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';
import { shadows } from '../../../src/theme/shadows';
import { confirmAction } from '../../../src/utils/confirm';

const BRAND = gestanteColors.primary;

export default function GestanteDashboard(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const displayName = user?.firstName || 'Gestante';

  const { data, isLoading, refetch } = useGestanteDashboard();
  const toast = useToast();
  useRefetchOnFocus([refetch]);
  const confirmMutation = useConfirmAppointment();

  const emergencyMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) => {
      return api.post('/chat/emergencia', coords);
    },
    onSuccess: () => {
      toast.warning('Emergencia enviada', 'Tu obstetra recibió la alerta con tu ubicación GPS.');
    },
    onError: () => {
      toast.error('No se pudo enviar', 'No se pudo enviar la alerta de emergencia.');
    }
  });

  const handleEmergencyPress = async () => {
    const ok = await confirmAction({
      title: '¿Enviar Alerta de Emergencia?',
      message: 'Se enviará tu ubicación GPS y una notificación de auxilio inmediata a tu obstetra y centro de salud.',
      confirmText: 'Enviar Alerta',
      destructive: true,
    });
    if (!ok) return;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          emergencyMutation.mutate({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Geolocation error, falling back to Talavera:', error);
          emergencyMutation.mutate({ latitude: -13.654881, longitude: -73.42595 });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );
    } else {
      emergencyMutation.mutate({ latitude: -13.654881, longitude: -73.42595 });
    }
  };

  const nextAppointment = data?.nextAppointment;
  const todayTreatments = data?.todayTreatments || [];
  const takenCount = todayTreatments.filter((t: any) => t.taken).length;
  const totalTreatments = todayTreatments.length;
  const treatmentPercentage = totalTreatments > 0 ? Math.round((takenCount / totalTreatments) * 100) : 0;

  const profile = data?.profile;

  // Cálculo memoizado de semanas de gestación (evita recálculo por render).
  const weeks = React.useMemo(() => {
    if (!profile?.fum) return 0;
    const fum = new Date(profile.fum);
    const diffDays = Math.ceil(Math.abs(Date.now() - fum.getTime()) / (1000 * 60 * 60 * 24));
    return Math.min(42, Math.max(0, Math.floor(diffDays / 7)));
  }, [profile?.fum]);

  const gestationalWeekText = weeks > 0 ? `Semana ${weeks}` : 'Semana --';
  const progressText = weeks > 0 ? `Sem. ${weeks} de 40` : 'Sem. -- de 40';
  const progressPercent = weeks > 0 ? Math.min(100, Math.round((weeks / 40) * 100)) : 0;

  function getTrimesterText(w: number) {
    if (w <= 13) return 'Primer Trimestre';
    if (w <= 26) return 'Segundo Trimestre';
    return 'Tercer Trimestre';
  }
  const trimesterText = weeks > 0 ? getTrimesterText(weeks) : 'Gestación';

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

  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <DashboardSkeleton count={3} />
        </SafeAreaView>
      </View>
    );
  }

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
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: layout.tabBarSpace }}
      >
        
        {/* Header con gradient lila */}
        <LinearGradient
          colors={gestanteColors.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerWrapper}
        >
          <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <View style={styles.headerRow}>
              <View style={styles.headerGreeting}>
                <Text style={styles.greeting}>Hola,</Text>
                <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
              </View>
              <View style={styles.headerActions}>
                <View style={styles.weekBadge}>
                  <Heart size={16} color={commonColors.white} />
                  <Text style={styles.weekText}>{gestationalWeekText}</Text>
                </View>
                <NotificationBell href="/(gestante)/notificaciones" color={commonColors.white} />
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.contentWrapper}>
          
          {/* Pregnancy Progress Card */}
          <AppCard style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Tu Embarazo</Text>
                <Text style={styles.progressSubtitle}>{trimesterText}</Text>
              </View>
              <AppBadge label={getRiskLabel(riskLevel)} variant={getRiskVariant(riskLevel) as any} />
            </View>
            <View style={styles.progressBarContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: BRAND }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressLabel}>Sem. 1</Text>
                <Text style={styles.progressLabelBold}>{progressText}</Text>
                <Text style={styles.progressLabel}>Sem. 40</Text>
              </View>
            </View>
          </AppCard>

          {/* Next Appointment */}
          <AppCard style={styles.sectionCard} onPress={() => router.push('/(gestante)/(tabs)/citas')}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconCircle, { backgroundColor: gestanteColors.primaryLight }]}>
                <Calendar size={22} color={BRAND} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Próxima Cita</Text>
                <Text style={styles.cardSubtitle}>{nextAppointment?.type || 'Control Prenatal'}</Text>
              </View>
              <ChevronRight size={20} color={commonColors.textTertiary} />
            </View>
            
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
              <View style={[styles.cardIconCircle, { backgroundColor: semanticColors.infoLight }]}>
                <Pill size={22} color={semanticColors.info} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Tratamiento del Día</Text>
                <Text style={styles.cardSubtitle}>
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
                  color={semanticColors.info}
                  label={`${takenCount}/${totalTreatments}`}
                />
                <View style={styles.treatmentInfo}>
                  <Text style={styles.treatmentInfoValue}>{treatmentPercentage}% completado</Text>
                  <Text style={styles.treatmentInfoLabel}>
                    {takenCount === totalTreatments
                      ? '¡Excelente! Tomaste todo hoy.'
                      : `Te faltan ${totalTreatments - takenCount} por tomar.`}
                  </Text>
                </View>
              </View>
            )}
          </AppCard>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <AutoGrid minColumnWidth={100} maxColumns={4}>
            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/alarmas')}>
              <View style={[styles.quickActionIcon, { backgroundColor: semanticColors.dangerLight }]}>
                <AlertTriangle size={24} color={semanticColors.danger} />
              </View>
              <Text style={styles.quickActionTitle}>Reportar</Text>
              <Text style={styles.quickActionSubtitle}>Signo de alarma</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={handleEmergencyPress}>
              <View style={[styles.quickActionIcon, { backgroundColor: semanticColors.successLight }]}>
                <Phone size={24} color={semanticColors.success} />
              </View>
              <Text style={styles.quickActionTitle}>Emergencia</Text>
              <Text style={styles.quickActionSubtitle}>Pedir Auxilio</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/(tabs)/chat')}>
              <View style={[styles.quickActionIcon, { backgroundColor: gestanteColors.primaryLight }]}>
                <MessageCircle size={24} color={BRAND} />
              </View>
              <Text style={styles.quickActionTitle}>Chat</Text>
              <Text style={styles.quickActionSubtitle}>Consulta</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/(tabs)/educacion')}>
              <View style={[styles.quickActionIcon, { backgroundColor: semanticColors.infoLight }]}>
                <BookOpen size={24} color={semanticColors.info} />
              </View>
              <Text style={styles.quickActionTitle}>Educación</Text>
              <Text style={styles.quickActionSubtitle}>Aprende más</Text>
            </AppCard>
          </AutoGrid>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: spacing.xl,
    marginBottom: -spacing.lg,
    borderBottomLeftRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  headerGreeting: { flexShrink: 1, minWidth: 0 },
  greeting: {
    ...typography.h3,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 2,
  },
  name: {
    ...typography.display,
    color: commonColors.white,
  },
  headerTrimester: {
    ...typography.bodySm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
  },
  weekText: {
    ...typography.label,
    color: commonColors.white,
  },
  contentWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
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
    ...typography.bodySmall,
    color: commonColors.textSecondary,
    marginTop: 4,
  },
  progressBarContainer: { gap: spacing.sm + 4 },
  progressTrack: {
    height: 12,
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { ...typography.overline, color: commonColors.textTertiary },
  progressLabelBold: { ...typography.overline, color: BRAND },
  sectionCard: { marginBottom: spacing.lg, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  cardTitle: { ...typography.h3, color: commonColors.text },
  cardSubtitle: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  cardDetails: { backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.sm },
  detailLabel: { ...typography.bodySmall, color: commonColors.textSecondary },
  detailValue: { ...typography.label, color: commonColors.text },
  emptyText: { ...typography.bodySmall, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm },
  treatmentProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  treatmentInfo: { flex: 1 },
  treatmentInfoValue: { ...typography.h4, color: commonColors.text },
  treatmentInfoLabel: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  quickActionCard: { flex: 1, alignItems: 'center', padding: spacing.md, gap: spacing.sm + 4 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { ...typography.label, color: commonColors.text, textAlign: 'center' },
  quickActionSubtitle: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0.1, color: commonColors.textSecondary, textAlign: 'center' },

});
