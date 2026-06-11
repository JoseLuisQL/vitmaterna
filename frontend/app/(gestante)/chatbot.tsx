import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, Text, ScrollView, TouchableOpacity, Linking, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Bot, Phone, AlertTriangle, MessageCircle } from 'lucide-react-native';
import api from '../../src/services/api';
import { typography } from '../../src/theme/typography';

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
  u === 'grave' ? '#DC2626' : u === 'moderada' ? '#D97706' : '#059669';

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
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTitleWrap}>
              <Bot size={22} color="#FFFFFF" />
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
            <View style={styles.callIcon}><Phone size={22} color="#FFFFFF" /></View>
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
                <MessageCircle size={16} color="#7C3AED" />
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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { backgroundColor: '#7C3AED', borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  safeAreaHeader: { paddingHorizontal: 16, paddingBottom: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
  chatContent: { padding: 20, paddingBottom: 12 },
  bubble: { maxWidth: '85%', padding: 14, borderRadius: 20, marginBottom: 12 },
  bubbleBot: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  bubbleBotText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', lineHeight: 22 },
  bubbleUser: { alignSelf: 'flex-end', backgroundColor: '#7C3AED', borderBottomRightRadius: 4 },
  bubbleUserText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#FFFFFF', lineHeight: 22 },
  resultCard: { backgroundColor: '#FFFFFF', borderRadius: 16, borderLeftWidth: 4, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  urgenciaBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, marginBottom: 8 },
  urgenciaText: { fontFamily: typography.caption.fontFamily, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  resultText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, color: '#0F172A', lineHeight: 22 },
  callCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#DC2626', borderRadius: 18, padding: 16, marginBottom: 8 },
  callIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  callLabel: { fontFamily: typography.caption.fontFamily, fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  callPhone: { fontFamily: typography.h2.fontFamily, fontSize: 20, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  optionsWrap: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 28, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 8 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F5F3FF', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  optionText: { flex: 1, fontFamily: typography.bodyMedium.fontFamily, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  resetBtn: { backgroundColor: '#7C3AED', borderRadius: 99, paddingVertical: 14, alignItems: 'center' },
  resetBtnText: { fontFamily: typography.bodyMedium.fontFamily, fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  disclaimer: { fontFamily: typography.caption.fontFamily, fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12, lineHeight: 17 },
});