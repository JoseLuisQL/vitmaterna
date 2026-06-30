/**
 * VITMATERNA — EmergencyMessageCard
 *
 * Tarjeta clínica de alta prioridad para alertas de emergencia obstétrica.
 * Diseño ejecutivo con acento lateral rojo, tipografía estructurada y llamada
 * a la acción inmediata.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { Siren, MapPin, ChevronRight, AlertTriangle } from 'lucide-react-native';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';

interface EmergencyMessageCardProps {
  text: string;
  time: string;
  mapsUrl?: string | null;
}

interface ParsedLine {
  label?: string;
  value: string;
}

function parse(text: string): { title: string; lines: ParsedLine[] } {
  const raw = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (raw.length === 0) return { title: 'ALERTA DE EMERGENCIA', lines: [] };
  
  // Limpiar el título principal
  const title = raw[0].replace(/^-*\s*/, '');
  const lines: ParsedLine[] = [];
  
  for (let i = 1; i < raw.length; i++) {
    const l = raw[i];
    const idx = l.indexOf(':');
    if (idx > 0) {
      const label = l.slice(0, idx).trim();
      const value = l.slice(idx + 1).trim();
      if (/^https?:\/\//i.test(value)) continue;
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
    <View style={styles.cardContainer}>
      <View style={styles.card}>
        {/* Cabecera de la Alerta */}
        <View style={styles.headerRow}>
          <View style={styles.badge}>
            <Siren size={14} color={semanticColors.danger} />
            <Text style={styles.badgeText}>ALERTA OBSTÉTRICA</Text>
          </View>
          <Text style={styles.timeText}>{time}</Text>
        </View>

        <Text style={styles.mainTitle}>{title}</Text>

        {/* Datos Clínicos Estructurados */}
        {lines.length > 0 && (
          <View style={styles.grid}>
            {lines.map((l, i) => {
              const isSintoma = l.label?.toLowerCase().includes('síntoma') || l.label?.toLowerCase().includes('sintoma');
              const isAccion = l.label?.toLowerCase().includes('acción') || l.label?.toLowerCase().includes('accion');
              
              if (isAccion) {
                return (
                  <View key={i} style={styles.actionBox}>
                    <AlertTriangle size={15} color={semanticColors.danger} style={{ marginTop: 1 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.actionLabel}>ACCIÓN REQUERIDA:</Text>
                      <Text style={styles.actionValue}>{l.value}</Text>
                    </View>
                  </View>
                );
              }

              return (
                <View key={i} style={styles.row}>
                  {l.label ? <Text style={styles.rowLabel}>{l.label}</Text> : null}
                  <Text style={[styles.rowValue, isSintoma && styles.sintomaHighlight]}>
                    {l.value}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Ubicación GPS */}
        {mapsUrl ? (
          <Pressable
            style={({ pressed }) => [styles.mapBtn, pressed && styles.mapBtnPressed]}
            onPress={() => Linking.openURL(mapsUrl)}
            accessibilityRole="button"
            accessibilityLabel="Ver ubicación de la gestante en el mapa"
          >
            <MapPin size={16} color={commonColors.white} />
            <Text style={styles.mapBtnText}>Abrir GPS en Google Maps</Text>
            <ChevronRight size={16} color={commonColors.white} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    alignSelf: 'center',
    width: '94%',
    marginVertical: spacing.sm,
  },
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderLeftWidth: 5,
    borderLeftColor: semanticColors.danger,
    padding: spacing.md,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  badgeText: {
    ...typography.overline,
    color: semanticColors.danger,
    fontWeight: '800',
    fontSize: 11,
  },
  timeText: {
    ...typography.caption,
    color: commonColors.textTertiary,
    fontWeight: '600',
  },
  mainTitle: {
    ...typography.h4,
    color: '#991B1B',
    fontWeight: '800',
    marginBottom: spacing.sm2,
  },
  grid: {
    gap: 8,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowLabel: {
    ...typography.caption,
    fontWeight: '700',
    color: '#7F1D1D',
    width: 72,
    marginTop: 1,
  },
  rowValue: {
    ...typography.bodySm,
    color: commonColors.text,
    flex: 1,
    fontWeight: '500',
  },
  sintomaHighlight: {
    fontWeight: '700',
    color: '#1E293B',
    fontSize: 14,
  },
  actionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginTop: 6,
  },
  actionLabel: {
    ...typography.overline,
    color: semanticColors.danger,
    fontWeight: '800',
    fontSize: 10,
  },
  actionValue: {
    ...typography.bodySm,
    color: '#991B1B',
    fontWeight: '700',
    marginTop: 2,
  },
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
  mapBtnText: {
    ...typography.label,
    fontWeight: '700',
    color: commonColors.white,
  },
});

export default EmergencyMessageCard;
