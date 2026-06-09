import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useMutation } from '@tanstack/react-query';
import api from '../../../src/services/api';
import { semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';

export default function GestanteDashboard(): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const displayName = user?.firstName || 'Gestante';

  const { data, isLoading } = useGestanteDashboard();

  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [selectedSign, setSelectedSign] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const reportMutation = useMutation({
    mutationFn: (data: any) => {
      return api.post('/clinical/danger-signs', {
        ...data,
        sign: selectedSign,
        notes,
      });
    },
    onSuccess: () => {
      setIsModalVisible(false);
      setSelectedSign('');
      setNotes('');
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
                <Heart size={16} color="#7C3AED" />
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
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: '#7C3AED' }]} />
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
              <View style={[styles.cardIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Calendar size={22} color="#7C3AED" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Próxima Cita</Text>
                <Text style={styles.cardSubtitle}>Control Prenatal</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
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
              <View style={[styles.cardIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Pill size={22} color="#2563EB" />
              </View>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>Tratamiento del Día</Text>
                <Text style={styles.cardSubtitle}>{takenCount} de {totalTreatments} medicamentos tomados</Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
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
              <View style={[styles.quickActionIcon, { backgroundColor: '#FEF2F2' }]}>
                <AlertTriangle size={24} color="#EF4444" />
              </View>
              <Text style={styles.quickActionTitle}>Reportar</Text>
              <Text style={styles.quickActionSubtitle}>Signo de alarma</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={handleEmergencyPress}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#DCFCE7' }]}>
                <Phone size={24} color="#10B981" />
              </View>
              <Text style={styles.quickActionTitle}>Emergencia</Text>
              <Text style={styles.quickActionSubtitle}>Pedir Auxilio</Text>
            </AppCard>

            <AppCard style={styles.quickActionCard} onPress={() => {}}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#F5F3FF' }]}>
                <Activity size={24} color="#7C3AED" />
              </View>
              <Text style={styles.quickActionTitle}>Mis Signos</Text>
              <Text style={styles.quickActionSubtitle}>Registrar hoy</Text>
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
              <AlertTriangle size={24} color="#EF4444" />
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
              <AppButton title="Cancelar" variant="outline" onPress={() => setIsModalVisible(false)} style={{ flex: 1, marginRight: 12 }} disabled={reportMutation.isPending} />
              <AppButton title={reportMutation.isPending ? "Enviando..." : "Enviar"} onPress={() => reportMutation.mutate({})} style={{ flex: 1, backgroundColor: '#EF4444' }} disabled={!selectedSign || reportMutation.isPending} />
            </View>
          </View>
        </View>
      </Modal>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-light', default: 'System' }),
    fontSize: 18,
    color: '#64748B',
    marginBottom: 4,
  },
  name: {
    fontFamily: Platform.select({ ios: 'Avenir Next', android: 'sans-serif', default: 'System' }),
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  weekBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  weekText: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: 14,
    fontWeight: '700',
    color: '#7C3AED',
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  progressCard: {
    marginBottom: 20,
    padding: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  progressTitle: {
    fontFamily: typography.h2.fontFamily,
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  progressSubtitle: {
    fontFamily: typography.bodySmall.fontFamily,
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
  },
  progressBarContainer: { gap: 12 },
  progressTrack: {
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 99 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  progressLabel: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: '#94A3B8' },
  progressLabelBold: { fontFamily: typography.caption.fontFamily, fontSize: 12, fontWeight: '700', color: '#7C3AED' },
  sectionCard: { marginBottom: 20, padding: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  cardIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cardSubtitle: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#64748B', marginTop: 2 },
  cardDetails: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 8 },
  detailLabel: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#64748B' },
  detailValue: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  emptyText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
  treatmentProgress: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  treatmentTrack: { flex: 1, height: 12, backgroundColor: '#F1F5F9', borderRadius: 99, overflow: 'hidden' },
  treatmentFill: { height: '100%', backgroundColor: '#2563EB', borderRadius: 99 },
  treatmentPercentage: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '700', color: '#2563EB', minWidth: 40, textAlign: 'right' },
  sectionTitle: { fontFamily: typography.h3.fontFamily, fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 16, marginTop: 8 },
  quickActions: { flexDirection: 'row', gap: 12 },
  quickActionCard: { flex: 1, alignItems: 'center', padding: 16, gap: 12 },
  quickActionIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  quickActionTitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  quickActionSubtitle: { fontFamily: typography.caption.fontFamily, fontSize: 11, color: '#64748B', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: typography.h2.fontFamily, fontSize: 22, fontWeight: '800', color: '#0F172A' },
  modalDescription: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B', marginBottom: 24, lineHeight: 22 },
  signsList: { marginBottom: 24 },
  signOption: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  signOptionSelected: { borderColor: '#EF4444', backgroundColor: '#FEF2F2', borderWidth: 2 },
  signOptionText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#334155' },
  signOptionTextSelected: { fontWeight: '700', color: '#EF4444' },
  notesInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, padding: 16, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', minHeight: 100, textAlignVertical: 'top', marginTop: 12, backgroundColor: '#F8FAFC' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 20 },
});
