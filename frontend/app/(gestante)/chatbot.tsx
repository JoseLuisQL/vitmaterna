import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Bot, Phone, AlertTriangle, MessageCircle } from 'lucide-react-native';
import api from '../../src/services/api';
import { gestanteColors, commonColors, semanticColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const BRAND = gestanteColors.primary;

const TEL_EMERGENCIA = '083421800';

type Urgencia = 'grave' | 'moderada' | 'leve';

interface SintomaOpcion {
  texto: string;
  urgencia: Urgencia;
  consejo: string;
}

// Triage local basado en los signos de alarma del MINSA (RF-9.02).
const SINTOMAS: SintomaOpcion[] = [
  {
    texto: 'Sangrado vaginal',
    urgencia: 'grave',
    consejo: 'El sangrado puede ser una señal grave. Acude al centro de salud o llama a emergencia AHORA. No esperes.',
  },
  {
    texto: 'El bebé no se mueve',
    urgencia: 'grave',
    consejo: 'La ausencia de movimientos fetales requiere evaluación inmediata. Acude al establecimiento de salud de inmediato.',
  },
  {
    texto: 'Pérdida de líquido por la vagina',
    urgencia: 'grave',
    consejo: 'Podría tratarse de ruptura de fuente. Acude al centro de salud lo antes posible.',
  },
  {
    texto: 'Dolor de cabeza fuerte y visión borrosa',
    urgencia: 'grave',
    consejo: 'Estos síntomas pueden indicar preeclampsia. Es una urgencia: acude al centro de salud de inmediato.',
  },
  {
    texto: 'Fiebre alta',
    urgencia: 'moderada',
    consejo: 'Una fiebre alta debe evaluarse pronto. Comunícate con tu obstetra hoy mismo y mantente hidratada.',
  },
  {
    texto: 'Vómitos frecuentes e intensos',
    urgencia: 'moderada',
    consejo: 'Los vómitos intensos pueden deshidratarte. Toma líquidos en pequeños sorbos y contacta a tu obstetra hoy.',
  },
  {
    texto: 'Hinchazón de manos, pies o cara',
    urgencia: 'moderada',
    consejo: 'La hinchazón repentina debe revisarse. Coordina una consulta con tu obstetra lo antes posible.',
  },
  {
    texto: 'Náuseas leves o cansancio',
    urgencia: 'leve',
    consejo: 'Son molestias frecuentes del embarazo. Descansa, aliméntate bien e hidrátate. Coméntalo en tu próximo control.',
  },
  {
    texto: 'Dudas sobre mis suplementos',
    urgencia: 'leve',
    consejo: 'Puedes revisar la sección de Educación o escribir a tu obstetra desde el chat para resolver tus dudas.',
  },
];

interface BurbujaBot {
  tipo: 'bot' | 'usuario' | 'resultado';
  texto: string;
  urgencia?: Urgencia;
}

const colorUrgencia = (u: Urgencia) =>
  u === 'grave' ? semanticColors.danger : u === 'moderada' ? semanticColors.warning : semanticColors.success;

const etiquetaUrgencia = (u: Urgencia) =>
  u === 'grave' ? 'URGENTE' : u === 'moderada' ? 'ATENCIÓN PRONTA' : 'LEVE';

export default function ChatbotScreen(): React.ReactElement {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [mensajes, setMensajes] = useState<BurbujaBot[]>([
    {
      tipo: 'bot',
      texto: 'Hola, soy tu asistente de orientación. Disponible las 24 horas. ¿Qué síntoma o duda tienes? Selecciona una opción.',
    },
  ]);
  const [seleccionado, setSeleccionado] = useState<SintomaOpcion | null>(null);

  const alertaMutation = useMutation({
    mutationFn: async (sintoma: SintomaOpcion) => {
      await api.post('/clinical/danger-signs', {
        tipo_signo: sintoma.texto,
        descripcion: 'Reportado vía asistente de orientación (chatbot)',
        severidad: sintoma.urgencia === 'grave' ? 'grave' : 'moderado',
      });
    },
  });

  const scrollAbajo = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const elegir = (s: SintomaOpcion) => {
    setSeleccionado(s);
    setMensajes((prev) => [
      ...prev,
      { tipo: 'usuario', texto: s.texto },
      { tipo: 'resultado', texto: s.consejo, urgencia: s.urgencia },
    ]);
    scrollAbajo();
    // Si es grave o moderada, se notifica al obstetra automáticamente.
    if (s.urgencia !== 'leve') {
      alertaMutation.mutate(s, {
        onSuccess: () => {
          setMensajes((prev) => [
            ...prev,
            { tipo: 'bot', texto: 'He avisado a tu obstetra sobre este síntoma para que pueda dar seguimiento.' },
          ]);
          scrollAbajo();
        },
        onError: () => {
          setMensajes((prev) => [
            ...prev,
            { tipo: 'bot', texto: 'No pude avisar a tu obstetra automáticamente. Si es urgente, llama al centro de salud.' },
          ]);
          scrollAbajo();
        },
      });
    }
  };

  const reiniciar = () => {
    setSeleccionado(null);
    setMensajes([
      { tipo: 'bot', texto: '¿Tienes otro síntoma o duda? Selecciona una opción.' },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.safeAreaHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
              <ArrowLeft size={24} color={commonColors.surface} />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Bot size={22} color={commonColors.surface} />
              <Text style={styles.headerTitle}>Asistente 24/7</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>
          <Text style={styles.headerSubtitle}>Orientación rápida de síntomas</Text>
        </SafeAreaView>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {mensajes.map((m, i) => {
          if (m.tipo === 'usuario') {
            return (
              <View key={i} style={[styles.bubble, styles.bubbleUser]}>
                <Text style={styles.bubbleUserText}>{m.texto}</Text>
              </View>
            );
          }
          if (m.tipo === 'resultado') {
            const c = colorUrgencia(m.urgencia!);
            return (
              <View key={i} style={[styles.resultCard, { borderLeftColor: c }]}>
                <View style={[styles.urgenciaBadge, { backgroundColor: c + '15' }]}>
                  <AlertTriangle size={14} color={c} />
                  <Text style={[styles.urgenciaText, { color: c }]}>{etiquetaUrgencia(m.urgencia!)}</Text>
                </View>
                <Text style={styles.resultText}>{m.texto}</Text>
              </View>
            );
          }
          return (
            <View key={i} style={[styles.bubble, styles.bubbleBot]}>
              <Text style={styles.bubbleBotText}>{m.texto}</Text>
            </View>
          );
        })}

        {/* Botón de llamada cuando hay urgencia grave/moderada */}
        {seleccionado && seleccionado.urgencia !== 'leve' && (
          <TouchableOpacity style={styles.callCard} onPress={() => Linking.openURL(`tel:${TEL_EMERGENCIA}`)}>
            <View style={styles.callIcon}><Phone size={22} color={commonColors.surface} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.callLabel}>Llamar al Centro de Salud</Text>
              <Text style={styles.callPhone}>083 – 421800</Text>
            </View>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Opciones de síntomas */}
      <View style={styles.optionsWrap}>
        {!seleccionado ? (
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 260 }}>
            {SINTOMAS.map((s) => (
              <TouchableOpacity key={s.texto} style={styles.optionBtn} onPress={() => elegir(s)} activeOpacity={0.7}>
                <MessageCircle size={16} color={BRAND} />
                <Text style={styles.optionText}>{s.texto}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <TouchableOpacity style={styles.resetBtn} onPress={reiniciar} activeOpacity={0.8}>
            <Text style={styles.resetBtnText}>Consultar otro síntoma</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.disclaimer}>
          Esta orientación no reemplaza la atención médica. Ante cualquier duda, acude al centro de salud.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  header: { backgroundColor: BRAND, borderBottomLeftRadius: borderRadius.xl, borderBottomRightRadius: borderRadius.xl },
  safeAreaHeader: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerTitle: { ...typography.h3, color: commonColors.surface },
  headerSubtitle: { ...typography.bodySmall, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
  chatContent: { padding: spacing.lg, paddingBottom: spacing.sm + 4 },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: borderRadius.lg, marginBottom: spacing.sm + 4 },
  bubbleBot: { alignSelf: 'flex-start', backgroundColor: commonColors.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: commonColors.border },
  bubbleBotText: { ...typography.bodySmall, fontSize: 15, color: commonColors.text, lineHeight: 22 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: BRAND, borderBottomRightRadius: 4 },
  bubbleUserText: { ...typography.bodySmall, fontSize: 15, color: commonColors.surface, lineHeight: 22 },
  resultCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.lg, borderLeftWidth: 4, padding: spacing.md, marginBottom: spacing.sm + 4, borderWidth: 1, borderColor: commonColors.border },
  urgenciaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full, marginBottom: spacing.sm },
  urgenciaText: { ...typography.overline, fontWeight: '800', letterSpacing: 0.5 },
  resultText: { ...typography.bodySmall, fontSize: 15, color: commonColors.text, lineHeight: 22 },
  callCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: semanticColors.danger, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm },
  callIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  callLabel: { ...typography.caption, color: 'rgba(255,255,255,0.85)' },
  callPhone: { ...typography.h3, color: commonColors.surface, marginTop: 2 },
  optionsWrap: { backgroundColor: commonColors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderColor: commonColors.border },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, backgroundColor: gestanteColors.primaryLight, borderRadius: borderRadius.md, paddingHorizontal: spacing.md, paddingVertical: 14, marginBottom: spacing.sm },
  optionText: { flex: 1, ...typography.label, color: commonColors.text },
  resetBtn: { backgroundColor: BRAND, borderRadius: borderRadius.full, paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { ...typography.button, fontSize: 15, color: commonColors.surface },
  disclaimer: { ...typography.overline, fontWeight: typography.caption.fontWeight, letterSpacing: 0, color: commonColors.textTertiary, textAlign: 'center', marginTop: spacing.sm + 4, lineHeight: 17 },
});