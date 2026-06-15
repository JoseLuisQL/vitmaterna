/**
 * VITMATERNA — EmergencyAlert
 *
 * Flujo de emergencia con diseño especializado y profesional (no un simple
 * toast). Pasos:
 *   1) Confirmación: cabecera roja de urgencia, mensaje claro y entendible,
 *      estado de ubicación GPS (obteniendo / obtenida / no disponible).
 *   2) Envío: indicador de progreso.
 *   3) Resultado: confirmación con check + acceso directo a llamar al centro
 *      de salud.
 *
 * No depende de librerías nuevas: se apoya en Modal + animación propia, para
 * mantener consistencia con AppModal y funcionar igual en web y nativo.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Siren, MapPin, Phone, CheckCircle2, X, ShieldAlert } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

export interface EmergencyCoords {
  latitude: number;
  longitude: number;
  /** true si las coordenadas son un respaldo (no GPS real). */
  fallback?: boolean;
}

type Phase = 'confirm' | 'locating' | 'sending' | 'success' | 'error';

interface EmergencyAlertProps {
  visible: boolean;
  onClose: () => void;
  /** Envía la alerta con las coordenadas. Debe lanzar si falla. */
  onSend: (coords: EmergencyCoords) => Promise<void>;
  /** Teléfono del centro de salud (para el botón de llamada). */
  emergencyPhone?: string;
  /** Coordenadas de respaldo si el GPS no está disponible. */
  fallbackCoords?: EmergencyCoords;
}

const EMERGENCY_RED = semanticColors.danger;

export function EmergencyAlert({
  visible,
  onClose,
  onSend,
  emergencyPhone = '083421800',
  fallbackCoords = { latitude: -13.654881, longitude: -73.42595, fallback: true },
}: EmergencyAlertProps): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('confirm');
  const [coords, setCoords] = useState<EmergencyCoords | null>(null);
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Reset al abrir.
  useEffect(() => {
    if (visible) {
      setPhase('confirm');
      setCoords(null);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 80 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else {
      scale.setValue(0.94);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  /** Obtiene la ubicación (web/nativo via navigator) con respaldo. */
  const getCoords = useCallback((): Promise<EmergencyCoords> => {
    return new Promise((resolve) => {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
          () => resolve(fallbackCoords),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
        );
      } else {
        resolve(fallbackCoords);
      }
    });
  }, [fallbackCoords]);

  const handleSend = useCallback(async () => {
    setPhase('locating');
    const c = await getCoords();
    setCoords(c);
    setPhase('sending');
    try {
      await onSend(c);
      setPhase('success');
    } catch {
      setPhase('error');
    }
  }, [getCoords, onSend]);

  const callEmergency = useCallback(() => {
    Linking.openURL(`tel:${emergencyPhone}`);
  }, [emergencyPhone]);

  const dismissable = phase === 'confirm' || phase === 'success' || phase === 'error';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : undefined}>
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityLabel="Cerrar" />
        <Animated.View style={[styles.card, shadows.modal, { transform: [{ scale }] }]}>
          {/* Cabecera de urgencia */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Siren size={26} color={commonColors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Alerta de emergencia</Text>
              <Text style={styles.headerSubtitle}>Auxilio inmediato a tu obstetra</Text>
            </View>
            {dismissable && (
              <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
                <X size={20} color={commonColors.white} />
              </Pressable>
            )}
          </View>

          <View style={styles.body}>
            {phase === 'confirm' && (
              <>
                <Text style={styles.bodyText}>
                  Se enviará una alerta de auxilio a tu obstetra y al centro de salud, junto con tu ubicación actual.
                </Text>
                <View style={styles.gpsRow}>
                  <MapPin size={18} color={EMERGENCY_RED} />
                  <Text style={styles.gpsText}>Se compartirá tu ubicación GPS</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Cancelar"
                  >
                    <Text style={styles.btnGhostText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
                    onPress={handleSend}
                    accessibilityRole="button"
                    accessibilityLabel="Enviar alerta ahora"
                  >
                    <Siren size={18} color={commonColors.white} />
                    <Text style={styles.btnDangerText}>Enviar ahora</Text>
                  </Pressable>
                </View>
              </>
            )}

            {(phase === 'locating' || phase === 'sending') && (
              <View style={styles.progressWrap}>
                <ActivityIndicator size="large" color={EMERGENCY_RED} />
                <Text style={styles.progressText}>
                  {phase === 'locating' ? 'Obteniendo tu ubicación…' : 'Enviando alerta a tu obstetra…'}
                </Text>
              </View>
            )}

            {phase === 'success' && (
              <>
                <View style={styles.successIconWrap}>
                  <CheckCircle2 size={48} color={semanticColors.success} />
                </View>
                <Text style={styles.successTitle}>Alerta enviada</Text>
                <Text style={styles.bodyText}>
                  Tu obstetra fue notificada con tu ubicación
                  {coords?.fallback ? ' aproximada' : ''}. Se pondrá en contacto contigo de inmediato.
                </Text>
                <Pressable style={styles.callCard} onPress={callEmergency} accessibilityRole="button" accessibilityLabel="Llamar al centro de salud">
                  <View style={styles.callIcon}><Phone size={22} color={commonColors.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callLabel}>Si es urgente, llama ahora</Text>
                    <Text style={styles.callPhone}>{formatPhone(emergencyPhone)}</Text>
                  </View>
                </Pressable>
                <Pressable style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]} onPress={onClose}>
                  <Text style={styles.btnGhostText}>Cerrar</Text>
                </Pressable>
              </>
            )}

            {phase === 'error' && (
              <>
                <View style={styles.errorIconWrap}>
                  <ShieldAlert size={44} color={EMERGENCY_RED} />
                </View>
                <Text style={styles.errorTitle}>No se pudo enviar</Text>
                <Text style={styles.bodyText}>
                  Hubo un problema al enviar la alerta. Revisa tu conexión. Si es urgente, llama directamente.
                </Text>
                <Pressable style={styles.callCard} onPress={callEmergency} accessibilityRole="button" accessibilityLabel="Llamar al centro de salud">
                  <View style={styles.callIcon}><Phone size={22} color={commonColors.white} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.callLabel}>Llamar al centro de salud</Text>
                    <Text style={styles.callPhone}>{formatPhone(emergencyPhone)}</Text>
                  </View>
                </Pressable>
                <View style={styles.actions}>
                  <Pressable style={({ pressed }) => [styles.btn, styles.btnGhost, pressed && styles.pressed]} onPress={onClose}>
                    <Text style={styles.btnGhostText}>Cerrar</Text>
                  </Pressable>
                  <Pressable style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]} onPress={handleSend}>
                    <Text style={styles.btnDangerText}>Reintentar</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

/** Formatea el teléfono "083421800" → "083 - 421800". */
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) return `${digits.slice(0, 3)} - ${digits.slice(3)}`;
  return phone;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: commonColors.overlay, justifyContent: 'center', padding: spacing.lg },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xxl, overflow: 'hidden', maxWidth: 460, width: '100%', alignSelf: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm2, backgroundColor: EMERGENCY_RED, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.h3, color: commonColors.white },
  headerSubtitle: { ...typography.caption, color: 'rgba(255,255,255,0.9)', marginTop: 1 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },

  body: { padding: spacing.lg, gap: spacing.md },
  bodyText: { ...typography.body, color: commonColors.text, textAlign: 'center', lineHeight: 22 },

  gpsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: semanticColors.dangerLight, borderRadius: borderRadius.lg, paddingVertical: spacing.sm2, paddingHorizontal: spacing.md },
  gpsText: { ...typography.bodySmall, color: EMERGENCY_RED, fontWeight: '600' },

  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 52, borderRadius: borderRadius.full },
  pressed: { opacity: 0.85 },
  btnDanger: { backgroundColor: EMERGENCY_RED },
  btnDangerText: { ...typography.button, color: commonColors.white },
  btnGhost: { backgroundColor: commonColors.surfaceAlt },
  btnGhostText: { ...typography.button, color: commonColors.textSecondary },

  progressWrap: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  progressText: { ...typography.bodyMedium, color: commonColors.textSecondary },

  successIconWrap: { width: 88, height: 88, borderRadius: 44, backgroundColor: semanticColors.successLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  successTitle: { ...typography.h2, color: commonColors.text, textAlign: 'center' },

  errorIconWrap: { width: 80, height: 80, borderRadius: 40, backgroundColor: semanticColors.dangerLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  errorTitle: { ...typography.h2, color: commonColors.text, textAlign: 'center' },

  callCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: commonColors.text, borderRadius: borderRadius.xl, padding: spacing.md },
  callIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  callLabel: { ...typography.caption, color: commonColors.textTertiary },
  callPhone: { ...typography.h3, color: commonColors.white, marginTop: 2 },
});

export default EmergencyAlert;
