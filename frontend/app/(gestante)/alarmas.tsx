import React, { useMemo, useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { goBack } from '../../src/utils/navigation';
import {
  AlertTriangle, Send, CheckCircle, Phone,
  Frown, Thermometer, Activity, Droplets, Droplet,
  Baby, Zap, Eye, AlertCircle, Clock, Users, HeartPulse, ArrowLeft,
  MoreHorizontal,
} from 'lucide-react-native';
import { reportDangerSign } from '../../src/services/api-queries';
import { useToast, Accordion, TextAreaField } from '../../src/components/ui';
import { gradients } from '../../src/theme/gradients';
import { commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
import { WebMaxWidth } from '../../src/components/web';
import { ScreenLayout } from '../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../src/theme/responsive';

/**
 * VITMATERNA — Reportar alarma (gestante)
 *
 * Refactor UX (divulgación progresiva): los signos se agrupan por etapa en
 * secciones colapsables. La etapa "Durante el embarazo" arranca abierta por ser
 * la más frecuente; "Parto" y "Después del parto" quedan plegadas para reducir
 * la carga cognitiva del personal/gestante rural. Cada sección muestra cuántos
 * síntomas hay marcados dentro. Se añade "Otro síntoma" para reportes
 * personalizados. El acceso a emergencia (llamar) está siempre visible.
 */

type SignoDef = { icono: string; texto: string };

const SIGNOS_EMBARAZO: SignoDef[] = [
  { icono: 'Frown', texto: 'Vómitos frecuentes e intensos' },
  { icono: 'Thermometer', texto: 'Dolor de cabeza fuerte, fiebre o calentura' },
  { icono: 'Activity', texto: 'Pies, manos o cara hinchada' },
  { icono: 'Droplets', texto: 'Pérdida de sangre por sus partes' },
  { icono: 'Droplet', texto: 'Pérdida de líquido por sus partes' },
  { icono: 'Baby', texto: 'El bebé no se mueve' },
  { icono: 'Zap', texto: 'Dolores antes de la fecha de parto' },
  { icono: 'Eye', texto: 'Visión borrosa o manchas en los ojos' },
];

const SIGNOS_PARTO: SignoDef[] = [
  { icono: 'Droplet', texto: 'Pérdida de líquido por más de 6 horas' },
  { icono: 'Baby', texto: 'El niño viene de pies o atravesado' },
  { icono: 'Users', texto: 'Son gemelos o mellizos' },
  { icono: 'Droplets', texto: 'Hemorragia vaginal abundante' },
  { icono: 'AlertCircle', texto: 'Salida del cordón por la vagina' },
  { icono: 'Clock', texto: 'La placenta no sale por más de 30 minutos' },
];

const SIGNOS_POSTPARTO: SignoDef[] = [
  { icono: 'Droplets', texto: 'Sangrado vaginal abundante' },
  { icono: 'Thermometer', texto: 'Fiebre, escalofríos y mal olor' },
  { icono: 'Activity', texto: 'Hinchazón y dolor de manos' },
  { icono: 'AlertCircle', texto: 'La placenta no salió completa' },
];

const TODOS_LOS_SIGNOS: SignoDef[] = [
  ...SIGNOS_EMBARAZO, ...SIGNOS_PARTO, ...SIGNOS_POSTPARTO,
];

// Índices globales por grupo (para mapear selección ↔ etiqueta original).
const OFFSET_PARTO = SIGNOS_EMBARAZO.length;
const OFFSET_POSTPARTO = SIGNOS_EMBARAZO.length + SIGNOS_PARTO.length;

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  Frown, Thermometer, Activity, Droplets, Droplet,
  Baby, Zap, Eye, AlertCircle, Clock, Users, HeartPulse,
};

function SignoIcon({ name, color }: { name: string; color: string }) {
  const Icon = ICON_MAP[name] ?? AlertCircle;
  return <Icon size={20} color={color} />;
}

export default function AlarmScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
  // "Otro síntoma": permite describir un signo no listado.
  const [otroActivo, setOtroActivo] = useState(false);
  const [otroTexto, setOtroTexto] = useState('');
  const [enviado, setEnviado] = useState(false);

  const { mutateAsync: enviarAlerta, isPending } = useMutation({
    mutationFn: async ({ sintomas, notas }: { sintomas: string[]; notas: string }) => {
      // El backend registra un signo de alarma por cada síntoma reportado.
      // Offline-first: reportDangerSign encola si no hay red (idempotente).
      for (const sintoma of sintomas) {
        await reportDangerSign({
          tipo_signo: sintoma,
          descripcion: notas || undefined,
          severidad: 'grave',
        });
      }
    },
  });

  function toggleSigno(i: number) {
    setSeleccionados((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);
  }

  // Cuenta de síntomas marcados por grupo (para el badge del Accordion).
  const countEmbarazo = useMemo(
    () => seleccionados.filter((i) => i < OFFSET_PARTO).length,
    [seleccionados],
  );
  const countParto = useMemo(
    () => seleccionados.filter((i) => i >= OFFSET_PARTO && i < OFFSET_POSTPARTO).length,
    [seleccionados],
  );
  const countPostparto = useMemo(
    () => seleccionados.filter((i) => i >= OFFSET_POSTPARTO).length,
    [seleccionados],
  );

  // Etiquetas a reportar = signos marcados + (si aplica) el texto de "Otro".
  const otroValido = otroActivo && otroTexto.trim().length > 0;
  const totalReportes = seleccionados.length + (otroValido ? 1 : 0);

  async function handleEnviar() {
    if (totalReportes === 0) {
      toast.warning('Marca un síntoma', 'Selecciona al menos un síntoma o describe uno en "Otro síntoma".');
      return;
    }
    if (otroActivo && otroTexto.trim().length === 0 && seleccionados.length === 0) {
      toast.warning('Describe el síntoma', 'Escribe qué sientes en "Otro síntoma" antes de enviar.');
      return;
    }
    const sintomas = seleccionados.map((i) => TODOS_LOS_SIGNOS[i].texto);
    if (otroValido) sintomas.push(`Otro: ${otroTexto.trim()}`);
    try {
      await enviarAlerta({ sintomas, notas });
      setEnviado(true);
    } catch (error) {
      toast.error(
        'No se pudo enviar la alerta',
        'Revisa tu conexión e inténtalo de nuevo. Si es urgente, llama al centro de salud.'
      );
    }
  }

  function resetForm() {
    setEnviado(false);
    setSeleccionados([]);
    setNotas('');
    setOtroActivo(false);
    setOtroTexto('');
  }

  // Fila de síntoma reutilizable (misma anatomía en cada grupo).
  function SignoRow({ index }: { index: number }) {
    const signo = TODOS_LOS_SIGNOS[index];
    const isSelected = seleccionados.includes(index);
    return (
      <TouchableOpacity
        style={[styles.signoRow, isSelected && styles.signoRowSelected]}
        onPress={() => toggleSigno(index)}
        activeOpacity={0.7}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={signo.texto}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <CheckCircle size={18} color={commonColors.surface} />}
        </View>
        <SignoIcon name={signo.icono} color={isSelected ? semanticColors.danger : commonColors.textSecondary} />
        <Text style={[styles.signoText, isSelected && styles.signoTextSelected]}>{signo.texto}</Text>
      </TouchableOpacity>
    );
  }

  const confirmView = (
    <View style={styles.confirmContainer}>
      <View style={styles.confirmIconWrap}>
        <CheckCircle size={48} color={semanticColors.success} />
      </View>
      <Text style={styles.confirmTitle}>Alerta enviada</Text>
      <Text style={styles.confirmSubtitle}>Tu obstetra ha sido notificada y se pondrá en contacto contigo a la brevedad.</Text>

      <View style={styles.confirmList}>
        <Text style={styles.confirmListLabel}>Síntomas reportados:</Text>
        {seleccionados.map((i) => (
          <View key={i} style={styles.confirmItem}>
            <SignoIcon name={TODOS_LOS_SIGNOS[i].icono} color={commonColors.textSecondary} />
            <Text style={styles.confirmItemText}>{TODOS_LOS_SIGNOS[i].texto}</Text>
          </View>
        ))}
        {otroValido && (
          <View style={styles.confirmItem}>
            <MoreHorizontal size={20} color={commonColors.textSecondary} />
            <Text style={styles.confirmItemText}>{otroTexto.trim()}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={styles.emergencyCard} onPress={() => Linking.openURL('tel:083421800')}>
        <View style={styles.emergencyIconWrap}>
          <Phone size={24} color={commonColors.surface} />
        </View>
        <View style={styles.emergencyInfo}>
          <Text style={styles.emergencyLabel}>Si es urgente</Text>
          <Text style={styles.emergencyPhone}>083 – 421800</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
        <Text style={styles.resetBtnText}>Reportar otro síntoma</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.resetBtn} onPress={() => goBack(router, '/(gestante)/(tabs)' as any)}>
        <Text style={styles.resetBtnText}>Volver al inicio</Text>
      </TouchableOpacity>
    </View>
  );

  if (enviado) {
    if (webShell) {
      return (
        <View style={{ flex: 1, backgroundColor: commonColors.background, alignItems: 'center', justifyContent: 'center' }}>
          <WebMaxWidth width="readable">
            {confirmView}
          </WebMaxWidth>
        </View>
      );
    }
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {confirmView}
      </SafeAreaView>
    );
  }

  const mainForm = (
    <ScrollView contentContainerStyle={[styles.scrollContent, webShell && styles.webScrollContent]} showsVerticalScrollIndicator={false}>
      <WebMaxWidth width="readable">
        <Text style={styles.intro}>
          Marca los síntomas que sientes. Solo abre la etapa que te corresponde; tu obstetra recibirá
          el aviso de inmediato.
        </Text>

        <Accordion
          title="Durante el embarazo"
          icon={Baby}
          accentColor={semanticColors.danger}
          count={countEmbarazo}
          defaultOpen
        >
          <View style={styles.groupBody}>
            {SIGNOS_EMBARAZO.map((_, i) => <SignoRow key={i} index={i} />)}
          </View>
        </Accordion>

        <Accordion
          title="Durante el parto"
          icon={HeartPulse}
          accentColor={semanticColors.danger}
          count={countParto}
        >
          <View style={styles.groupBody}>
            {SIGNOS_PARTO.map((_, i) => <SignoRow key={OFFSET_PARTO + i} index={OFFSET_PARTO + i} />)}
          </View>
        </Accordion>

        <Accordion
          title="Después del parto"
          icon={Activity}
          accentColor={semanticColors.danger}
          count={countPostparto}
        >
          <View style={styles.groupBody}>
            {SIGNOS_POSTPARTO.map((_, i) => <SignoRow key={OFFSET_POSTPARTO + i} index={OFFSET_POSTPARTO + i} />)}
          </View>
        </Accordion>

        {/* "Otro síntoma": reporte personalizado para signos no listados. */}
        <Accordion
          title="Otro síntoma"
          icon={MoreHorizontal}
          accentColor={semanticColors.danger}
          count={otroValido ? 1 : 0}
          defaultOpen={otroActivo}
        >
          <View style={styles.groupBody}>
            <TouchableOpacity
              style={[styles.signoRow, otroActivo && styles.signoRowSelected]}
              onPress={() => setOtroActivo((v) => !v)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: otroActivo }}
              accessibilityLabel="Quiero describir otro síntoma"
            >
              <View style={[styles.checkbox, otroActivo && styles.checkboxSelected]}>
                {otroActivo && <CheckCircle size={18} color={commonColors.surface} />}
              </View>
              <MoreHorizontal size={20} color={otroActivo ? semanticColors.danger : commonColors.textSecondary} />
              <Text style={[styles.signoText, otroActivo && styles.signoTextSelected]}>
                Quiero describir otro síntoma
              </Text>
            </TouchableOpacity>
            {otroActivo && (
              <View style={styles.otroFieldWrap}>
                <TextAreaField
                  label="¿Qué sientes?"
                  value={otroTexto}
                  onChangeText={setOtroTexto}
                  placeholder="Describe el síntoma que no aparece en la lista…"
                  numberOfLines={3}
                  themeColor={semanticColors.danger}
                />
              </View>
            )}
          </View>
        </Accordion>

        <View style={styles.notasWrap}>
          <TextAreaField
            label="Información adicional (opcional)"
            value={notas}
            onChangeText={setNotas}
            placeholder="Describe con más detalle cómo te sientes…"
            numberOfLines={4}
            themeColor={semanticColors.danger}
          />
        </View>

        {totalReportes > 0 && (
          <View style={styles.countBox}>
            <Text style={styles.countText}>
              Seleccionaste {totalReportes} síntoma{totalReportes > 1 ? 's' : ''}. Tu obstetra será notificada.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, isPending && styles.sendBtnDisabled]}
          onPress={handleEnviar}
          disabled={isPending}
          accessibilityRole="button"
          accessibilityLabel="Enviar alerta a mi obstetra"
        >
          <Send size={20} color={commonColors.surface} />
          <Text style={styles.sendBtnText}>{isPending ? 'Enviando...' : 'Enviar alerta a mi obstetra'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emergencyCard} onPress={() => Linking.openURL('tel:083421800')}>
          <View style={styles.emergencyIconWrap}>
            <Phone size={24} color={commonColors.surface} />
          </View>
          <View style={styles.emergencyInfo}>
            <Text style={styles.emergencyLabel}>Emergencia — Centro de Salud</Text>
            <Text style={styles.emergencyPhone}>083 – 421800</Text>
          </View>
        </TouchableOpacity>
      </WebMaxWidth>
    </ScrollView>
  );

  if (webShell) {
    return (
      <View style={{ flex: 1, backgroundColor: commonColors.background }}>
        <ScreenLayout
          role="gestante"
          title="Reportar Alarma"
          subtitle="Selecciona los síntomas que presentas"
          accentColor={semanticColors.danger}
          width="readable"
          scroll={false}
        >
          {mainForm}
        </ScreenLayout>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.danger.colors} start={gradients.danger.start} end={gradients.danger.end} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <TouchableOpacity
            onPress={() => goBack(router, '/(gestante)/(tabs)' as any)}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <ArrowLeft size={24} color={commonColors.white} />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 }}>
            <AlertTriangle size={32} color={commonColors.white} />
            <Text style={styles.headerTitle}>Reportar Alarma</Text>
          </View>
          <Text style={styles.headerSubtitle}>Selecciona los síntomas que presentas</Text>
        </SafeAreaView>
      </LinearGradient>

      {mainForm}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: { paddingBottom: spacing.xl, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backBtn: { marginBottom: spacing.sm + 4 },
  headerTitle: { ...typography.h1, color: commonColors.surface },
  headerSubtitle: { ...typography.body, color: commonColors.onColorTextStrong, marginTop: 4 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, marginTop: -24 },
  webScrollContent: { marginTop: 0 },
  intro: { ...typography.bodySm, fontSize: 15, color: commonColors.textSecondary, marginBottom: spacing.md, lineHeight: 21 },
  groupBody: { paddingVertical: spacing.xs },
  signoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  signoRowSelected: { backgroundColor: semanticColors.dangerLight },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: commonColors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: semanticColors.danger, borderColor: semanticColors.danger },
  signoText: { flex: 1, ...typography.bodySm, fontSize: 15, color: commonColors.text },
  signoTextSelected: { color: semanticColors.danger, fontWeight: '600' },
  otroFieldWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  notasWrap: { marginTop: spacing.md },
  countBox: { backgroundColor: semanticColors.dangerLight, borderWidth: 1, borderColor: semanticColors.danger, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.lg },
  countText: { ...typography.bodySm, color: semanticColors.danger, fontWeight: '600', textAlign: 'center' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm + 4, backgroundColor: semanticColors.danger, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginTop: spacing.lg },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { ...typography.button, color: commonColors.surface },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: commonColors.text, borderRadius: borderRadius.xl, padding: spacing.lg, marginTop: spacing.md, gap: spacing.md },
  emergencyIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: commonColors.onColorSurfaceFaint, alignItems: 'center', justifyContent: 'center' },
  emergencyInfo: { flex: 1 },
  emergencyLabel: { ...typography.caption, color: commonColors.textTertiary },
  emergencyPhone: { ...typography.h3, color: commonColors.surface, marginTop: 2 },
  confirmContainer: { flex: 1, padding: spacing.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  confirmIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: semanticColors.successLight, alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { ...typography.h1, color: commonColors.text, textAlign: 'center' },
  confirmSubtitle: { ...typography.body, color: commonColors.textSecondary, textAlign: 'center' },
  confirmList: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, padding: spacing.lg, width: '100%', gap: spacing.sm + 4, borderWidth: 1, borderColor: commonColors.border },
  confirmListLabel: { ...typography.overline, fontWeight: '700', color: commonColors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.sm },
  confirmItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  confirmItemText: { ...typography.bodySm, fontSize: 15, color: commonColors.text, flex: 1 },
  resetBtn: { marginTop: spacing.md, padding: spacing.sm + 4 },
  resetBtnText: { ...typography.bodySm, fontSize: 15, color: commonColors.textSecondary, textDecorationLine: 'underline' },
});
