/**
 * VITMATERNA — Mensaje masivo (obstetra).
 *
 * Permite enviar un aviso a un grupo de gestantes filtrando por trimestre y
 * nivel de riesgo. Rediseño profesional y consistente con el sistema:
 *   - Secciones claras con SectionCard (Destinatarios · Mensaje).
 *   - Segmentos de filtro en rejilla uniforme (alineados, misma altura).
 *   - Tarjeta de "público objetivo" siempre visible, con recuento de filtros.
 *   - Web: dos columnas (configuración + panel de envío "pegajoso"); móvil:
 *     una columna con CTA fijo abajo. Solo tokens del tema.
 */
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { Megaphone, Users, Send, CalendarRange, Activity } from 'lucide-react-native';
import { goBack } from '../../src/utils/navigation';
import api from '../../src/services/api';
import { confirmAction } from '../../src/utils/confirm';
import { useToast, AppButton } from '../../src/components/ui';
import { TextAreaField } from '../../src/components/ui/Field';
import { SectionCard } from '../../src/components/patterns/SectionCard';
import { ScreenLayout } from '../../src/components/layout/ScreenLayout';
import { useResponsive } from '../../src/theme/responsive';
import { commonColors, obstetraColors, riskColors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

const BRAND = obstetraColors.primary;
const MAX = 1000;

type Trimestre = 0 | 1 | 2 | 3; // 0 = todas
type Riesgo = '' | 'verde' | 'amarillo' | 'rojo';

interface Segment<T> {
  value: T;
  label: string;
  dot?: string;
}

const TRIMESTRES: Segment<Trimestre>[] = [
  { value: 0, label: 'Todas' },
  { value: 1, label: '1.er' },
  { value: 2, label: '2.º' },
  { value: 3, label: '3.er' },
];

const RIESGOS: Segment<Riesgo>[] = [
  { value: '', label: 'Todos' },
  { value: 'verde', label: 'Bajo', dot: riskColors.riskGreen },
  { value: 'amarillo', label: 'Medio', dot: riskColors.riskYellow },
  { value: 'rojo', label: 'Alto', dot: riskColors.riskRed },
];

export default function MensajeMasivoScreen(): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { webShell } = useResponsive();
  const [contenido, setContenido] = useState('');
  const [trimestre, setTrimestre] = useState<Trimestre>(0);
  const [riesgo, setRiesgo] = useState<Riesgo>('');

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = { contenido: contenido.trim() };
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

  // Resumen del público objetivo (claridad antes de enviar).
  const { destino, filtrosActivos } = useMemo(() => {
    const trimestreLabel: Record<Trimestre, string> = {
      0: '',
      1: '1.er trimestre',
      2: '2.º trimestre',
      3: '3.er trimestre',
    };
    const riesgoLabel: Record<Riesgo, string> = {
      '': '',
      verde: 'riesgo bajo',
      amarillo: 'riesgo medio',
      rojo: 'riesgo alto',
    };
    const filtros = [trimestreLabel[trimestre], riesgoLabel[riesgo]].filter(Boolean);
    return {
      destino: filtros.length ? filtros.join(' · ') : 'Todas las gestantes activas',
      filtrosActivos: filtros.length,
    };
  }, [trimestre, riesgo]);

  const remaining = MAX - contenido.length;
  const canSend = contenido.trim().length > 0 && !mutation.isPending;

  const enviar = async () => {
    if (!contenido.trim()) {
      return toast.warning('Mensaje vacío', 'Escribe el contenido antes de enviar.');
    }
    const ok = await confirmAction({
      title: 'Confirmar envío',
      message: `El mensaje se enviará a: ${destino.toLowerCase()}.`,
      confirmText: 'Enviar',
    });
    if (!ok) return;
    mutation.mutate();
  };

  // ── Rejilla de segmentos (filtros) uniformes y alineados ──
  function SegmentGrid<T>({
    options,
    selected,
    onSelect,
  }: {
    options: Segment<T>[];
    selected: T;
    onSelect: (v: T) => void;
  }): React.ReactElement {
    return (
      <View style={styles.segmentGrid}>
        {options.map((opt, i) => {
          const active = opt.value === selected;
          return (
            <Pressable
              key={i}
              onPress={() => onSelect(opt.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }: any) => [
                styles.segment,
                active && styles.segmentActive,
                pressed && !active && styles.segmentPressed,
              ]}
            >
              {opt.dot ? <View style={[styles.segmentDot, { backgroundColor: opt.dot }]} /> : null}
              <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  // ── Tarjeta de público objetivo ──
  const AudienceCard = (
    <View style={styles.audienceCard}>
      <View style={styles.audienceIcon}>
        <Users size={18} color={BRAND} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.audienceLabel}>Se enviará a</Text>
        <Text style={styles.audienceValue} numberOfLines={2}>{destino}</Text>
      </View>
      <View style={styles.audienceBadge}>
        <Text style={styles.audienceBadgeText}>{filtrosActivos === 0 ? 'Sin filtros' : `${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''}`}</Text>
      </View>
    </View>
  );

  // ── Sección de destinatarios (filtros) ──
  const DestinatariosSection = (
    <SectionCard title="Destinatarios" subtitle="Elige a qué grupo de gestantes llega" icon={Users} accentColor={BRAND}>
      <View style={styles.filterBlock}>
        <View style={styles.filterHeader}>
          <CalendarRange size={15} color={commonColors.textSecondary} />
          <Text style={styles.filterLabel}>Trimestre</Text>
        </View>
        <SegmentGrid options={TRIMESTRES} selected={trimestre} onSelect={setTrimestre} />
      </View>

      <View style={styles.divider} />

      <View style={styles.filterBlock}>
        <View style={styles.filterHeader}>
          <Activity size={15} color={commonColors.textSecondary} />
          <Text style={styles.filterLabel}>Nivel de riesgo</Text>
        </View>
        <SegmentGrid options={RIESGOS} selected={riesgo} onSelect={setRiesgo} />
      </View>

      <View style={{ marginTop: spacing.md }}>{AudienceCard}</View>
    </SectionCard>
  );

  // ── Sección del mensaje (composición) ──
  const MensajeSection = (
    <SectionCard title="Mensaje" subtitle="Lo recibirán en su chat y notificaciones" icon={Megaphone} accentColor={BRAND}>
      <TextAreaField
        value={contenido}
        onChangeText={(t) => t.length <= MAX && setContenido(t)}
        placeholder="Ej. Mañana habrá jornada de vacunación de 8:00 a. m. a 12:00 m. en el centro de salud. ¡Las esperamos!"
        numberOfLines={6}
        maxLength={MAX}
        themeColor={BRAND}
      />
      <View style={styles.counterRow}>
        <Text style={styles.hint}>Avisos breves y claros (cambios de horario, campañas, jornadas).</Text>
        <Text style={[styles.counter, remaining <= 50 && styles.counterWarn]}>{contenido.length}/{MAX}</Text>
      </View>
    </SectionCard>
  );

  // ── Botón de envío (consistente en ambos layouts) ──
  const SendButton = (
    <AppButton
      title="Enviar a gestantes"
      onPress={enviar}
      loading={mutation.isPending}
      disabled={!canSend}
      icon={Send}
      fullWidth
      themeColor={BRAND}
    />
  );

  // ════════════════════ WEB: dos columnas ════════════════════
  if (webShell) {
    return (
      <ScreenLayout role="obstetra" title="Mensaje masivo" subtitle="Comunícate con varias gestantes a la vez" width="wide" showBack accentColor={BRAND}>
        <View style={styles.twoCol}>
          <View style={styles.colMain}>
            {DestinatariosSection}
            {MensajeSection}
          </View>
          <View style={styles.colAside}>
            <View style={styles.asideSticky}>
              <SectionCard title="Resumen del envío" icon={Send} accentColor={BRAND}>
                {AudienceCard}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Mensaje</Text>
                  <Text style={styles.summaryVal}>{contenido.trim() ? `${contenido.length} caracteres` : 'Sin escribir'}</Text>
                </View>
                <View style={{ marginTop: spacing.md }}>{SendButton}</View>
              </SectionCard>
            </View>
          </View>
        </View>
      </ScreenLayout>
    );
  }

  // ════════════════════ MÓVIL: una columna + CTA al final ════════════════════
  return (
    <ScreenLayout role="obstetra" title="Mensaje masivo" subtitle="Comunícate con varias gestantes a la vez" width="full" showBack accentColor={BRAND}>
      {DestinatariosSection}
      {MensajeSection}
      <View style={styles.mobileSend}>{SendButton}</View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  // Filtros
  filterBlock: { gap: spacing.sm2 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  filterLabel: { ...typography.label, fontWeight: '700', color: commonColors.textSecondary },
  divider: { height: 1, backgroundColor: commonColors.borderLight, marginVertical: spacing.md },

  segmentGrid: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: commonColors.surfaceAlt,
    borderWidth: 1,
    borderColor: commonColors.border,
  },
  segmentActive: { backgroundColor: BRAND, borderColor: BRAND },
  segmentPressed: { backgroundColor: commonColors.surfaceHover },
  segmentDot: { width: 8, height: 8, borderRadius: 4 },
  segmentText: { ...typography.label, fontWeight: '600', color: commonColors.textSecondary },
  segmentTextActive: { color: obstetraColors.onPrimary },

  // Tarjeta de audiencia
  audienceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    backgroundColor: obstetraColors.primaryLight,
    borderRadius: borderRadius.md,
    padding: spacing.sm2,
  },
  audienceIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: commonColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceLabel: { ...typography.overline, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' },
  audienceValue: { ...typography.bodySm, color: commonColors.text, fontWeight: '700', marginTop: 2 },
  audienceBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surface,
  },
  audienceBadgeText: { ...typography.caption, fontWeight: '700', color: BRAND },

  // Mensaje
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm },
  hint: { ...typography.caption, color: commonColors.textTertiary, flex: 1, lineHeight: 17 },
  counter: { ...typography.caption, fontWeight: '700', color: commonColors.textTertiary },
  counterWarn: { color: obstetraColors.primary },

  // Resumen (web)
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  summaryKey: { ...typography.bodySm, color: commonColors.textSecondary },
  summaryVal: { ...typography.bodySm, fontWeight: '700', color: commonColors.text },

  // Layout web
  twoCol: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  colMain: { flex: 1, minWidth: 0 },
  colAside: { width: 340 },
  asideSticky: ({ position: 'sticky', top: spacing.lg } as any),

  // CTA móvil (al final del contenido)
  mobileSend: { marginTop: spacing.xs, marginBottom: spacing.lg },
});
