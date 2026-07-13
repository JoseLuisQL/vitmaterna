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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { goBack } from '../../../src/utils/navigation';
import {
  MessageSquare, Phone, CheckCircle2, AlertCircle, Send, Info, Wallet, Server, RefreshCw,
  Webhook, Smartphone, Clock, ArrowUpRight, ArrowDownLeft, Power, ScanLine, Inbox, ChevronDown,
} from 'lucide-react-native';
import { AppCard } from '../../../src/components/ui/AppCard';
import { InfoRow } from '../../../src/components/ui/InfoRow';
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
import { shadows } from '../../../src/theme/shadows';

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

/** Nombre legible del proveedor de un canal (para el resumen del hero). */
function providerLabel(channel: 'sms' | 'whatsapp', provider?: string): string {
  if (channel === 'sms') return provider === 'twilio' ? 'Twilio' : 'Sin proveedor';
  if (provider === 'whatsapp_cloud') return 'Meta Cloud API';
  if (provider === 'openwa') return 'OpenWA (propio)';
  return 'Sin proveedor';
}

/**
 * Tarjeta compacta de un canal DENTRO del hero (sobre el gradiente admin):
 * icono, nombre del canal, proveedor y estado (activo / modo prueba).
 */
function HeroChannel({
  icon: Icon, name, provider, configured,
}: { icon: typeof MessageSquare; name: string; provider: string; configured: boolean }): React.ReactElement {
  return (
    <View style={styles.heroChannel}>
      <View style={styles.heroChannelTop}>
        <View style={styles.heroChannelIcon}>
          <Icon size={17} color={commonColors.onColorText} />
        </View>
        <View style={[styles.heroDot, { backgroundColor: configured ? semanticColors.success : commonColors.onColorTextFaint }]} />
      </View>
      <Text style={styles.heroChannelName}>{name}</Text>
      <Text style={styles.heroChannelProvider} numberOfLines={1}>{provider}</Text>
      <Text style={[styles.heroChannelState, { color: configured ? commonColors.onColorText : commonColors.onColorTextFaint }]}>
        {configured ? 'Activo' : 'Modo prueba'}
      </Text>
    </View>
  );
}

/** Chip de estado en vivo de la sesión OpenWA (verde ready / ámbar / rojo). */
function OpenWAStatusChip({ status, loading }: { status?: string; loading?: boolean }) {
  if (loading && !status) {
    return (
      <View style={[styles.liveChip, { backgroundColor: commonColors.surfaceAlt }]}>
        <ActivityIndicator size="small" color={commonColors.textSecondary} />
        <Text style={[styles.liveChipText, { color: commonColors.textSecondary }]}>Cargando…</Text>
      </View>
    );
  }
  const ready = status === 'ready';
  const transitional = status === 'initializing' || status === 'connecting' || status === 'qr';
  const color = ready ? semanticColors.success : transitional ? semanticColors.warning : semanticColors.danger;
  const bg = ready ? semanticColors.successLight : transitional ? semanticColors.warningLight : semanticColors.dangerLight;
  const label = ready ? 'En línea' : transitional ? 'Conectando…' : status === 'disconnected' ? 'Desconectado' : (status || 'Sin estado');
  return (
    <View style={[styles.liveChip, { backgroundColor: bg }]}>
      <View style={[styles.liveDot, { backgroundColor: color }]} />
      <Text style={[styles.liveChipText, { color }]}>{label}</Text>
    </View>
  );
}

/** Etiqueta de estado de entrega de un mensaje (entregado/leído/fallido/…). */
const DELIVERY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  read: { label: 'Leído', color: semanticColors.success, bg: semanticColors.successLight },
  played: { label: 'Reproducido', color: semanticColors.success, bg: semanticColors.successLight },
  delivered: { label: 'Entregado', color: semanticColors.info, bg: semanticColors.infoLight },
  sent: { label: 'Enviado', color: semanticColors.info, bg: semanticColors.infoLight },
  pending: { label: 'Pendiente', color: semanticColors.warning, bg: semanticColors.warningLight },
  failed: { label: 'Fallido', color: semanticColors.danger, bg: semanticColors.dangerLight },
  error: { label: 'Error', color: semanticColors.danger, bg: semanticColors.dangerLight },
};

function DeliveryStatusChip({ status }: { status: string }) {
  const cfg = DELIVERY_STATUS[status.toLowerCase()] ?? {
    label: status,
    color: commonColors.textSecondary,
    bg: commonColors.surfaceAlt,
  };
  return (
    <View style={[styles.deliveryChip, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.deliveryChipText, { color: cfg.color }]}>{cfg.label}</Text>
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

  // Tarjetas de canal colapsables: se abren solas si el canal aún no está
  // configurado (para invitar a completarlo) y se pueden plegar para reducir ruido.
  // Solo se fija el estado inicial UNA vez (al primer status), para no pisar el
  // plegado manual del usuario cuando react-query refresca `status`.
  const [smsExpanded, setSmsExpanded] = useState<boolean | null>(null);
  const [waExpanded, setWaExpanded] = useState<boolean | null>(null);
  useEffect(() => {
    if (status) {
      setSmsExpanded((prev) => (prev === null ? !status.sms.configured : prev));
      setWaExpanded((prev) => (prev === null ? !status.whatsapp.configured : prev));
    }
  }, [status]);

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
        {/* Hero de resumen: estado de los canales de un vistazo */}
        <View ref={notifTourTarget} collapsable={false}>
          <LinearGradient
            colors={adminColors.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroHeader}>
              <Text style={styles.heroTitle}>Estado de los canales</Text>
              <Text style={styles.heroSubtitle}>
                {smsConfigured || waConfigured
                  ? 'Al menos un canal real está activo.'
                  : 'Ningún canal real activo — todo va por push e in-app.'}
              </Text>
            </View>
            <View style={styles.heroChannels}>
              <HeroChannel icon={MessageSquare} name="SMS" provider={providerLabel('sms', status?.sms.provider)} configured={smsConfigured} />
              <HeroChannel icon={Phone} name="WhatsApp" provider={providerLabel('whatsapp', status?.whatsapp.provider)} configured={waConfigured} />
            </View>
          </LinearGradient>
        </View>

        {/* ─── Interruptor global de gasto (SMS/WhatsApp) ─── */}
        <View style={[styles.card, styles.paidCard]}>
          <View style={[styles.cardHead, { marginBottom: spacing.sm }]}>
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
            <TouchableOpacity
              style={styles.cardHead}
              onPress={() => setSmsExpanded((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: !!smsExpanded }}
              accessibilityLabel="Configuración de SMS por Twilio"
            >
              <View style={[styles.cardIcon, { backgroundColor: semanticColors.infoLight }]}>
                <MessageSquare size={20} color={semanticColors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>SMS (Twilio)</Text>
                <Text style={styles.cardHint}>Recordatorios y alertas por mensaje de texto</Text>
              </View>
              <StatusBadge configured={smsConfigured} />
              <View style={[styles.cardChevron, smsExpanded && styles.cardChevronOpen]}>
                <ChevronDown size={20} color={commonColors.textSecondary} />
              </View>
            </TouchableOpacity>

            {smsExpanded && (
            <View style={styles.cardBody}>
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
                    <TextInput style={[styles.input, { flex: 1, marginTop: 0, minWidth: 0 }]} value={smsTest} onChangeText={setSmsTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                    <TouchableOpacity style={[styles.testBtn, testing === 'sms' && { opacity: 0.7 }]} onPress={() => runTest('sms')} disabled={testing === 'sms'} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Enviar SMS de prueba">
                      {testing === 'sms' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                      <Text style={styles.testBtnText}>Probar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            </View>
            )}
          </View>

          {/* ─── WhatsApp (Cloud API) ─── */}
          <View ref={waTourTarget} collapsable={false} style={[styles.card, webShell && { flex: 1 }]}>
            <TouchableOpacity
              style={styles.cardHead}
              onPress={() => setWaExpanded((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ expanded: !!waExpanded }}
              accessibilityLabel="Configuración de WhatsApp"
            >
              <View style={[styles.cardIcon, { backgroundColor: accentColors.whatsappLight }]}>
                <Phone size={20} color={accentColors.whatsapp} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>WhatsApp (Cloud API)</Text>
                <Text style={styles.cardHint}>Mensajes vía WhatsApp Business</Text>
              </View>
              <StatusBadge configured={waConfigured} />
              <View style={[styles.cardChevron, waExpanded && styles.cardChevronOpen]}>
                <ChevronDown size={20} color={commonColors.textSecondary} />
              </View>
            </TouchableOpacity>

            {waExpanded && (
            <View style={styles.cardBody}>
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
                    <Text style={[styles.segmentText, waProvider === 'whatsapp_cloud' && styles.segmentTextActive]}>Cloud API</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.segmentBtn, waProvider === 'openwa' && styles.segmentBtnActive]}
                    onPress={() => setWaProvider('openwa')}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityState={{ selected: waProvider === 'openwa' }}
                    accessibilityLabel="Usar OpenWA, servidor propio"
                  >
                    <Text style={[styles.segmentText, waProvider === 'openwa' && styles.segmentTextActive]}>OpenWA (Propio)</Text>
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
                    <TextInput style={[styles.input, { flex: 1, marginTop: 0, minWidth: 0 }]} value={waTest} onChangeText={setWaTest} placeholder="+51987654321" placeholderTextColor={commonColors.textTertiary} keyboardType="phone-pad" />
                    <TouchableOpacity style={[styles.testBtn, testing === 'whatsapp' && { opacity: 0.7 }]} onPress={() => runTest('whatsapp')} disabled={testing === 'whatsapp'} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Enviar WhatsApp de prueba">
                      {testing === 'whatsapp' ? <ActivityIndicator size="small" color={commonColors.white} /> : <Send size={16} color={commonColors.white} />}
                      <Text style={styles.testBtnText}>Probar</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            </View>
            )}
          </View>
        </View>

        {/* ─── Gestión del servidor OpenWA (solo si el proveedor activo es OpenWA) ─── */}
        {openwaActive && (
          <View style={styles.owaPanel}>
            {/* Encabezado del panel */}
            <View style={styles.owaPanelHead}>
              <View style={[styles.cardIcon, { backgroundColor: accentColors.whatsappLight }]}>
                <Server size={20} color={accentColors.whatsapp} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Servidor OpenWA</Text>
                <Text style={styles.cardHint}>Gestiona la sesión de WhatsApp sin salir de la app</Text>
              </View>
              <TouchableOpacity
                onPress={() => { openwaStatus.refetch(); openwaMessages.refetch(); }}
                accessibilityRole="button"
                accessibilityLabel="Actualizar estado de OpenWA"
                style={styles.refreshBtn}
                activeOpacity={0.7}
              >
                <RefreshCw size={16} color={adminColors.primary} />
              </TouchableOpacity>
            </View>

            <View style={webShell ? styles.owaGrid : undefined}>
              {/* ── Tarjeta: Estado de la conexión ── */}
              <AppCard bordered style={[styles.owaCard, webShell && styles.owaGridItem]}>
                <View style={styles.owaCardHead}>
                  <Text style={styles.owaCardTitle}>Estado de la sesión</Text>
                  <OpenWAStatusChip status={openwaStatus.data?.status} loading={openwaStatus.isLoading} />
                </View>

                {openwaStatus.isError ? (
                  <View style={styles.owaErrorBox}>
                    <AlertCircle size={15} color={semanticColors.danger} />
                    <Text style={styles.owaErrorText}>No se pudo leer el estado del servidor. Revisa la URL, la API key y el Session ID en la configuración de WhatsApp.</Text>
                  </View>
                ) : (
                  <View style={styles.owaInfoList}>
                    <InfoRow
                      label="Número vinculado"
                      right={
                        <View style={styles.owaInfoValueRow}>
                          <Smartphone size={14} color={commonColors.textSecondary} />
                          <Text style={styles.owaInfoValue}>{openwaStatus.data?.phone || '—'}</Text>
                        </View>
                      }
                    />
                    <InfoRow label="Cuenta" value={openwaStatus.data?.pushName || '—'} />
                    <InfoRow
                      label="Última actividad"
                      divider={false}
                      right={
                        <View style={styles.owaInfoValueRow}>
                          <Clock size={14} color={commonColors.textSecondary} />
                          <Text style={styles.owaInfoValue}>
                            {openwaStatus.data?.lastActive ? new Date(openwaStatus.data.lastActive).toLocaleString() : '—'}
                          </Text>
                        </View>
                      }
                    />
                  </View>
                )}

                {!!openwaStatus.data?.lastError && (
                  <View style={styles.owaErrorBox}>
                    <AlertCircle size={15} color={semanticColors.danger} />
                    <Text style={styles.owaErrorText}>Último error: {openwaStatus.data.lastError}</Text>
                  </View>
                )}

                {/* Acción de conexión según el estado */}
                <View style={styles.owaConnectAction}>
                  {sessionReady ? (
                    <AppButton
                      title="Desconectar sesión"
                      onPress={onDisconnect}
                      loading={openwaDisconnect.isPending}
                      variant="outline"
                      size="sm"
                      icon={Power}
                      themeColor={semanticColors.danger}
                      fullWidth
                    />
                  ) : (
                    <AppButton
                      title="Reconectar y vincular"
                      onPress={onConnect}
                      loading={openwaConnect.isPending}
                      size="sm"
                      icon={ScanLine}
                      themeColor={accentColors.whatsapp}
                      fullWidth
                    />
                  )}
                </View>

                {/* QR de vinculación (cuando la sesión lo requiere) */}
                {qrShown && (
                  <View style={styles.qrBox}>
                    <View style={styles.qrFrame}>
                      <Image source={{ uri: qrShown }} style={styles.qrImage} resizeMode="contain" accessibilityLabel="Código QR para vincular WhatsApp" />
                    </View>
                    <Text style={styles.qrHint}>En el teléfono: WhatsApp → Dispositivos vinculados → Vincular un dispositivo, y escanea este código.</Text>
                  </View>
                )}
              </AppCard>

              {/* ── Tarjeta: Webhook entrante (chat unificado) ── */}
              <AppCard bordered style={[styles.owaCard, webShell && styles.owaGridItem]}>
                <View style={styles.owaCardHead}>
                  <View style={styles.owaCardTitleRow}>
                    <Webhook size={16} color={adminColors.primary} />
                    <Text style={styles.owaCardTitle}>Mensajes entrantes</Text>
                  </View>
                  <View style={[styles.deliveryChip, { backgroundColor: status?.whatsapp.webhookConfigured ? semanticColors.successLight : semanticColors.warningLight }]}>
                    <Text style={[styles.deliveryChipText, { color: status?.whatsapp.webhookConfigured ? semanticColors.success : semanticColors.warning }]}>
                      {status?.whatsapp.webhookConfigured ? 'Configurado' : 'Pendiente'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.owaCardDesc}>
                  {status?.whatsapp.webhookConfigured
                    ? 'Registra la URL pública para que las respuestas de las gestantes por WhatsApp aparezcan en su chat con el obstetra.'
                    : 'Primero guarda el secreto del webhook al configurar WhatsApp/OpenWA. Luego registra aquí la URL pública.'}
                </Text>

                <Text style={styles.label}>URL pública del webhook</Text>
                <TextInput
                  style={[styles.input, webhookUrl.trim() !== '' && !isHttpUrl(webhookUrl) && styles.inputError]}
                  value={webhookUrl}
                  onChangeText={setWebhookUrl}
                  placeholder="https://tu-backend/v1/webhooks/openwa"
                  placeholderTextColor={commonColors.textTertiary}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                {webhookUrl.trim() !== '' && !isHttpUrl(webhookUrl) && <Text style={styles.errorHint}>Debe empezar con https://</Text>}
                <AppButton
                  title="Registrar webhook"
                  onPress={onRegisterWebhook}
                  loading={registerWebhook.isPending}
                  variant="outline"
                  size="sm"
                  icon={Webhook}
                  themeColor={adminColors.primary}
                  style={{ marginTop: spacing.sm2 }}
                />
              </AppCard>
            </View>

            {/* ── Tarjeta: Actividad reciente ── */}
            <AppCard bordered style={styles.owaCard}>
              <View style={styles.owaCardHead}>
                <View style={styles.owaCardTitleRow}>
                  <MessageSquare size={16} color={adminColors.primary} />
                  <Text style={styles.owaCardTitle}>Actividad reciente</Text>
                </View>
                <Text style={styles.owaCount}>
                  {openwaMessages.data?.length ? `${Math.min(openwaMessages.data.length, 8)} mensajes` : ''}
                </Text>
              </View>

              {openwaMessages.isLoading ? (
                <View style={styles.owaLoading}>
                  <ActivityIndicator size="small" color={accentColors.whatsapp} />
                  <Text style={styles.owaLoadingText}>Cargando mensajes…</Text>
                </View>
              ) : !openwaMessages.data?.length ? (
                <View style={styles.owaEmpty}>
                  <View style={styles.owaEmptyIcon}>
                    <Inbox size={26} color={commonColors.textTertiary} strokeWidth={1.6} />
                  </View>
                  <Text style={styles.owaEmptyText}>Aún no hay mensajes registrados en el servidor.</Text>
                </View>
              ) : (
                <View>
                  {openwaMessages.data.slice(0, 8).map((m, idx, arr) => {
                    const outgoing = m.direction === 'outgoing';
                    return (
                      <View key={m.id} style={[styles.owaMsgRow, idx === arr.length - 1 && styles.owaMsgRowLast]}>
                        <View style={[styles.owaMsgIcon, { backgroundColor: outgoing ? semanticColors.infoLight : accentColors.whatsappLight }]}>
                          {outgoing
                            ? <ArrowUpRight size={15} color={semanticColors.info} />
                            : <ArrowDownLeft size={15} color={accentColors.whatsapp} />}
                        </View>
                        <View style={styles.owaMsgBodyWrap}>
                          <Text style={styles.owaMsgBody} numberOfLines={1}>{m.body || '(sin texto)'}</Text>
                          <Text style={styles.owaMsgMeta} numberOfLines={1}>
                            {outgoing ? 'Enviado' : 'Recibido'}
                            {m.to ? ` · ${m.to.replace('@c.us', '')}` : ''}
                            {m.timestamp ? ` · ${new Date(m.timestamp * 1000).toLocaleDateString()} ${new Date(m.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                          </Text>
                        </View>
                        {!!m.status && <DeliveryStatusChip status={m.status} />}
                      </View>
                    );
                  })}
                </View>
              )}
            </AppCard>
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
  // ─── Hero de resumen (gradiente admin) ───
  hero: { borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.card },
  heroHeader: { marginBottom: spacing.md },
  heroTitle: { ...typography.h3, color: commonColors.onColorText, fontWeight: '800' },
  heroSubtitle: { ...typography.bodySm, color: commonColors.onColorTextSoft, marginTop: 2 },
  heroChannels: { flexDirection: 'row', gap: spacing.md },
  heroChannel: {
    flex: 1, backgroundColor: commonColors.onColorSurface, borderRadius: borderRadius.lg,
    padding: spacing.md, gap: 2,
  },
  heroChannelTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  heroChannelIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: commonColors.onColorSurfaceFaint,
    alignItems: 'center', justifyContent: 'center',
  },
  heroDot: { width: 9, height: 9, borderRadius: 5 },
  heroChannelName: { ...typography.bodyMd, color: commonColors.onColorText, fontWeight: '800' },
  heroChannelProvider: { ...typography.caption, color: commonColors.onColorTextSoft },
  heroChannelState: { ...typography.label, fontWeight: '800', marginTop: 2 },
  card: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: commonColors.borderLight, ...shadows.subtle },
  paidCard: { borderColor: semanticColors.warning, borderWidth: 1.5 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Tarjeta de canal colapsable
  cardChevron: { flexShrink: 0, transform: [{ rotate: '0deg' }] },
  cardChevronOpen: { transform: [{ rotate: '180deg' }] },
  cardBody: { marginTop: spacing.md },
  cardIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { ...typography.h3, color: commonColors.text, fontWeight: '800' },
  cardHint: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { ...typography.label, letterSpacing: 0, fontWeight: '800' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm },
  switchLabel: { ...typography.h3, color: commonColors.text, fontWeight: '700' },
  // Selector de proveedor (segmented control sencillo con tokens del sistema).
  segment: { flexDirection: 'row', gap: 4, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.xl, padding: 4, marginTop: spacing.xs, marginBottom: spacing.sm },
  segmentBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: 'transparent' },
  segmentBtnActive: { backgroundColor: commonColors.surface, borderColor: commonColors.borderLight, ...shadows.subtle },
  segmentText: { ...typography.bodySm, fontWeight: '600', color: commonColors.textSecondary, textAlign: 'center' },
  segmentTextActive: { color: BRAND, fontWeight: '800' },
  helpBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: commonColors.surfaceAlt, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm, marginBottom: spacing.md },
  helpText: { ...typography.bodySm, color: commonColors.textSecondary, flex: 1 },
  label: { ...typography.label, fontWeight: '800', color: commonColors.textSecondary, marginTop: spacing.sm, marginBottom: 6 },
  input: { backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: 14, ...typography.body, fontSize: 16, color: commonColors.text },
  inputError: { borderColor: semanticColors.danger },
  errorHint: { ...typography.label, color: semanticColors.danger, marginTop: 6, fontWeight: '600' },
  testBlock: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  testTitle: { ...typography.label, fontWeight: '800', color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  testDisabledHint: { ...typography.bodySm, color: commonColors.textTertiary, fontStyle: 'italic' },
  testMsgInput: { minHeight: 110, textAlignVertical: 'top', marginBottom: spacing.md, paddingTop: 14, paddingBottom: 14 },
  testRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  testBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: BRAND, borderRadius: borderRadius.full, paddingHorizontal: 16, paddingVertical: 12, ...shadows.card, flexShrink: 0 },
  testBtnText: { ...typography.bodySm, fontWeight: '800', color: commonColors.white },
  note: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'stretch',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  // ─── Panel de gestión OpenWA (refactor) ───
  owaPanel: { marginTop: spacing.sm, marginBottom: spacing.md },
  owaPanelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  refreshBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: adminColors.primaryLight },
  owaGrid: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  owaGridItem: { flex: 1, minWidth: 0 },
  owaCard: { marginBottom: spacing.md },
  owaCardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  owaCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  owaCardTitle: { ...typography.h3, fontWeight: '800', color: commonColors.text },
  owaCardDesc: { ...typography.bodySm, color: commonColors.textSecondary, marginBottom: spacing.xs },
  owaCount: { ...typography.label, color: commonColors.textTertiary, fontWeight: '700' },
  // Chip de estado en vivo de la sesión
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveChipText: { ...typography.label, fontWeight: '800' },
  // Lista de datos del estado
  owaInfoList: { marginTop: spacing.sm },
  owaInfoValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  owaInfoValue: { ...typography.bodyMd, color: commonColors.text, fontWeight: '600', flexShrink: 1 },
  owaErrorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: semanticColors.dangerLight, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.sm },
  owaErrorText: { ...typography.bodySm, color: semanticColors.danger, flex: 1 },
  owaConnectAction: { marginTop: spacing.lg },
  // QR
  qrBox: { alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  qrFrame: { padding: spacing.md, backgroundColor: commonColors.white, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: commonColors.border, ...shadows.subtle },
  qrImage: { width: 220, height: 220, borderRadius: borderRadius.md, backgroundColor: commonColors.white },
  qrHint: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', paddingHorizontal: spacing.md },
  // Estado de entrega (chip)
  deliveryChip: { borderRadius: borderRadius.full, paddingHorizontal: 10, paddingVertical: 4 },
  deliveryChipText: { ...typography.label, letterSpacing: 0, fontWeight: '800' },
  // Actividad reciente
  owaLoading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  owaLoadingText: { ...typography.bodySm, color: commonColors.textSecondary },
  owaEmpty: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  owaEmptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: commonColors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  owaEmptyText: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', maxWidth: 280 },
  owaMsgRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  owaMsgRowLast: { borderBottomWidth: 0 },
  owaMsgIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  owaMsgBodyWrap: { flex: 1, minWidth: 0 },
  owaMsgBody: { ...typography.bodyMd, color: commonColors.text, fontWeight: '600' },
  owaMsgMeta: { ...typography.caption, color: commonColors.textTertiary, marginTop: 2 },
});
