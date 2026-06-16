/**
 * VITMATERNA — EmergencyMessageCard
 *
 * Renderiza un mensaje de tipo `alerta_emergencia` como una tarjeta clínica
 * profesional (sin emojis): cabecera de urgencia con icono, líneas de datos
 * estructuradas (Paciente / Riesgo / Teléfono / Síntoma) y un botón para abrir
 * la ubicación en el mapa cuando viene una URL.
 *
 * El contenido llega como texto multilínea "Etiqueta: valor". Lo parseamos para
 * mostrarlo ordenado; si no tiene ese formato, se muestra tal cual.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Siren, MapPin, ChevronRight } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface EmergencyMessageCardProps {
  /** Contenido del mensaje (multilínea "Etiqueta: valor"). */
  text: string;
  /** Hora ya formateada (HH:mm). */
  time: string;
  /** URL del mapa (mediaUrl del mensaje), si existe. */
  mapsUrl?: string | null;
}

interface ParsedLine {
  label?: string;
  value: string;
  isUrl?: boolean;
}

/** Separa el texto en título + líneas etiqueta/valor. */
function parse(text: string): { title: string; lines: ParsedLine[] } {
  const raw = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (raw.length === 0) return { title: 'Emergencia', lines: [] };
  const title = raw[0];
  const lines: ParsedLine[] = [];
  for (let i = 1; i < raw.length; i++) {
    const l = raw[i];
    const idx = l.indexOf(':');
    if (idx > 0) {
      const label = l.slice(0, idx).trim();
      const value = l.slice(idx + 1).trim();
      const isUrl = /^https?:\/\//i.test(value);
      // La ubicación (URL) no se muestra como texto: va al botón.
      if (isUrl) continue;
      lines.push({ label, value });
    } else {
      lines.push({ value: l });
    }
  }
  return { title, lines };
}

export function EmergencyMessageCard({ text, time, mapsUrl }: EmergencyMessageCardProps): React.ReactElement {
  const { title, lines } = parse(text);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Siren size={18} color={commonColors.white} />
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>

      {lines.length > 0 && (
        <View style={styles.body}>
          {lines.map((l, i) => (
            <View key={i} style={styles.row}>
              {l.label ? <Text style={styles.label}>{l.label}</Text> : null}
              <Text style={[styles.value, !l.label && styles.valueFull]} numberOfLines={2}>{l.value}</Text>
            </View>
          ))}
        </View>
      )}

      {mapsUrl ? (
        <Pressable
          style={({ pressed }) => [styles.mapBtn, pressed && styles.mapBtnPressed]}
          onPress={() => Linking.openURL(mapsUrl)}
          accessibilityRole="button"
          accessibilityLabel="Ver ubicación en el mapa"
        >
          <MapPin size={16} color={commonColors.white} />
          <Text style={styles.mapBtnText}>Ver ubicación en el mapa</Text>
          <ChevronRight size={16} color={commonColors.white} />
        </Pressable>
      ) : null}

      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'center',
    width: '96%',
    backgroundColor: semanticColors.dangerLight,
    borderWidth: 1.5,
    borderColor: semanticColors.danger,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: semanticColors.danger, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, ...typography.label, fontWeight: '800', color: semanticColors.danger },
  body: { marginTop: spacing.sm, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  label: { ...typography.caption, fontWeight: '700', color: semanticColors.danger, minWidth: 72 },
  value: { ...typography.bodySmall, color: commonColors.text, flex: 1, fontWeight: '600' },
  valueFull: { fontWeight: '500' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: semanticColors.danger,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  mapBtnPressed: { opacity: 0.85 },
  mapBtnText: { ...typography.label, fontWeight: '700', color: commonColors.white },
  time: { ...typography.caption, fontSize: 11, color: semanticColors.danger, alignSelf: 'flex-end', marginTop: spacing.sm, fontWeight: '600' },
});

export default EmergencyMessageCard;
