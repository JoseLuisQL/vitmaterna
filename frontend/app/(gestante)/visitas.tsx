/**
 * VITMATERNA — Gestante: ubicación de domicilio + historial de visitas domiciliarias.
 */
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin, CheckCircle2, Home } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../src/utils/navigation';
import { useMyProfile, useHomeVisits, useUpdateUbicacion } from '../../src/services/api-queries';
import { useToast } from '../../src/components/ui';
import { CardSkeleton } from '../../src/components/ui/SkeletonLoader';
import { gestanteColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../src/theme/spacing';
import { WebMaxWidth } from '../../src/components/web';
import { ScreenLayout } from '../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../src/theme/responsive';
import { shadows } from '../../src/theme/shadows';

const BRAND = gestanteColors.primary;

function fmtFecha(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;
}
function fmtHora(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export default function VisitasGestante(): React.ReactElement {
  const router = useRouter();
  const { webShell } = useResponsive();
  const toast = useToast();
  const { data: profileData, isLoading: loadingProfile } = useMyProfile();
  const gestanteId = profileData?.profile?.id;
  const { data: visits = [], isLoading: loadingVisits } = useHomeVisits(gestanteId || '');
  const updateUbicacion = useUpdateUbicacion();

  const [referencia, setReferencia] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    const p = profileData?.profile;
    if (p?.domicilioLat != null && p?.domicilioLng != null) {
      setCoords({ lat: Number(p.domicilioLat), lng: Number(p.domicilioLng) });
    }
    if (p?.referenciaDom) setReferencia(p.referenciaDom);
  }, [profileData]);

  const capturar = () => {
    setCapturing(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setCapturing(false); toast.success('Ubicación capturada', 'No olvides guardar.'); },
        () => { setCapturing(false); toast.error('No se pudo obtener tu ubicación', 'Activa el GPS e inténtalo de nuevo.'); },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    } else {
      setCapturing(false);
      toast.error('GPS no disponible', 'Tu dispositivo no permite obtener la ubicación.');
    }
  };

  const guardar = () => {
    if (!gestanteId || !coords) {
      toast.warning('Falta la ubicación', 'Primero captura tu ubicación actual.');
      return;
    }
    updateUbicacion.mutate(
      { id: gestanteId, domicilioLat: coords.lat, domicilioLng: coords.lng, referenciaDom: referencia.trim() || undefined },
      {
        onSuccess: () => toast.success('Ubicación guardada', 'Tu obstetra podrá ubicarte para las visitas.'),
        onError: () => toast.error('Error', 'No se pudo guardar la ubicación.'),
      },
    );
  };

  const mainContent = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, webShell && styles.webContent]} showsVerticalScrollIndicator={false}>
      <WebMaxWidth width="readable">
      {/* Ubicación */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Mi ubicación</Text>
        <Text style={styles.cardSub}>Comparte la ubicación de tu domicilio para que tu obstetra pueda visitarte fácilmente.</Text>

        <TouchableOpacity style={styles.locBtn} onPress={capturar} disabled={capturing}>
          {capturing ? <ActivityIndicator size="small" color={BRAND} /> : <MapPin size={18} color={BRAND} />}
          <Text style={styles.locBtnText}>{coords ? 'Actualizar mi ubicación actual' : 'Usar mi ubicación actual'}</Text>
        </TouchableOpacity>

        {coords && (
          <View style={styles.coordsBox}>
            <CheckCircle2 size={16} color={semanticColors.success} />
            <Text style={styles.coordsText}>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</Text>
          </View>
        )}

        <Text style={styles.inputLabel}>Referencia (opcional)</Text>
        <TextInput
          style={styles.input}
          value={referencia}
          onChangeText={setReferencia}
          placeholder="Ej. Casa azul frente a la loza deportiva"
          placeholderTextColor={commonColors.textTertiary}
        />

        <TouchableOpacity style={[styles.saveBtn, (!coords || updateUbicacion.isPending) && styles.saveBtnDisabled]} onPress={guardar} disabled={!coords || updateUbicacion.isPending}>
          <Text style={styles.saveBtnText}>{updateUbicacion.isPending ? 'Guardando…' : 'Guardar ubicación'}</Text>
        </TouchableOpacity>
      </View>

      {/* Historial */}
      <Text style={styles.sectionTitle}>Historial de visitas</Text>
      {loadingVisits ? (
        <ActivityIndicator color={BRAND} style={{ marginTop: spacing.lg }} />
      ) : visits.length === 0 ? (
        <View style={styles.emptyBox}>
          <Home size={40} color={commonColors.textTertiary} />
          <Text style={styles.emptyText}>Aún no has recibido visitas domiciliarias.</Text>
        </View>
      ) : (
        visits.map((v) => (
          <View key={v.id} style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <View style={styles.numBadge}><Text style={styles.numText}>N°{v.numeroVisita}</Text></View>
              <Text style={styles.visitDate}>{fmtFecha(v.fecha)} · {fmtHora(v.horaLlegada)}</Text>
            </View>
            <Text style={styles.visitMotivo}>{v.motivo}</Text>
            <Text style={styles.visitText}>{v.acciones}</Text>
            {v.acuerdos ? <Text style={styles.visitAcuerdo}>Acuerdos: {v.acuerdos}</Text> : null}
            {v.obstetra?.user ? (
              <Text style={styles.personal}>Obst. {v.obstetra.user.firstName} {v.obstetra.user.lastName}{v.obstetra.cop ? ` — COP N° ${v.obstetra.cop}` : ''}</Text>
            ) : null}
          </View>
        ))
      )}
      </WebMaxWidth>
    </ScrollView>
  );

  if (webShell) {
    return (
      <View style={{ flex: 1, backgroundColor: commonColors.background }}>
        <ScreenLayout
          role="gestante"
          title="Visitas domiciliarias"
          subtitle="Historial y ubicación"
          accentColor={BRAND}
          width="readable"
          scroll={false}
        >
          {loadingProfile ? (
            <View style={styles.content}>
              <CardSkeleton />
              <CardSkeleton style={{ marginTop: spacing.lg }} />
            </View>
          ) : (
            mainContent
          )}
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gestanteColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerRow}>
          <TouchableOpacity onPress={() => goBack(router, '/(gestante)/(tabs)' as any)} hitSlop={10} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Volver">
            <ChevronLeft size={24} color={commonColors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Visitas domiciliarias</Text>
        </SafeAreaView>
      </LinearGradient>

      {loadingProfile ? (
        <View style={styles.content}>
          <CardSkeleton />
          <CardSkeleton style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
        mainContent
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: commonColors.onColorSurface },
  headerTitle: { ...typography.h2, color: commonColors.white },
  content: { padding: spacing.lg, paddingBottom: layout.tabBarSpace },
  webContent: { paddingBottom: spacing.xl },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, ...shadows.card },
  cardTitle: { ...typography.h3, color: commonColors.text },
  cardSub: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 4, marginBottom: spacing.md },
  locBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: borderRadius.md, backgroundColor: gestanteColors.primaryLight, borderWidth: 1, borderColor: BRAND },
  locBtnText: { ...typography.label, color: BRAND, fontWeight: '700' },
  coordsBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  coordsText: { ...typography.bodySm, color: commonColors.textSecondary },
  inputLabel: { ...typography.label, color: commonColors.textSecondary, marginTop: spacing.md, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, padding: spacing.sm + 2, ...typography.body, color: commonColors.text, backgroundColor: commonColors.surfaceAlt },
  saveBtn: { marginTop: spacing.md, backgroundColor: BRAND, borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: commonColors.disabled },
  saveBtnText: { ...typography.button, color: commonColors.white },
  sectionTitle: { ...typography.h3, color: commonColors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  emptyBox: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center' },
  visitCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.md, marginBottom: spacing.sm + 2, ...shadows.card, gap: 4 },
  visitHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numBadge: { backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.sm, paddingHorizontal: 8, paddingVertical: 2 },
  numText: { ...typography.overline, color: BRAND, fontWeight: '800', letterSpacing: 0 },
  visitDate: { ...typography.label, color: commonColors.text },
  visitMotivo: { ...typography.bodyMd, fontWeight: '700', color: commonColors.text },
  visitText: { ...typography.bodySm, color: commonColors.textSecondary },
  visitAcuerdo: { ...typography.caption, color: commonColors.textSecondary, fontStyle: 'italic' },
  personal: { ...typography.caption, color: commonColors.text, marginTop: 4, fontWeight: '600' },
});
