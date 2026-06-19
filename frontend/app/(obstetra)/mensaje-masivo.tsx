import React, { useState } from 'react';
import {
  View, StyleSheet, Text, TextInput, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { ChevronLeft, Megaphone, Users } from 'lucide-react-native';
import api from '../../src/services/api';
import { confirmAction, notify } from '../../src/utils/confirm';
import { commonColors, obstetraColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { WebMaxWidth } from '../../src/components/web';

const BRAND = obstetraColors.primary;

type Trimestre = 0 | 1 | 2 | 3; // 0 = todos
type Riesgo = '' | 'verde' | 'amarillo' | 'rojo';

export default function MensajeMasivoScreen(): React.ReactElement {
  const router = useRouter();
  const [contenido, setContenido] = useState('');
  const [trimestre, setTrimestre] = useState<Trimestre>(0);
  const [riesgo, setRiesgo] = useState<Riesgo>('');

  const mutation = useMutation({
    mutationFn: async () => {
      const body: any = { contenido: contenido.trim() };
      if (trimestre !== 0) body.trimestre = trimestre;
      if (riesgo) body.nivelRiesgo = riesgo;
      const res = await api.post('/chat/broadcast', body);
      return res.data?.data;
    },
    onSuccess: (data) => {
      Alert.alert(
        'Mensaje enviado',
        `Se envió el mensaje a ${data?.enviados ?? 0} gestante(s).`,
        [{ text: 'Listo', onPress: () => router.back() }]
      );
    },
    onError: () => {
      Alert.alert('Error', 'No se pudo enviar el mensaje masivo. Inténtalo de nuevo.');
    },
  });

  const enviar = async () => {
    if (!contenido.trim()) {
      return notify('Mensaje vacío', 'Escribe el contenido del mensaje antes de enviar.');
    }
    const filtros: string[] = [];
    if (trimestre !== 0) filtros.push(`${trimestre}° trimestre`);
    if (riesgo) filtros.push(`riesgo ${riesgo}`);
    const destino = filtros.length ? filtros.join(', ') : 'todas las gestantes activas';
    const ok = await confirmAction({
      title: 'Confirmar envío',
      message: `El mensaje se enviará a: ${destino}.`,
      confirmText: 'Enviar',
    });
    if (!ok) return;
    mutation.mutate();
  };

  const Chip = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <SafeAreaView edges={['top']}>
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <ChevronLeft size={24} color={commonColors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mensaje masivo</Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WebMaxWidth width="readable">
        <View style={styles.iconWrap}>
          <Megaphone size={28} color={BRAND} />
        </View>
        <Text style={styles.intro}>
          Envía un aviso a un grupo de gestantes (cambios de horario, campañas, jornadas de salud).
        </Text>

        <Text style={styles.label}>Filtrar por trimestre</Text>
        <View style={styles.chipRow}>
          <Chip label="Todas" active={trimestre === 0} onPress={() => setTrimestre(0)} />
          <Chip label="1°" active={trimestre === 1} onPress={() => setTrimestre(1)} />
          <Chip label="2°" active={trimestre === 2} onPress={() => setTrimestre(2)} />
          <Chip label="3°" active={trimestre === 3} onPress={() => setTrimestre(3)} />
        </View>

        <Text style={styles.label}>Filtrar por riesgo</Text>
        <View style={styles.chipRow}>
          <Chip label="Todos" active={riesgo === ''} onPress={() => setRiesgo('')} />
          <Chip label="Verde" active={riesgo === 'verde'} onPress={() => setRiesgo('verde')} />
          <Chip label="Amarillo" active={riesgo === 'amarillo'} onPress={() => setRiesgo('amarillo')} />
          <Chip label="Rojo" active={riesgo === 'rojo'} onPress={() => setRiesgo('rojo')} />
        </View>

        <Text style={styles.label}>Mensaje</Text>
        <TextInput
          style={styles.textArea}
          value={contenido}
          onChangeText={setContenido}
          placeholder="Escribe el mensaje que recibirán las gestantes..."
          placeholderTextColor={commonColors.textTertiary}
          multiline
          numberOfLines={5}
          maxLength={1000}
          textAlignVertical="top"
        />
        <Text style={styles.counter}>{contenido.length}/1000</Text>

        <TouchableOpacity
          style={[styles.sendBtn, mutation.isPending && styles.sendBtnDisabled]}
          onPress={enviar}
          disabled={mutation.isPending}
          activeOpacity={0.85}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={obstetraColors.onPrimary} size="small" />
          ) : (
            <>
              <Users size={18} color={obstetraColors.onPrimary} />
              <Text style={styles.sendBtnText}>Enviar a gestantes</Text>
            </>
          )}
        </TouchableOpacity>
        </WebMaxWidth>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: commonColors.background },
  headerNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surface },
  headerTitle: { ...typography.h3, color: commonColors.text },
  content: { padding: 20, paddingBottom: 48 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  intro: { ...typography.bodySmall, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  label: { ...typography.label, fontWeight: '700', color: commonColors.textSecondary, marginBottom: 10, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  chipTextActive: { color: obstetraColors.onPrimary },
  textArea: { backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border, borderRadius: 16, padding: 16, minHeight: 130, ...typography.bodySmall, fontSize: 15, color: commonColors.text },
  counter: { ...typography.caption, color: commonColors.textTertiary, textAlign: 'right', marginTop: 6 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: BRAND, borderRadius: 99, paddingVertical: 16, marginTop: 24 },
  sendBtnDisabled: { opacity: 0.7 },
  sendBtnText: { ...typography.button, fontSize: 16, color: obstetraColors.onPrimary },
});
