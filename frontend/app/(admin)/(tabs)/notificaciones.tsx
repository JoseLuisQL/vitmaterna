/**
 * VITMATERNA - Admin: Configuración de canales de notificación (SMS / WhatsApp)
 *
 * Permite al administrador activar los proveedores reales (Twilio para SMS y
 * WhatsApp Business Cloud API), guardar sus credenciales y probar la conexión
 * con un envío de prueba antes de usarlas en producción.
 */
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TextInput, TouchableOpacity, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowLeft, MessageSquare, Phone, CheckCircle2, AlertCircle, Send } from 'lucide-react-native';
import { AppButton } from '../../../src/components/ui/AppButton';
import { CardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import {
  useChannelsConfig, useUpdateSmsConfig, useUpdateWhatsAppConfig, useTestChannel,
} from '../../../src/services/admin-queries';
import { commonColors, adminColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { spacing, borderRadius, layout } from '../../../src/theme/spacing';

const BRAND = adminColors.primary;

function StatusBadge({ configured }: { configured: boolean }) {
  return (
    <View style={[styles.badge, { backgroundColor: configured ? semanticColors.successLight : commonColors.surfaceAlt }]}>
      {configured ? <CheckCircle2 size={13} color={semanticColors.success} /> : <AlertCircle size={13} color={commonColors.textSecondary} />}
      <Text style={[styles.badgeText, { color: configured ? semanticColors.success : commonColors.textSecondary }]}>
        {configured ? 'Configurado' : 'Modo prueba'}
      </Text>
    </View>
  );
}

export default function AdminNotificacionesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
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

  const saveSms = () => {
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
    <View style={styles.container}>
      <LinearGradient colors={adminColors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <SafeAreaView edges={['top']}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(admin)/(tabs)/mas'))}
              style={styles.backBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Volver"
              accessibilityRole="button"
            >
              <ArrowLeft size={24} color={commonColors.white} />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Canales de notificación</Text>
              <Text style={styles.subtitle}>SMS y WhatsApp para mensajes reales</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.content}>
          <CardSkeleton />
          <CardSkeleton style={{ marginTop: spacing.lg }} />
        </View>
      ) : (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── SMS (Twilio) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.cardIcon, { backgroundColor: semanticColors.infoLight }]}>
              <MessageSquare size={20} color={semanticColors.info} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>SMS (Twilio)</Text>
              <StatusBadge configured={!!status?.sms.configured} />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Activar Twilio</Text>
            <Switch value={smsOn} onValueChange={setSmsOn} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
          </View>

          {smsOn && (
            <>
              <Text style={styles.label}>Account SID</Text>
              <TextInput style={styles.input} value={accountSid} onChangeText={setAccountSid} placeholder="AC… (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
              <Text style={styles.label}>Auth Token</Text>
              <TextInput style={styles.input} value={authToken} onChangeText={setAuthToken} placeholder="Token (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
              <Text style={styles.label}>Número remitente</Text>
              <TextInput style={styles.input} value={fromNumber} onChangeText={setFromNumber} placeholder="+15550001111" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
            </>
          )}

          <AppButton title="Guardar SMS" onPress={saveSms} loading={updateSms.isPending} themeColor={BRAND} style={{ marginTop: spacing.md }} />

          <View style={styles.testRow}>
            <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={smsTest} onChangeText={setSmsTest} placeholder="Número para probar" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.testBtn} onPress={() => runTest('sms')} disabled={testing === 'sms'} activeOpacity={0.8}>
              {testing === 'sms' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
              <Text style={styles.testBtnText}>Probar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── WhatsApp (Cloud API) ─── */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <View style={[styles.cardIcon, { backgroundColor: '#E7F6EE' }]}>
              <Phone size={20} color="#25D366" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>WhatsApp (Cloud API)</Text>
              <StatusBadge configured={!!status?.whatsapp.configured} />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Activar WhatsApp Business</Text>
            <Switch value={waOn} onValueChange={setWaOn} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
          </View>

          {waOn && (
            <>
              <Text style={styles.label}>API Token</Text>
              <TextInput style={styles.input} value={apiToken} onChangeText={setApiToken} placeholder="Token (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
              <Text style={styles.label}>Phone Number ID</Text>
              <TextInput style={styles.input} value={phoneNumberId} onChangeText={setPhoneNumberId} placeholder="ID del número de WhatsApp" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
            </>
          )}

          <AppButton title="Guardar WhatsApp" onPress={saveWa} loading={updateWa.isPending} themeColor={BRAND} style={{ marginTop: spacing.md }} />

          <View style={styles.testRow}>
            <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={waTest} onChangeText={setWaTest} placeholder="Número para probar" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
            <TouchableOpacity style={styles.testBtn} onPress={() => runTest('whatsapp')} disabled={testing === 'whatsapp'} activeOpacity={0.8}>
              {testing === 'whatsapp' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
              <Text style={styles.testBtnText}>Probar</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.note}>
          En modo prueba los mensajes solo se registran en el servidor. Al activar un proveedor y
          guardar credenciales válidas, las notificaciones se envían de forma real.
        </Text>
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)' },
  title: { ...typography.h1, color: commonColors.white },
  subtitle: { ...typography.bodySm, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  content: { padding: spacing.lg, paddingBottom: layout.tabBarSpace },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: commonColors.border },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, color: commonColors.text, marginBottom: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { ...typography.overline, letterSpacing: 0, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { ...typography.bodyMedium, color: commonColors.text },
  label: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary, marginTop: spacing.md, marginBottom: 4 },
  input: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, ...typography.body, fontSize: 15, color: commonColors.text },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: BRAND, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  testBtnText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  note: { ...typography.caption, color: commonColors.textSecondary, lineHeight: 18, textAlign: 'center', paddingHorizontal: spacing.md },
});
