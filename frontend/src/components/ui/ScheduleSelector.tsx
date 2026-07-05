/**
 * VITMATERNA - ScheduleSelector (Minimalista)
 * Selector de horarios y frecuencia 100% minimalista, limpio y ordenado.
 * Cero emojis, uso estricto de íconos Lucide y sin sobrecarga de contenido.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, Plus, X, Zap, Check } from 'lucide-react-native';
import { commonColors, semanticColors, obstetraColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { PlainInput } from './PlainInput';
import { DateTimeField } from './DateTimeField';

export interface ScheduleSelectorProps {
  frecuencia: string;
  onFrecuenciaChange: (val: string) => void;
  horarios: string[];
  onHorariosChange: (val: string[]) => void;
  themeColor?: string;
}

const PRESETS = [
  { label: 'Diario (24h)', frec: 'Diario (cada 24 horas)', horas: ['08:00'] },
  { label: 'Cada 12h', frec: 'Cada 12 horas', horas: ['08:00', '20:00'] },
  { label: 'Cada 8h', frec: 'Cada 8 horas', horas: ['08:00', '16:00', '00:00'] },
  { label: 'Cada 6h', frec: 'Cada 6 horas', horas: ['06:00', '12:00', '18:00', '00:00'] },
  { label: 'Almuerzo / Cena', frec: 'Con almuerzo y cena', horas: ['13:00', '20:00'] },
];

export function ScheduleSelector({
  frecuencia,
  onFrecuenciaChange,
  horarios,
  onHorariosChange,
  themeColor = obstetraColors.primary,
}: ScheduleSelectorProps): React.ReactElement {
  const [newHora, setNewHora] = useState('14:00');

  const handleAddHora = () => {
    if (!newHora) return;
    if (!horarios.includes(newHora)) {
      const updated = [...horarios, newHora].sort();
      onHorariosChange(updated);
    }
  };

  const handleRemoveHora = (indexToRemove: number) => {
    onHorariosChange(horarios.filter((_, i) => i !== indexToRemove));
  };

  return (
    <View style={styles.container}>
      {/* 1. Frecuencia */}
      <PlainInput
        label="Frecuencia de toma"
        placeholder="Ej. Diario, cada 8 horas"
        value={frecuencia}
        onChangeText={onFrecuenciaChange}
        themeColor={themeColor}
      />

      {/* 2. Atajos rápidos */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Zap size={13} color={themeColor} />
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Atajos rápidos
          </Text>
        </View>
        <View style={styles.presetsRow}>
          {PRESETS.map((p, idx) => {
            const isSelected =
              frecuencia === p.frec &&
              JSON.stringify(horarios) === JSON.stringify(p.horas);

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: isSelected ? themeColor : commonColors.surfaceAlt,
                    borderColor: isSelected ? themeColor : commonColors.border,
                  },
                ]}
                onPress={() => {
                  onFrecuenciaChange(p.frec);
                  onHorariosChange(p.horas);
                }}
                activeOpacity={0.7}
              >
                {isSelected && <Check size={12} color="#FFF" style={{ marginRight: 4 }} />}
                <Text
                  style={[
                    styles.presetText,
                    { color: isSelected ? '#FFF' : commonColors.textSecondary },
                    isSelected && { fontWeight: '700' },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 3. Horarios programados */}
      <View style={styles.section}>
        <View style={styles.headerRow}>
          <Clock size={13} color={themeColor} />
          <Text style={[styles.sectionTitle, { color: themeColor }]}>
            Horarios programados
          </Text>
          <Text style={styles.countText}>
            ({horarios.length})
          </Text>
        </View>

        <View style={styles.pillsRow}>
          {horarios.length === 0 ? (
            <Text style={styles.emptyText}>
              Sin horarios asignados. Elige un atajo o agrega una hora.
            </Text>
          ) : (
            horarios.map((horaTxt, idx) => (
              <View
                key={`${horaTxt}-${idx}`}
                style={[styles.timePill, { borderColor: themeColor }]}
              >
                <Clock size={12} color={themeColor} style={{ marginRight: 5 }} />
                <Text style={[styles.timePillText, { color: themeColor }]}>
                  {horaTxt}
                </Text>
                {horarios.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveHora(idx)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={12} color={semanticColors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Barra compacta para agregar hora */}
        <View style={styles.addBar}>
          <View style={{ flex: 1 }}>
            <DateTimeField
              label=""
              mode="time"
              value={newHora}
              onChange={setNewHora}
              themeColor={themeColor}
              placeholder="00:00"
              minuteStep={5}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: themeColor }]}
            onPress={handleAddHora}
            activeOpacity={0.8}
          >
            <Plus size={15} color="#FFF" />
            <Text style={styles.addBtnText}>Añadir</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  section: {
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sectionTitle: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  countText: {
    ...typography.caption,
    color: commonColors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    ...typography.caption,
    fontSize: 12,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    minHeight: 28,
  },
  emptyText: {
    ...typography.caption,
    color: commonColors.textTertiary,
    fontStyle: 'italic',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    backgroundColor: commonColors.surface,
  },
  timePillText: {
    ...typography.bodySm,
    fontWeight: '700',
    fontSize: 13,
    marginRight: 6,
  },
  removeBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: semanticColors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    paddingHorizontal: 16,
    borderRadius: borderRadius.sm,
  },
  addBtnText: {
    ...typography.bodySm,
    color: '#FFF',
    fontWeight: '600',
  },
});
