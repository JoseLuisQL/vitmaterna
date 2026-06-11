import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Pill,
  AlertTriangle,
  Phone,
  ChevronRight,
  Heart,
  Activity,
} from 'lucide-react-native';
import { AppCard } from '../../../src/components/ui/AppCard';
import { AppBadge } from '../../../src/components/ui/AppBadge';
import { AppButton } from '../../../src/components/ui/AppButton';
import { StatusChip } from '../../../src/components/ui/StatusChip';
import { LoadingScreen } from '../../../src/components/ui/LoadingScreen';
import { useAuthStore } from '../../../src/store/authStore';
import { useGestanteDashboard } from '../../../src/services/api-queries';
import { useRefetchOnFocus } from '../../../src/hooks/useRefetchOnFocus';
import { useMutation } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius } from '../../../src/theme/spacing';

const BRAND = gestanteColors.primary;

export default function GestanteDashboard(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const displayName = user?.firstName || 'Gestante';

  const { data, isLoading, refetch } = useGestanteDashboard();
  useRefetchOnFocus([refetch]);

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedSign, setSelectedSign] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const reportMutation = useMutation({
    mutationFn: () => {
      return api.post('/clinical/danger-signs', {
        tipo_signo: selectedSign,
        descripcion: notes || undefined,
        severidad: 'grave',
      });
    },
    onSuccess: () => {
      setIsModalVisible(false);
      setSelectedSign('');
      setNotes('');
      Alert.alert('Alerta enviada', 'Tu obstetra ha sido notificada de tu signo de alarma.');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo enviar el signo de alarma. Inténtalo de nuevo.');
    },
  });

  const emergencyMutation = useMutation({
    mutationFn: (coords: { latitude: number; longitude: number }) => {
      return api.post('/chat/emergencia', coords);
    },
    onSuccess: () => {
      Alert.alert('Alerta Enviada', 'Se ha enviado una alerta de emergencia a tu obstetra con tu ubicación GPS.');
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo enviar la alerta de emergencia.');
    }
  });

  const handleEmergencyPress = () => {
    Alert.alert(
      '¿Enviar Alerta de Emergencia?',
      'Se enviará tu ubicación GPS y una notificación de auxilio inmediata a tu obstetra y centro de salud.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar Alerta',
          style: 'destructive',
          onPress: () => {
            if (typeof navigator !== 'undefined' && navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  emergencyMutation.mutate({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                  });
                },
                (error) => {
                  console.warn('Geolocation error, falling back to Talavera:', error);
                  emergencyMutation.mutate({
                    latitude: -13.654881,
                    longitude: -73.425950
                  });
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
              );
            } else {
              emergencyMutation.mutate({
                latitude: -13.654881,
                longitude: -73.425950
              });
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando tu información..." />;
  }

  const nextAppointment = data?.nextAppointment;
  const todayTreatments = data?.todayTreatments || [];
  const takenCount = todayTreatments.filter((t: any) => t.taken).length;
  const totalTreatments = todayTreatments.length;
  const treatmentPercentage = totalTreatments > 0 ? Math.round((takenCount / totalTreatments) * 100) : 0;

  const profile = data?.profile;
  const fum = profile?.fum ? new Date(profile.fum) : null;

  let weeks = 0;
  if (fum) {
    const diffTime = Math.abs(new Date().getTime() - fum.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    weeks = Math.floor(diffDays / 7);
    if (weeks < 0) weeks = 0;
    if (weeks > 42) weeks = 42;
  }

  const gestationalWeekText = weeks > 0 ? `Semana ${weeks}` : 'Semana --';
  const progressText = weeks > 0 ? `Sem. ${weeks} de 40` : 'Sem. -- de 40';
  const progressPercent = weeks > 0 ? Math.min(100, Math.round((weeks / 40) * 100)) : 0;
  const trimesterText = weeks > 0 ? getTrimesterText(weeks) : 'Gestación';

  function getTrimesterText(w: number) {
    if (w <= 13) return 'Primer Trimestre';
    if (w <= 26) return 'Segundo Trimestre';
    return 'Tercer Trimestre';
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

  const DANGER_SIGNS = [
    'Sangrado vaginal',
    'Fiebre',
    'Bebé no se mueve',
    'Dolor de cabeza intenso',
    'Hinchazón repentina',
    'Otro',
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        
        {/* Luxury Header */}
        <View style={styles.headerWrapper}>
          <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
          <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.greeting}>Hola,</Text>
                <Text style={styles.name}>{displayName}</Text>
              </View>
              <View style={styles.weekBadge}>
                <Heart size={16} color={BRAND} />
                <Text style={styles.weekText}>{gestationalWeekText}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

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
          <AppCard style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconCircle, { backgroundColor: gestanteColors.primaryLight }]}>
                <Calendar size={22} color={BRAND} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Próxima Cita</Text>
                <Text style={styles.cardSubtitle}>Control Prenatal</Text>
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
                    <StatusChip status={nextAppointment.status || 'confirmed'} />
                  </View>
                </>
              ) : (
                <Text style={styles.emptyText}>No tienes citas programadas próximamente.</Text>
              )}
            </View>
          </AppCard>

          {/* Today's Treatment */}
          <AppCard style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconCircle, { backgroundColor: semanticColors.infoLight }]}>
                <Pill size={22} color={semanticColors.info} />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Tratamiento del Día</Text>
                <Text style={styles.cardSubtitle}>{takenCount} de {totalTreatments} medicamentos tomados</Text>
              </View>
              <ChevronRight size={20} color={commonColors.textTertiary} />
            </View>
            <View style={styles.treatmentProgress}>
              <View style={styles.treatmentTrack}>
                <View style={[styles.treatmentFill, { width: `${treatmentPercentage}%` }]} />
              </View>
              <Text style={styles.treatmentPercentage}>{treatmentPercentage}%</Text>
            </View>
          </AppCard>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.quickActions}>
            <AppCard style={styles.quickActionCard} onPress={() => setIsModalVisible(true)}>
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

            <AppCard style={styles.quickActionCard} onPress={() => router.push('/(gestante)/alarmas')}>
              <View style={[styles.quickActionIcon, { backgroundColor: gestanteColors.primaryLight }]}>
                <Activity size={24} color={BRAND} />
              </View>
              <Text style={styles.quickActionTitle}>Mis Signos</Text>
              <Text style={styles.quickActionSubtitle}>Reportar varios</Text>
            </AppCard>
          </View>
          
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Danger Sign Modal */}
      <Modal visible={isModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reportar Alarma</Text>
              <AlertTriangle size={24} color={semanticColors.danger} />
            </View>
            <Text style={styles.modalDescription}>Selecciona el síntoma que estás experimentando. Si es muy grave, acude a emergencia inmediatamente.</Text>

            <ScrollView style={styles.signsList} showsVerticalScrollIndicator={false}>
              {DANGER_SIGNS.map((sign) => (
                <TouchableOpacity
                  key={sign}
                  style={[styles.signOption, selectedSign === sign && styles.signOptionSelected]}
                  onPress={() => setSelectedSign(sign)}
                >
                  <Text style={[styles.signOptionText, selectedSign === sign && styles.signOptionTextSelected]}>{sign}</Text>
                </TouchableOpacity>
              ))}

              {selectedSign === 'Otro' && (
                <TextInput
                  style={styles.notesInput}
                  placeholder="Describe el síntoma..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  numberOfLines={3}
                />
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <AppButton title="Cancelar" variant="outline" onPress={() => setIsModalVisible(false)} style={{ flex: 1, marginRight: spacing.sm + 4 }} disabled={reportMutation.isPending} />
              <AppButton title={reportMutation.isPending ? "Enviando..." : "Enviar"} onPress={() => reportMutation.mutate()} style={{ flex: 1, backgroundColor: semanticColors.danger }} disabled={!selectedSign || reportMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerWrapper: {
    paddingBottom: spacing.lg,
    marginBottom: spacing.sm,
  },
  safeAreaHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...typography.h3,
    color: commonColors.textSecondary,
    marginBottom: 4,
  },
  name: {
    ...typography.display,
    color: commonColors.text,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: commonColors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  weekText: {
    ...typography.label,
    color: BRAND,
  },
  contentWrapper: {
    paddingHorizontal: spacing.lg,
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
  cardDetails: { backgroundColor: commonColors.background, borderRadius: borderRadius.lg, padding: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, backgroundColor: commonColors.border, marginVertical: spacing.sm },
  detailLabel: { ...typography.bodySmall, color: commonColors.textSecondary },
  detailValue: { ...typography.label, color: commonColors.text },
  emptyText: { ...typography.bodySmall, color: commonColors.textTertiary, textAlign: 'center', paddingVertical: spacing.sm },
  treatmentProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  treatmentTrack: { flex: 1, height: 12, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.full, overflow: 'hidden' },
  treatmentFill: { height: '100%', backgroundColor: semanticColors.info, borderRadius: borderRadius.full },
  treatmentPercentage: { ...typography.label, color: semanticColors.info, minWidth: 40, textAlign: 'right' },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginBottom: spacing.md, marginTop: spacing.sm },
  quickActions: { flexDirection: 'row', gap: spacing.sm + 4 },
  quickActionCard: { flex: 1, alignItems: 'center', padding: spacing.md, gap: spacing.sm + 4 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { ...typography.label, color: commonColors.text, textAlign: 'center' },
  quickActionSubtitle: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0.1, color: commonColors.textSecondary, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: commonColors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: commonColors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { ...typography.h2, color: commonColors.text },
  modalDescription: { ...typography.bodyMedium, color: commonColors.textSecondary, marginBottom: spacing.lg },
  signsList: { marginBottom: spacing.lg },
  signOption: { padding: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: commonColors.border, marginBottom: spacing.sm + 4 },
  signOptionSelected: { borderColor: semanticColors.danger, backgroundColor: semanticColors.dangerLight, borderWidth: 2 },
  signOptionText: { ...typography.bodyMedium, color: commonColors.textSecondary },
  signOptionTextSelected: { fontFamily: typography.bodyMedium.fontFamily, fontWeight: '700', color: semanticColors.danger },
  notesInput: { borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, padding: spacing.md, ...typography.bodyMedium, color: commonColors.text, minHeight: 100, textAlignVertical: 'top', marginTop: spacing.sm + 4, backgroundColor: commonColors.background },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: spacing.lg },
});
