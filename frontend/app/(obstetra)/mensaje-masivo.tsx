import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../src/utils/navigation';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, Users } from 'lucide-react-native';
import api from '../../src/services/api';
import { confirmAction } from '../../src/utils/confirm';
import { useToast, AppButton } from '../../src/components/ui';
import { TextAreaField } from '../../src/components/ui/Field';
import { useResponsive } from '../../src/theme/responsive';
import { commonColors, obstetraColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { ScreenLayout } from '../../src/components/layout/ScreenLayout';

const BRAND = obstetraColors.primary;

type Trimestre = 0 | 1 | 2 | 3; // 0 = todos
type Riesgo = '' | 'verde' | 'amarillo' | 'rojo';

export default function MensajeMasivoScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
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
      toast.success('Mensaje enviado', `Llegó a ${data?.enviados ?? 0} gestante(s).`);
      goBack(router, '/(obstetra)/(tabs)' as any);
    },
    onError: () => {
      toast.error('No se pudo enviar', 'Inténtalo de nuevo en unos momentos.');
    },
  });

  const enviar = async () => {
    if (!contenido.trim()) {
      return toast.warning('Mensaje vacío', 'Escribe el contenido antes de enviar.');
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
    <ScreenLayout
      role="obstetra"
      title="Mensaje masivo"
      width="full"
      showBack
      accentColor={BRAND}
    >
      <View style={webShell ? styles.twoCol : undefined}>
        <View style={webShell ? styles.col : undefined}>
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
        </View>

        <View style={webShell ? styles.col : undefined}>
          <TextAreaField
            label="Mensaje"
            value={contenido}
            onChangeText={setContenido}
            placeholder="Escribe el mensaje que recibirán las gestantes..."
            numberOfLines={5}
            maxLength={1000}
            themeColor={BRAND}
            helperText={`${contenido.length}/1000`}
          />

          <AppButton
            title="Enviar a gestantes"
            onPress={enviar}
            loading={mutation.isPending}
            disabled={mutation.isPending}
            icon={Users}
            themeColor={BRAND}
            style={StyleSheet.flatten([styles.sendBtn, webShell && styles.sendBtnWeb])}
          />
        </View>
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  iconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: obstetraColors.primaryLight, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16 },
  intro: { ...typography.bodySm, color: commonColors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  label: { ...typography.label, fontWeight: '700', color: commonColors.textSecondary, marginBottom: 10, marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 99, backgroundColor: commonColors.surface, borderWidth: 1, borderColor: commonColors.border },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipText: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  chipTextActive: { color: obstetraColors.onPrimary },
  sendBtn: { marginTop: spacing.lg },
  sendBtnWeb: {
    maxWidth: 320,
    alignSelf: 'flex-end',
  },
  twoCol: {
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'flex-start',
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
});
