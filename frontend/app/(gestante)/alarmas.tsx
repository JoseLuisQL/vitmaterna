import React, { useState } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity,
  Alert, Linking, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Send, CheckCircle, Phone,
  Frown, Thermometer, Activity, Droplets, Droplet,
  Baby, Zap, Eye, AlertCircle, Clock, Users, HeartPulse, ArrowLeft,
} from 'lucide-react-native';
import api from '../../src/services/api';
import { typography } from '../../src/theme/typography';

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
      // Se envían en serie para que cada uno quede trazable para el obstetra.
      for (const sintoma of sintomas) {
        await api.post('/clinical/danger-signs', {
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
      Alert.alert('Seleccione síntomas', 'Por favor marque al menos un síntoma antes de enviar.');
      return;
    }
    const sintomas = seleccionados.map((i) => TODOS_LOS_SIGNOS[i].texto);
    try {
      await enviarAlerta({ sintomas, notas });
      setEnviado(true);
    } catch (error) {
      Alert.alert(
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
            <CheckCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.confirmTitle}>Alerta enviada</Text>
          <Text style={styles.confirmSubtitle}>Tu obstetra ha sido notificada y se pondrá en contacto contigo a la brevedad.</Text>

          <View style={styles.confirmList}>
            <Text style={styles.confirmListLabel}>Síntomas reportados:</Text>
            {seleccionados.map((i) => (
              <View key={i} style={styles.confirmItem}>
                <SignoIcon name={TODOS_LOS_SIGNOS[i].icono} color="#64748B" />
                <Text style={styles.confirmItemText}>{TODOS_LOS_SIGNOS[i].texto}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.emergencyCard} onPress={() => Linking.openURL('tel:083421800')}>
            <View style={styles.emergencyIconWrap}>
              <Phone size={24} color="#FFFFFF" />
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
      <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.headerGradient}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={32} color="#FFFFFF" />
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
                  {isSelected && <CheckCircle size={18} color="#FFFFFF" />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? '#EF4444' : '#64748B'} />
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
                  {isSelected && <CheckCircle size={18} color="#FFFFFF" />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? '#EF4444' : '#64748B'} />
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
                  {isSelected && <CheckCircle size={18} color="#FFFFFF" />}
                </View>
                <SignoIcon name={signo.icono} color={isSelected ? '#EF4444' : '#64748B'} />
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
          placeholderTextColor="#94A3B8"
          textAlignVertical="top"
        />

        {seleccionados.length > 0 && (
          <View style={styles.countBox}>
            <Text style={styles.countText}>Seleccionaste {seleccionados.length} síntoma(s). Tu obstetra será notificada.</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.sendBtn, isPending && styles.sendBtnDisabled]} onPress={handleEnviar} disabled={isPending}>
          <Send size={20} color="#FFFFFF" />
          <Text style={styles.sendBtnText}>{isPending ? 'Enviando...' : 'Enviar alerta a mi obstetra'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.emergencyCard} onPress={() => Linking.openURL('tel:083421800')}>
          <View style={styles.emergencyIconWrap}>
            <Phone size={24} color="#FFFFFF" />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { paddingBottom: 40, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  safeAreaHeader: { paddingHorizontal: 24, paddingTop: 16 },
  backBtn: { marginBottom: 12 },
  headerTitle: { fontFamily: typography.h1.fontFamily, fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 48, marginTop: -24 },
  groupTitle: { fontFamily: typography.caption.fontFamily, fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16, marginLeft: 16 },
  signosCard: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  signoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  signoRowSelected: { backgroundColor: '#FEF2F2' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  signoText: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A' },
  signoTextSelected: { color: '#B91C1C', fontWeight: '600' },
  textArea: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 24, padding: 20, fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', minHeight: 120, marginTop: 8 },
  countBox: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 16, padding: 16, marginTop: 24 },
  countText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: '#B91C1C', fontWeight: '600', textAlign: 'center' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#EF4444', borderRadius: 99, paddingVertical: 16, marginTop: 24, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  emergencyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 24, padding: 20, marginTop: 16, gap: 16 },
  emergencyIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  emergencyInfo: { flex: 1 },
  emergencyLabel: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: '#94A3B8' },
  emergencyPhone: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  confirmContainer: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 20 },
  confirmIconWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  confirmTitle: { fontFamily: typography.h1.fontFamily, fontSize: 28, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  confirmSubtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 16, color: '#64748B', textAlign: 'center', lineHeight: 24 },
  confirmList: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, width: '100%', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 4 },
  confirmListLabel: { fontFamily: typography.caption.fontFamily, fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 8 },
  confirmItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmItemText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', flex: 1 },
  resetBtn: { marginTop: 16, padding: 12 },
  resetBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#64748B', textDecorationLine: 'underline' },
});
