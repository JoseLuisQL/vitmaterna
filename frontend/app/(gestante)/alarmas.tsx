import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  Linking, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Send, CheckCircle, Phone,
  Frown, Thermometer, Activity, Droplets, Droplet,
  Baby, Zap, Eye, AlertCircle, Clock, Users, HeartPulse, ArrowLeft,
} from 'lucide-react-native';
import { reportDangerSign } from '../../src/services/api-queries';
import { notify } from '../../src/utils/confirm';
import { gradients } from '../../src/theme/gradients';
import { commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const SIGNOS_EMBARAZO = [
  { icono: 'Frown', texto: 'Vómitos frecuentes e intensos' },
  { icono: 'Thermometer', texto: 'Dolor de cabeza fuerte, fiebre o calentura' },
  { icono: 'Activity', texto: 'Pies, manos o cara hinchada' },
  { icono: 'Droplets', texto: 'Pérdida de sangre por sus partes' },
  { icono: 'Droplet', texto: 'Pérdida de líquido por sus partes' },
  { icono: 'Baby', texto: 'El bebé no se mueve' },
  { icono: 'Zap', texto: 'Dolores antes de la fecha de parto' },
  { icono: 'Eye', texto: 'Visión borrosa o manchas en los ojos' },
];

const SIGNOS_PARTO = [
  { icono: 'Droplet', texto: 'Pérdida de líquido por más de 6 horas' },
  { icono: 'Baby', texto: 'El niño viene de pies o atravesado' },
  { icono: 'Users', texto: 'Son gemelos o mellizos' },
  { icono: 'Droplets', texto: 'Hemorragia vaginal abundante' },
  { icono: 'AlertCircle', texto: 'Salida del cordón por la vagina' },
  { icono: 'Clock', texto: 'La placenta no sale por más de 30 minutos' },
];

const SIGNOS_POSTPARTO = [
  { icono: 'Droplets', texto: 'Sangrado vaginal abundante' },
  { icono: 'Thermometer', texto: 'Fiebre, escalofríos y mal olor' },
  { icono: 'Activity', texto: 'Hinchazón y dolor de manos' },
  { icono: 'AlertCircle', texto: 'La placenta no salió completa' },
];

const TODOS_LOS_SIGNOS = [
  ...SIGNOS_EMBARAZO, ...SIGNOS_PARTO, ...SIGNOS_POSTPARTO
];

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
  const [seleccionados, setSeleccionados] = useState<number[]>([]);
  const [notas, setNotas] = useState('');
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

  async function handleEnviar() {
    if (seleccionados.length === 0) {
      notify('Seleccione síntomas', 'Por favor marque al menos un síntoma antes de enviar.');
      return;
    }
    const sintomas = seleccionados.map((i) => TODOS_LOS_SIGNOS[i].texto);
    try {
      await enviarAlerta({ sintomas, notas });
      setEnviado(true);
    } catch (error) {
      notify(
        'No se pudo enviar la alerta',
        'Ocurrió un problema al enviar tus síntomas. Revisa tu conexión e inténtalo de nuevo. Si es urgente, llama al centro de salud.'
      );
    }
  }

  if (enviado) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
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

          <TouchableOpacity style={styles.resetBtn} onPress={() => { setEnviado(false); setSeleccionados([]); setNotas(''); }}>
            <Text style={styles.resetBtnText}>Reportar otro síntoma</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={() => router.back()}>
            <Text style={styles.resetBtnText}>Volver al inicio</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.danger.colors} start={gradients.danger.start} end={gradients.danger.end} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.groupTitle}>Durante el Embarazo</Text>
        <View style={styles.signosCard}>
          {SIGNOS_EMBARAZO.map((signo, i) => {
            const isSelected = seleccionados.includes(i);
            return (
              <TouchableOpacity key={i} style={[styles.signoRow, isSelected && styles.signoRowSelected]} onPress={() => toggleSigno(i)} activeOpacity={0.7}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <CheckCircle size={18} color={commonColors.surface} />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? semanticColors.danger : commonColors.textSecondary} />
                <Text style={[styles.signoText, isSelected && styles.signoTextSelected]}>{signo.texto}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.groupTitle}>Durante el Parto</Text>
        <View style={styles.signosCard}>
          {SIGNOS_PARTO.map((signo, i) => {
            const idx = SIGNOS_EMBARAZO.length + i;
            const isSelected = seleccionados.includes(idx);
            return (
              <TouchableOpacity key={idx} style={[styles.signoRow, isSelected && styles.signoRowSelected]} onPress={() => toggleSigno(idx)} activeOpacity={0.7}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <CheckCircle size={18} color={commonColors.surface} />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? semanticColors.danger : commonColors.textSecondary} />
                <Text style={[styles.signoText, isSelected && styles.signoTextSelected]}>{signo.texto}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.groupTitle}>Después del Parto</Text>
        <View style={styles.signosCard}>
          {SIGNOS_POSTPARTO.map((signo, i) => {
            const idx = SIGNOS_EMBARAZO.length + SIGNOS_PARTO.length + i;
            const isSelected = seleccionados.includes(idx);
            return (
              <TouchableOpacity key={idx} style={[styles.signoRow, isSelected && styles.signoRowSelected]} onPress={() => toggleSigno(idx)} activeOpacity={0.7}>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <CheckCircle size={18} color={commonColors.surface} />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? semanticColors.danger : commonColors.textSecondary} />
                <Text style={[styles.signoText, isSelected && styles.signoTextSelected]}>{signo.texto}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.groupTitle}>Información adicional (opcional)</Text>
        <TextInput
          style={styles.textArea}
          value={notas}
          onChangeText={setNotas}
          multiline
          numberOfLines={4}
          placeholder="Describa con más detalle cómo se siente..."
          placeholderTextColor={commonColors.textTertiary}
          textAlignVertical="top"
        />

        {seleccionados.length > 0 && (
          <View style={styles.countBox}>
            <Text style={styles.countText}>Seleccionaste {seleccionados.length} síntoma(s). Tu obstetra será notificada.</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.sendBtn, isPending && styles.sendBtnDisabled]} onPress={handleEnviar} disabled={isPending}>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerGradient: { paddingBottom: spacing.xl, borderBottomLeftRadius: borderRadius.xxl, borderBottomRightRadius: borderRadius.xxl },
  safeAreaHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backBtn: { marginBottom: spacing.sm + 4 },
  headerTitle: { ...typography.h1, color: commonColors.surface },
  headerSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl, marginTop: -24 },
  groupTitle: { ...typography.overline, fontWeight: '700', color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginTop: spacing.md, marginLeft: spacing.md },
  signosCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, paddingVertical: spacing.sm, borderWidth: 1, borderColor: commonColors.border },
  signoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: commonColors.borderLight },
  signoRowSelected: { backgroundColor: semanticColors.dangerLight },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: commonColors.border, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: semanticColors.danger, borderColor: semanticColors.danger },
  signoText: { flex: 1, ...typography.bodySmall, fontSize: 15, color: commonColors.text },
  signoTextSelected: { color: semanticColors.danger, fontWeight: '600' },
  textArea: { backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, borderRadius: borderRadius.xl, padding: spacing.lg, ...typography.bodySmall, fontSize: 15, color: commonColors.text, minHeight: 120, marginTop: spacing.sm },
  countBox: { backgroundColor: semanticColors.dangerLight, borderWidth: 1, borderColor: semanticColors.danger, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.lg },
  countText: { ...typography.bodySmall, color: semanticColors.danger, fontWeight: '600', textAlign: 'center' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm + 4, backgroundColor: semanticColors.danger, borderRadius: borderRadius.full, paddingVertical: spacing.md, marginTop: spacing.lg },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { ...typography.button, color: commonColors.surface },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: commonColors.text, borderRadius: borderRadius.xl, padding: spacing.lg, marginTop: spacing.md, gap: spacing.md },
  emergencyIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
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
  confirmItemText: { ...typography.bodySmall, fontSize: 15, color: commonColors.text, flex: 1 },
  resetBtn: { marginTop: spacing.md, padding: spacing.sm + 4 },
  resetBtnText: { ...typography.bodySmall, fontSize: 15, color: commonColors.textSecondary, textDecorationLine: 'underline' },
});
