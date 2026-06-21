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
import { commonColors, obstetraColors, riskColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';
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

  const Chip = ({ label, active, onPress, dot }: { label: string; active: boolean; onPress: () => void; dot?: string }) => (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot }]} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  // Resumen del público objetivo (claridad antes de enviar).
  const filtros: string[] = [];
  if (trimestre !== 0) filtros.push(`${trimestre}° trimestre`);
  if (riesgo) filtros.push(`riesgo ${riesgo}`);
  const destino = filtros.length ? filtros.join(' · ') : 'Todas las gestantes activas';

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
            <Chip label="Bajo" active={riesgo === 'verde'} onPress={() => setRiesgo('verde')} dot={riskColors.riskGreen} />
            <Chip label="Medio" active={riesgo === 'amarillo'} onPress={() => setRiesgo('amarillo')} dot={riskColors.riskYellow} />
            <Chip label="Alto" active={riesgo === 'rojo'} onPress={() => setRiesgo('rojo')} dot={riskColors.riskRed} />
          </View>

          {/* Público objetivo: claridad de a quién llega el aviso. */}
          <View style={styles.audienceCard}>
            <Users size={16} color={BRAND} />
            <View style={{ flex: 1 }}>
              <Text style={styles.audienceLabel}>Se enviará a</Text>
              <Text style={styles.audienceValue} numberOfLines={2}>{destino}</Text>
            </View>
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.full, backgroundColor: commonColors.surfaceAlt, borderWidth: 1, borderColor: commonColors.border },
  chipActive: { backgroundColor: BRAND, borderColor: BRAND },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  chipTextActive: { color: obstetraColors.onPrimary },
  audienceCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: obstetraColors.primaryLight, borderRadius: borderRadius.md, padding: spacing.md, marginTop: spacing.xs },
  audienceLabel: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  audienceValue: { ...typography.bodySm, color: commonColors.text, fontWeight: '600', textTransform: 'capitalize', marginTop: 1 },
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
