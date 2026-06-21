/**
 * VITMATERNA - Admin: Configuración de canales de notificación (SMS / WhatsApp)
 *
 * Permite al administrador activar los proveedores reales (Twilio para SMS y
 * WhatsApp Business Cloud API), guardar sus credenciales y probar la conexión
 * con un envío de prueba antes de usarlas en producción.
 *
 * UX: flujo guiado por canal (activar → credenciales → guardar → probar). El
 * envío de prueba solo se habilita cuando el canal está configurado. El número
 * de prueba se valida en formato E.164.
 */
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import { MessageSquare, Phone, CheckCircle2, AlertCircle, Send, Info } from 'lucide-react-native';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { AppButton } from '../../../src/components/ui/AppButton';
import { CardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import { useResponsive } from '../../../src/theme/responsive';
import {
  useChannelsConfig, useUpdateSmsConfig, useUpdateWhatsAppConfig, useTestChannel,
} from '../../../src/services/admin-queries';
import { commonColors, adminColors, semanticColors, accentColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';

const BRAND = adminColors.primary;

/** Valida E.164 (ej. +51987654321). Vacío = no validado todavía. */
function isE164(v: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(v.trim());
}

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: configured ? semanticColors.successLight : commonColors.surfaceAlt }]}>
      {configured ? <CheckCircle2 size={13} color={semanticColors.success} /> : <AlertCircle size={13} color={commonColors.textSecondary} />}
      <Text style={[styles.badgeText, { color: configured ? semanticColors.success : commonColors.textSecondary }]}>
        {configured ? 'Activo' : 'Modo prueba'}
      </Text>
    </View>
  );
}

export default function AdminNotificacionesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const { data: status, isLoading } = useChannelsConfig();
  const updateSms = useUpdateSmsConfig();
  const updateWa = useUpdateWhatsAppConfig();
  const testChannel = useTestChannel();

  // SMS (Twilio)
  const [smsOn, setSmsOn] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');

  // WhatsApp (Cloud API)
  const [waOn, setWaOn] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');

  // Prueba
  const [smsTest, setSmsTest] = useState('');
  const [waTest, setWaTest] = useState('');
  const [testing, setTesting] = useState<'sms' | 'whatsapp' | null>(null);

  useEffect(() => {
    if (status) {
      setSmsOn(status.sms.provider === 'twilio');
      setFromNumber(status.sms.fromNumber || '');
      setWaOn(status.whatsapp.provider === 'whatsapp_cloud');
      setPhoneNumberId(status.whatsapp.phoneNumberId || '');
    }
  }, [status]);

  const smsConfigured = !!status?.sms.configured;
  const waConfigured = !!status?.whatsapp.configured;

  const saveSms = () => {
    if (smsOn && fromNumber.trim() && !isE164(fromNumber)) {
      toast.error('Número inválido', 'El número remitente debe estar en formato E.164 (ej. +15550001111).');
      return;
    }
    updateSms.mutate(
      smsOn
        ? { provider: 'twilio', accountSid: accountSid || undefined, authToken: authToken || undefined, fromNumber: fromNumber || undefined }
        : { provider: 'mock' },
      {
        onSuccess: () => { toast.success('SMS guardado', smsOn ? 'Credenciales de Twilio actualizadas.' : 'SMS en modo prueba.'); setAccountSid(''); setAuthToken(''); },
        onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo guardar.'),
      },
    );
  };

  const saveWa = () => {
    updateWa.mutate(
      waOn
        ? { provider: 'whatsapp_cloud', apiToken: apiToken || undefined, phoneNumberId: phoneNumberId || undefined }
        : { provider: 'mock' },
      {
        onSuccess: () => { toast.success('WhatsApp guardado', waOn ? 'Credenciales de WhatsApp actualizadas.' : 'WhatsApp en modo prueba.'); setApiToken(''); },
        onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo guardar.'),
      },
    );
  };

  const runTest = (canal: 'sms' | 'whatsapp') => {
    const destino = (canal === 'sms' ? smsTest : waTest).trim();
    if (!destino) {
      toast.info('Falta el número', 'Ingresa un número de destino para la prueba.');
      return;
    }
    if (!isE164(destino)) {
      toast.error('Número inválido', 'Usa formato E.164, ej. +51987654321.');
      return;
    }
    setTesting(canal);
    testChannel.mutate(
      { canal, destino },
      {
        onSuccess: () => toast.success('Prueba enviada', 'El mensaje de prueba se envió correctamente.'),
        onError: (e: any) => toast.error('Falló la conexión', e?.response?.data?.error?.message || 'Revisa las credenciales.'),
        onSettled: () => setTesting(null),
      },
    );
  };

  return (
    <ScreenLayout
      role="admin"
      title="Canales de notificación"
      subtitle="SMS y WhatsApp para mensajes reales"
      showBack={router.canGoBack()}
      onBack={() => goBack(router, '/(admin)/(tabs)' as any)}
      width="full"
      scroll={false}
    >
      {isLoading ? (
        <View style={styles.content}>
          <CardSkeleton />
          <CardSkeleton style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Resumen de estado */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: semanticColors.infoLight }]}>
              <MessageSquare size={18} color={semanticColors.info} />
            </View>
            <Text style={styles.summaryLabel}>SMS</Text>
            <StatusBadge configured={smsConfigured} />
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: accentColors.whatsappLight }]}>
              <Phone size={18} color={accentColors.whatsapp} />
            </View>
            <Text style={styles.summaryLabel}>WhatsApp</Text>
            <StatusBadge configured={waConfigured} />
          </View>
        </View>

        <View style={webShell ? styles.twoCol : undefined}>
          {/* ─── SMS (Twilio) ─── */}
          <View style={[styles.card, webShell && { flex: 1 }]}>
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, { backgroundColor: semanticColors.infoLight }]}>
                <MessageSquare size={20} color={semanticColors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>SMS (Twilio)</Text>
                <Text style={styles.cardHint}>Recordatorios y alertas por mensaje de texto</Text>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activar Twilio</Text>
              <Switch value={smsOn} onValueChange={setSmsOn} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
            </View>

            {smsOn && (
              <>
                <View style={styles.helpBox}>
                  <Info size={14} color={commonColors.textSecondary} />
                  <Text style={styles.helpText}>Obtén estas credenciales en tu consola de Twilio (Account SID, Auth Token y un número remitente verificado).</Text>
                </View>
                <Text style={styles.label}>Account SID</Text>
                <TextInput style={styles.input} value={accountSid} onChangeText={setAccountSid} placeholder="AC… (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
                <Text style={styles.label}>Auth Token</Text>
                <TextInput style={styles.input} value={authToken} onChangeText={setAuthToken} placeholder="Token (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
                <Text style={styles.label}>Número remitente</Text>
                <TextInput style={[styles.input, fromNumber.trim() !== '' && !isE164(fromNumber) && styles.inputError]} value={fromNumber} onChangeText={setFromNumber} placeholder="+15550001111" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                {fromNumber.trim() !== '' && !isE164(fromNumber) && <Text style={styles.errorHint}>Formato E.164 requerido (ej. +15550001111).</Text>}
              </>
            )}

            <AppButton title="Guardar SMS" onPress={saveSms} loading={updateSms.isPending} themeColor={BRAND} style={{ marginTop: spacing.md }} />

            {/* Prueba: solo si el canal ya está configurado */}
            <View style={styles.testBlock}>
              <Text style={styles.testTitle}>Enviar prueba</Text>
              {!smsConfigured ? (
                <Text style={styles.testDisabledHint}>Guarda credenciales válidas para habilitar el envío de prueba.</Text>
              ) : (
                <View style={styles.testRow}>
                  <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={smsTest} onChangeText={setSmsTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                  <TouchableOpacity style={[styles.testBtn, testing === 'sms' && { opacity: 0.7 }]} onPress={() => runTest('sms')} disabled={testing === 'sms'} activeOpacity={0.8}>
                    {testing === 'sms' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                    <Text style={styles.testBtnText}>Probar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* ─── WhatsApp (Cloud API) ─── */}
          <View style={[styles.card, webShell && { flex: 1 }]}>
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, { backgroundColor: accentColors.whatsappLight }]}>
                <Phone size={20} color={accentColors.whatsapp} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>WhatsApp (Cloud API)</Text>
                <Text style={styles.cardHint}>Mensajes vía WhatsApp Business</Text>
              </View>
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Activar WhatsApp Business</Text>
              <Switch value={waOn} onValueChange={setWaOn} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
            </View>

            {waOn && (
              <>
                <View style={styles.helpBox}>
                  <Info size={14} color={commonColors.textSecondary} />
                  <Text style={styles.helpText}>Desde Meta for Developers: token permanente de la app y el Phone Number ID del número de WhatsApp Business.</Text>
                </View>
                <Text style={styles.label}>API Token</Text>
                <TextInput style={styles.input} value={apiToken} onChangeText={setApiToken} placeholder="Token (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
                <Text style={styles.label}>Phone Number ID</Text>
                <TextInput style={styles.input} value={phoneNumberId} onChangeText={setPhoneNumberId} placeholder="ID del número de WhatsApp" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
              </>
            )}

            <AppButton title="Guardar WhatsApp" onPress={saveWa} loading={updateWa.isPending} themeColor={BRAND} style={{ marginTop: spacing.md }} />

            <View style={styles.testBlock}>
              <Text style={styles.testTitle}>Enviar prueba</Text>
              {!waConfigured ? (
                <Text style={styles.testDisabledHint}>Guarda credenciales válidas para habilitar el envío de prueba.</Text>
              ) : (
                <View style={styles.testRow}>
                  <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={waTest} onChangeText={setWaTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                  <TouchableOpacity style={[styles.testBtn, testing === 'whatsapp' && { opacity: 0.7 }]} onPress={() => runTest('whatsapp')} disabled={testing === 'whatsapp'} activeOpacity={0.8}>
                    {testing === 'whatsapp' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                    <Text style={styles.testBtnText}>Probar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.note}>
          En modo prueba los mensajes solo se registran en el servidor. Al activar un proveedor y
          guardar credenciales válidas, las notificaciones se envían de forma real. Los números se
          normalizan automáticamente a formato internacional (E.164).
        </Text>
      </ScrollView>
      )}
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.lg, paddingBottom: layout.tabBarSpace },
  // Resumen
  summaryRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  summaryCard: { flex: 1, backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: commonColors.border, padding: spacing.md, alignItems: 'center', gap: spacing.xs2 + 2 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  summaryLabel: { ...typography.bodyMd, color: commonColors.text, fontWeight: '600' },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: commonColors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, color: commonColors.text },
  cardHint: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { ...typography.overline, letterSpacing: 0, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { ...typography.bodyMd, color: commonColors.text },
  helpBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.md, padding: spacing.sm2, marginTop: spacing.sm },
  helpText: { ...typography.caption, color: commonColors.textSecondary, flex: 1, lineHeight: 17 },
  label: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary, marginTop: spacing.md, marginBottom: 4 },
  input: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, ...typography.body, fontSize: 15, color: commonColors.text },
  inputError: { borderColor: semanticColors.danger },
  errorHint: { ...typography.caption, color: semanticColors.danger, marginTop: 4 },
  testBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  testTitle: { ...typography.caption, fontWeight: '700', color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  testDisabledHint: { ...typography.caption, color: commonColors.textTertiary, fontStyle: 'italic' },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  testBtnText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  note: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.md },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
});
