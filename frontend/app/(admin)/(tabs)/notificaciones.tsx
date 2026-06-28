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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import { MessageSquare, Phone, CheckCircle2, AlertCircle, Send, Info, Wallet, Server, RefreshCw, QrCode, Webhook } from 'lucide-react-native';
import { ScreenLayout } from '../../../src/components/layout/ScreenLayout';
import { useTourTarget } from '../../../src/components/tour/tourTargets';
import { TOUR_TARGETS } from '../../../src/components/tour/steps/targets';
import { AppButton } from '../../../src/components/ui/AppButton';
import { CardSkeleton } from '../../../src/components/ui/SkeletonLoader';
import { useToast } from '../../../src/components/ui';
import { useResponsive } from '../../../src/theme/responsive';
import {
  useChannelsConfig, useUpdateSmsConfig, useUpdateWhatsAppConfig, useTestChannel,
  useSetPaidChannelsEnabled,
  useOpenWAStatus, useOpenWAConnect, useOpenWADisconnect, useOpenWAMessages, useRegisterOpenWAWebhook,
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

/** Chip de estado en vivo de la sesión OpenWA (verde ready / ámbar / rojo). */
function OpenWAStatusChip({ status, loading }: { status?: string; loading?: boolean }) {
  if (loading && !status) {
    return (
      <View style={[styles.badge, { backgroundColor: commonColors.surfaceAlt }]}>
        <ActivityIndicator size="small" color={commonColors.textSecondary} />
        <Text style={[styles.badgeText, { color: commonColors.textSecondary }]}>Cargando…</Text>
      </View>
    );
  }
  const ready = status === 'ready';
  const transitional = status === 'initializing' || status === 'connecting' || status === 'qr';
  const color = ready ? semanticColors.success : transitional ? semanticColors.warning : semanticColors.danger;
  const bg = ready ? semanticColors.successLight : transitional ? semanticColors.warningLight : semanticColors.dangerLight;
  const label = ready ? 'En línea' : transitional ? 'Conectando…' : status === 'disconnected' ? 'Desconectado' : (status || 'Sin estado');
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {ready ? <CheckCircle2 size={13} color={color} /> : <AlertCircle size={13} color={color} />}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AdminNotificacionesScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const notifTourTarget = useTourTarget(TOUR_TARGETS.adminNotif);
  const smsTourTarget = useTourTarget(TOUR_TARGETS.adminNotifSms);
  const waTourTarget = useTourTarget(TOUR_TARGETS.adminNotifWa);
  const { data: status, isLoading } = useChannelsConfig();
  const updateSms = useUpdateSmsConfig();
  const updateWa = useUpdateWhatsAppConfig();
  const testChannel = useTestChannel();
  const setPaidEnabled = useSetPaidChannelsEnabled();

  // Interruptor global de gasto (SMS/WhatsApp). Por defecto activado.
  const paidEnabled = status?.paidEnabled !== false;

  // ─── Panel de gestión OpenWA (solo cuando el proveedor activo es OpenWA) ───
  const openwaActive = status?.whatsapp.provider === 'openwa' && !!status?.whatsapp.configured;
  const openwaStatus = useOpenWAStatus(openwaActive);
  const openwaMessages = useOpenWAMessages(openwaActive);
  const openwaConnect = useOpenWAConnect();
  const openwaDisconnect = useOpenWADisconnect();
  const registerWebhook = useRegisterOpenWAWebhook();
  const [webhookUrl, setWebhookUrl] = useState('');
  const [qrShown, setQrShown] = useState<string | null>(null);

  const sessionReady = openwaStatus.data?.status === 'ready';

  const onConnect = () => {
    openwaConnect.mutate(undefined, {
      onSuccess: (r) => {
        if (r?.needsQr && r.qr) {
          setQrShown(r.qr);
          toast.info('Escanea el código', 'Abre WhatsApp en el teléfono y escanea el QR para vincular la sesión.');
        } else {
          setQrShown(null);
          toast.success('Sesión iniciada', r?.message || 'La sesión ya está autenticada.');
        }
      },
      onError: (e: any) => toast.error('No se pudo reconectar', e?.response?.data?.error?.message || 'Revisa el servidor OpenWA.'),
    });
  };

  const onDisconnect = () => {
    openwaDisconnect.mutate(undefined, {
      onSuccess: () => { setQrShown(null); toast.success('Sesión detenida', 'La sesión de WhatsApp se desvinculó.'); },
      onError: (e: any) => toast.error('No se pudo detener', e?.response?.data?.error?.message || 'Inténtalo de nuevo.'),
    });
  };

  const onRegisterWebhook = () => {
    const url = webhookUrl.trim();
    if (!isHttpUrl(url)) {
      toast.error('URL inválida', 'Indica una URL pública https:// que apunte a /v1/webhooks/openwa de tu backend.');
      return;
    }
    registerWebhook.mutate(url, {
      onSuccess: () => toast.success('Webhook registrado', 'Las respuestas de las gestantes por WhatsApp llegarán a su chat.'),
      onError: (e: any) => toast.error('No se pudo registrar', e?.response?.data?.error?.message || 'Revisa la URL y el secreto del webhook.'),
    });
  };

  const togglePaid = (next: boolean) => {
    setPaidEnabled.mutate(next, {
      onSuccess: () =>
        next
          ? toast.success('Canales de pago activados', 'Los mensajes esenciales se enviarán por SMS/WhatsApp.')
          : toast.success('Canales de pago apagados', 'No se enviará ningún SMS ni WhatsApp. Push e in-app siguen activos.'),
      onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo cambiar el interruptor.'),
    });
  };

  // SMS (Twilio)
  const [smsOn, setSmsOn] = useState(false);
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [fromNumber, setFromNumber] = useState('');

  // WhatsApp: proveedor seleccionable (Meta Cloud API u OpenWA self-hosted).
  const [waOn, setWaOn] = useState(false);
  const [waProvider, setWaProvider] = useState<'whatsapp_cloud' | 'openwa'>('whatsapp_cloud');
  // Meta Cloud API
  const [apiToken, setApiToken] = useState('');
  const [phoneNumberId, setPhoneNumberId] = useState('');
  // OpenWA (gateway self-hosted)
  const [openwaUrl, setOpenwaUrl] = useState('');
  const [openwaApiKey, setOpenwaApiKey] = useState('');
  const [openwaSessionId, setOpenwaSessionId] = useState('');

  // Prueba
  const [smsTest, setSmsTest] = useState('');
  const [waTest, setWaTest] = useState('');
  const DEFAULT_TEST_MSG = 'VITMATERNA: mensaje de prueba. Si lo recibes, el canal está configurado correctamente.';
  const [smsTestMsg, setSmsTestMsg] = useState(DEFAULT_TEST_MSG);
  const [waTestMsg, setWaTestMsg] = useState(DEFAULT_TEST_MSG);
  const [testing, setTesting] = useState<'sms' | 'whatsapp' | null>(null);

  useEffect(() => {
    if (status) {
      setSmsOn(status.sms.provider === 'twilio');
      setFromNumber(status.sms.fromNumber || '');
      const prov = status.whatsapp.provider;
      setWaOn(prov === 'whatsapp_cloud' || prov === 'openwa');
      if (prov === 'openwa') setWaProvider('openwa');
      else if (prov === 'whatsapp_cloud') setWaProvider('whatsapp_cloud');
      setPhoneNumberId(status.whatsapp.phoneNumberId || '');
      setOpenwaUrl(status.whatsapp.baseUrl || '');
      setOpenwaSessionId(status.whatsapp.sessionId || '');
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

  /** Valida que sea una URL http(s). Vacío = aún no validado. */
  const isHttpUrl = (v: string): boolean => /^https?:\/\/.+/i.test(v.trim());

  const saveWa = () => {
    let payload: Parameters<typeof updateWa.mutate>[0];
    if (!waOn) {
      payload = { provider: 'mock' };
    } else if (waProvider === 'openwa') {
      if (openwaUrl.trim() && !isHttpUrl(openwaUrl)) {
        toast.error('URL inválida', 'La URL del servidor OpenWA debe empezar con https:// (ej. https://openwa.qware.me).');
        return;
      }
      payload = {
        provider: 'openwa',
        baseUrl: openwaUrl.trim() || undefined,
        apiKey: openwaApiKey || undefined,
        sessionId: openwaSessionId.trim() || undefined,
      };
    } else {
      payload = { provider: 'whatsapp_cloud', apiToken: apiToken || undefined, phoneNumberId: phoneNumberId || undefined };
    }
    updateWa.mutate(payload, {
      onSuccess: () => {
        toast.success('WhatsApp guardado', waOn ? 'Configuración de WhatsApp actualizada.' : 'WhatsApp en modo prueba.');
        // Limpia los campos secretos del formulario tras guardar.
        setApiToken('');
        setOpenwaApiKey('');
      },
      onError: (e: any) => toast.error('Error', e?.response?.data?.error?.message || 'No se pudo guardar.'),
    });
  };

  const runTest = (canal: 'sms' | 'whatsapp') => {
    const destino = (canal === 'sms' ? smsTest : waTest).trim();
    const mensaje = (canal === 'sms' ? smsTestMsg : waTestMsg).trim();
    if (!destino) {
      toast.info('Falta el número', 'Ingresa un número de destino para la prueba.');
      return;
    }
    if (!isE164(destino)) {
      toast.error('Número inválido', 'Usa formato E.164, ej. +51987654321.');
      return;
    }
    if (!mensaje) {
      toast.info('Falta el mensaje', 'Escribe el texto de prueba a enviar.');
      return;
    }
    setTesting(canal);
    testChannel.mutate(
      { canal, destino, mensaje },
      {
        onSuccess: () => toast.success('Prueba enviada', `El mensaje de prueba se envió a ${destino}.`),
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
        <View ref={notifTourTarget} collapsable={false} style={styles.summaryRow}>
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

        {/* ─── Interruptor global de gasto (SMS/WhatsApp) ─── */}
        <View style={[styles.card, styles.paidCard]}>
          <View style={styles.cardHead}>
            <View style={[styles.cardIcon, { backgroundColor: semanticColors.warningLight }]}>
              <Wallet size={20} color={semanticColors.warning} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Envíos de pago (SMS/WhatsApp)</Text>
              <Text style={styles.cardHint}>Controla el gasto de créditos. Push e in-app nunca cuestan.</Text>
            </View>
            <Switch
              value={paidEnabled}
              onValueChange={togglePaid}
              disabled={setPaidEnabled.isPending}
              trackColor={{ false: commonColors.border, true: semanticColors.success }}
              thumbColor={commonColors.white}
            />
          </View>
          <View style={styles.helpBox}>
            <Info size={14} color={commonColors.textSecondary} />
            <Text style={styles.helpText}>
              {paidEnabled
                ? 'Activado: solo se envían por SMS/WhatsApp los mensajes esenciales (código de recuperación de contraseña y recordatorio de cita a 1 día). El resto va solo por push e in-app, sin costo.'
                : 'Apagado: no se envía ningún SMS ni WhatsApp (cero gasto de créditos). Las gestantes y obstetras seguirán recibiendo avisos por push e in-app.'}
            </Text>
          </View>
        </View>

        <View style={webShell ? styles.twoCol : undefined}>
          {/* ─── SMS (Twilio) ─── */}
          <View ref={smsTourTarget} collapsable={false} style={[styles.card, webShell && { flex: 1 }]}>
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
                <>
                  <Text style={styles.label}>Texto de prueba</Text>
                  <TextInput style={[styles.input, styles.testMsgInput]} value={smsTestMsg} onChangeText={setSmsTestMsg} placeholder="Escribe el mensaje a enviar…" placeholderTextColor={commonColors.textTertiary} multiline maxLength={500} />
                  <Text style={styles.label}>Número de destino</Text>
                  <View style={styles.testRow}>
                    <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={smsTest} onChangeText={setSmsTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                    <TouchableOpacity style={[styles.testBtn, testing === 'sms' && { opacity: 0.7 }]} onPress={() => runTest('sms')} disabled={testing === 'sms'} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Enviar SMS de prueba">
                      {testing === 'sms' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                      <Text style={styles.testBtnText}>Probar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* ─── WhatsApp (Cloud API) ─── */}
          <View ref={waTourTarget} collapsable={false} style={[styles.card, webShell && { flex: 1 }]}>
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
              <Text style={styles.switchLabel}>Activar WhatsApp</Text>
              <Switch value={waOn} onValueChange={setWaOn} trackColor={{ false: commonColors.border, true: BRAND }} thumbColor={commonColors.white} />
            </View>

            {waOn && (
              <>
                {/* Selector de proveedor: Meta Cloud API u OpenWA self-hosted. */}
                <Text style={styles.label}>Proveedor</Text>
                <View style={styles.segment}>
                  <TouchableOpacity
                    style={[styles.segmentBtn, waProvider === 'whatsapp_cloud' && styles.segmentBtnActive]}
                    onPress={() => setWaProvider('whatsapp_cloud')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: waProvider === 'whatsapp_cloud' }}
                    accessibilityLabel="Usar Meta Cloud API"
                  >
                    <Text style={[styles.segmentText, waProvider === 'whatsapp_cloud' && styles.segmentTextActive]}>Meta Cloud API</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, waProvider === 'openwa' && styles.segmentBtnActive]}
                    onPress={() => setWaProvider('openwa')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: waProvider === 'openwa' }}
                    accessibilityLabel="Usar OpenWA, servidor propio"
                  >
                    <Text style={[styles.segmentText, waProvider === 'openwa' && styles.segmentTextActive]}>OpenWA (servidor propio)</Text>
                  </TouchableOpacity>
                </View>

                {waProvider === 'whatsapp_cloud' ? (
                  <>
                    <View style={styles.helpBox}>
                      <Info size={14} color={commonColors.textSecondary} />
                      <Text style={styles.helpText}>Desde Meta for Developers: token permanente de la app y el Phone Number ID del número de WhatsApp Business. Los mensajes proactivos requieren plantillas aprobadas.</Text>
                    </View>
                    <Text style={styles.label}>API Token</Text>
                    <TextInput style={styles.input} value={apiToken} onChangeText={setApiToken} placeholder="Token (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
                    <Text style={styles.label}>Phone Number ID</Text>
                    <TextInput style={styles.input} value={phoneNumberId} onChangeText={setPhoneNumberId} placeholder="ID del número de WhatsApp" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
                  </>
                ) : (
                  <>
                    <View style={styles.helpBox}>
                      <Info size={14} color={commonColors.textSecondary} />
                      <Text style={styles.helpText}>OpenWA es un servidor de WhatsApp propio y gratuito (open-wa.org). No requiere plantillas, así que los recordatorios proactivos funcionan con texto libre. El Session ID es el identificador (no el nombre) de la sesión conectada.</Text>
                    </View>
                    <Text style={styles.label}>URL del servidor</Text>
                    <TextInput style={[styles.input, openwaUrl.trim() !== '' && !isHttpUrl(openwaUrl) && styles.inputError]} value={openwaUrl} onChangeText={setOpenwaUrl} placeholder="https://openwa.qware.me" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" keyboardType="url" />
                    {openwaUrl.trim() !== '' && !isHttpUrl(openwaUrl) && <Text style={styles.errorHint}>Debe empezar con https://</Text>}
                    <Text style={styles.label}>API Key</Text>
                    <TextInput style={styles.input} value={openwaApiKey} onChangeText={setOpenwaApiKey} placeholder="owa_k1_… (dejar vacío para no cambiar)" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" secureTextEntry />
                    <Text style={styles.label}>Session ID</Text>
                    <TextInput style={styles.input} value={openwaSessionId} onChangeText={setOpenwaSessionId} placeholder="ID (uuid) de la sesión conectada" placeholderTextColor={commonColors.textTertiary} autoCapitalize="none" />
                  </>
                )}
              </>
            )}

            <AppButton title="Guardar WhatsApp" onPress={saveWa} loading={updateWa.isPending} themeColor={BRAND} style={{ marginTop: spacing.md }} />

            <View style={styles.testBlock}>
              <Text style={styles.testTitle}>Enviar prueba</Text>
              {!waConfigured ? (
                <Text style={styles.testDisabledHint}>Guarda credenciales válidas para habilitar el envío de prueba.</Text>
              ) : (
                <>
                  <Text style={styles.label}>Texto de prueba</Text>
                  <TextInput style={[styles.input, styles.testMsgInput]} value={waTestMsg} onChangeText={setWaTestMsg} placeholder="Escribe el mensaje a enviar…" placeholderTextColor={commonColors.textTertiary} multiline maxLength={500} />
                  <Text style={styles.label}>Número de destino</Text>
                  <View style={styles.testRow}>
                    <TextInput style={[styles.input, { flex: 1, marginTop: 0 }]} value={waTest} onChangeText={setWaTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                    <TouchableOpacity style={[styles.testBtn, testing === 'whatsapp' && { opacity: 0.7 }]} onPress={() => runTest('whatsapp')} disabled={testing === 'whatsapp'} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Enviar WhatsApp de prueba">
                      {testing === 'whatsapp' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                      <Text style={styles.testBtnText}>Probar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </View>

        {/* ─── Gestión del servidor OpenWA (solo si el proveedor activo es OpenWA) ─── */}
        {openwaActive && (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={[styles.cardIcon, { backgroundColor: accentColors.whatsappLight }]}>
                <Server size={20} color={accentColors.whatsapp} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Gestión del servidor OpenWA</Text>
                <Text style={styles.cardHint}>Estado, reconexión y entregas del gateway</Text>
              </View>
              <TouchableOpacity
                onPress={() => { openwaStatus.refetch(); openwaMessages.refetch(); }}
                accessibilityRole="button"
                accessibilityLabel="Actualizar estado de OpenWA"
                style={styles.refreshBtn}
                activeOpacity={0.7}
              >
                <RefreshCw size={16} color={commonColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Tarjeta Estado */}
            <View style={styles.owaStatusRow}>
              <OpenWAStatusChip status={openwaStatus.data?.status} loading={openwaStatus.isLoading} />
              {!!openwaStatus.data?.phone && (
                <Text style={styles.owaMeta}>Número {openwaStatus.data.phone}</Text>
              )}
            </View>
            {openwaStatus.isError ? (
              <Text style={styles.owaError}>No se pudo leer el estado del servidor. Revisa la URL, la API key y el Session ID.</Text>
            ) : (
              <View style={styles.owaMetaGrid}>
                {!!openwaStatus.data?.pushName && <Text style={styles.owaMetaSmall}>Cuenta: {openwaStatus.data.pushName}</Text>}
                {!!openwaStatus.data?.lastActive && (
                  <Text style={styles.owaMetaSmall}>Última actividad: {new Date(openwaStatus.data.lastActive).toLocaleString()}</Text>
                )}
                {!!openwaStatus.data?.lastError && <Text style={styles.owaError}>Último error: {openwaStatus.data.lastError}</Text>}
              </View>
            )}

            {/* Tarjeta Conexión: QR / reconectar / desconectar */}
            <View style={styles.owaActions}>
              {!sessionReady && (
                <TouchableOpacity
                  style={styles.owaActionBtn}
                  onPress={onConnect}
                  disabled={openwaConnect.isPending}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Reconectar la sesión de WhatsApp"
                >
                  {openwaConnect.isPending ? <ActivityIndicator size="small" color={commonColors.white} /> : <QrCode size={16} color={commonColors.white} />}
                  <Text style={styles.owaActionText}>Reconectar</Text>
                </TouchableOpacity>
              )}
              {sessionReady && (
                <TouchableOpacity
                  style={[styles.owaActionBtn, styles.owaActionDanger]}
                  onPress={onDisconnect}
                  disabled={openwaDisconnect.isPending}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Desconectar la sesión de WhatsApp"
                >
                  {openwaDisconnect.isPending ? <ActivityIndicator size="small" color={commonColors.white} /> : <Phone size={16} color={commonColors.white} />}
                  <Text style={styles.owaActionText}>Desconectar</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* QR de vinculación (cuando la sesión lo requiere) */}
            {qrShown && (
              <View style={styles.qrBox}>
                <Image source={{ uri: qrShown }} style={styles.qrImage} resizeMode="contain" accessibilityLabel="Código QR para vincular WhatsApp" />
                <Text style={styles.helpText}>Abre WhatsApp → Dispositivos vinculados → Vincular un dispositivo, y escanea este código.</Text>
              </View>
            )}

            {/* Tarjeta Webhook entrante (chat unificado) */}
            <View style={styles.testBlock}>
              <Text style={styles.testTitle}>Webhook entrante (respuestas de la gestante)</Text>
              <View style={styles.helpBox}>
                <Webhook size={14} color={commonColors.textSecondary} />
                <Text style={styles.helpText}>
                  {status?.whatsapp.webhookConfigured
                    ? 'Secreto del webhook configurado. Registra la URL pública para que lo que la gestante responda por WhatsApp aparezca en su chat con el obstetra.'
                    : 'Configura primero el secreto del webhook (webhookSecret) al guardar WhatsApp/OpenWA, luego registra la URL pública aquí.'}
                </Text>
              </View>
              <Text style={styles.label}>URL pública del webhook</Text>
              <View style={styles.testRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginTop: 0 }]}
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  placeholder="https://tu-backend/v1/webhooks/openwa"
                  placeholderTextColor={commonColors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <TouchableOpacity
                  style={[styles.testBtn, registerWebhook.isPending && { opacity: 0.7 }]}
                  onPress={onRegisterWebhook}
                  disabled={registerWebhook.isPending}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Registrar el webhook entrante de OpenWA"
                >
                  {registerWebhook.isPending ? <ActivityIndicator size="small" color={commonColors.white} /> : <Webhook size={16} color={commonColors.white} />}
                  <Text style={styles.testBtnText}>Registrar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tarjeta Entregas recientes */}
            <View style={styles.testBlock}>
              <Text style={styles.testTitle}>Mensajes recientes del gateway</Text>
              {openwaMessages.isLoading ? (
                <ActivityIndicator size="small" color={accentColors.whatsapp} style={{ marginTop: spacing.sm }} />
              ) : !openwaMessages.data?.length ? (
                <Text style={styles.testDisabledHint}>Aún no hay mensajes registrados en el servidor.</Text>
              ) : (
                openwaMessages.data.slice(0, 8).map((m) => (
                  <View key={m.id} style={styles.owaMsgRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.owaMsgBody} numberOfLines={1}>{m.body || '(sin texto)'}</Text>
                      <Text style={styles.owaMsgMeta}>
                        {m.direction === 'outgoing' ? 'Enviado' : 'Recibido'}
                        {m.to ? ` · ${m.to.replace('@c.us', '')}` : ''}
                        {m.timestamp ? ` · ${new Date(m.timestamp * 1000).toLocaleString()}` : ''}
                      </Text>
                    </View>
                    {!!m.status && <Text style={styles.owaMsgStatus}>{m.status}</Text>}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

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
  paidCard: { borderColor: semanticColors.warning, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, color: commonColors.text },
  cardHint: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', borderRadius: borderRadius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { ...typography.overline, letterSpacing: 0, fontWeight: '700' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { ...typography.bodyMd, color: commonColors.text },
  // Selector de proveedor (segmented control sencillo con tokens del sistema).
  segment: { flexDirection: 'row', gap: spacing.xs2, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.md, padding: 4, marginTop: 4 },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  segmentBtnActive: { backgroundColor: commonColors.surface, borderWidth: 1, borderColor: BRAND },
  segmentText: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary },
  segmentTextActive: { color: BRAND },
  helpBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.md, padding: spacing.sm2, marginTop: spacing.sm },
  helpText: { ...typography.caption, color: commonColors.textSecondary, flex: 1, lineHeight: 17 },
  label: { ...typography.caption, fontWeight: '600', color: commonColors.textSecondary, marginTop: spacing.md, marginBottom: 4 },
  input: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, ...typography.body, fontSize: 15, color: commonColors.text },
  inputError: { borderColor: semanticColors.danger },
  errorHint: { ...typography.caption, color: semanticColors.danger, marginTop: 4 },
  testBlock: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  testTitle: { ...typography.caption, fontWeight: '700', color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  testDisabledHint: { ...typography.caption, color: commonColors.textTertiary, fontStyle: 'italic' },
  testMsgInput: { minHeight: 64, textAlignVertical: 'top', marginBottom: spacing.sm },
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
  // Panel de gestión OpenWA
  refreshBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surfaceAlt },
  owaStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs2 },
  owaMeta: { ...typography.caption, color: commonColors.text, fontWeight: '600' },
  owaMetaGrid: { marginTop: spacing.sm, gap: 2 },
  owaMetaSmall: { ...typography.caption, color: commonColors.textSecondary },
  owaError: { ...typography.caption, color: semanticColors.danger, marginTop: 4 },
  owaActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  owaActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: accentColors.whatsapp, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 12 },
  owaActionDanger: { backgroundColor: semanticColors.danger },
  owaActionText: { ...typography.caption, fontWeight: '700', color: commonColors.white },
  qrBox: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.md },
  qrImage: { width: 220, height: 220, borderRadius: borderRadius.sm, backgroundColor: commonColors.white },
  owaMsgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  owaMsgBody: { ...typography.bodyMd, color: commonColors.text },
  owaMsgMeta: { ...typography.caption, color: commonColors.textSecondary, marginTop: 2 },
  owaMsgStatus: { ...typography.overline, color: commonColors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
});
