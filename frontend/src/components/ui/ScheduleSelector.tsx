/**
 * VITMATERNA - ScheduleSelector
 * Selector profesional de horarios de toma y frecuencia de medicación.
 * Incluye atajos clínicos rápidos (Cada 8h, Cada 12h, Diario, etc.),
 * píldoras visuales elegantes con eliminación individual y barra unificada de adición.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Clock, Plus, X, Zap, Check, Bell, Sparkles } from 'lucide-react-native';
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
      {/* Input de Frecuencia */}
      <PlainInput
        label="Frecuencia e indicación de toma"
        placeholder="Ej. Diario, cada 8 horas, con las comidas"
        value={frecuencia}
        onChangeText={onFrecuenciaChange}
        themeColor={themeColor}
      />

      {/* Atajos Clínicos Rápidos */}
      <View style={styles.presetsContainer}>
        <View style={styles.presetsHeader}>
          <Zap size={14} color={themeColor} />
          <Text style={[styles.presetsTitle, { color: themeColor }]}>
            Atajos clínicos rápidos (carga automática de horas)
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
                {isSelected && <Check size={13} color="#FFF" style={{ marginRight: 4 }} />}
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

      {/* Panel Profesional de Cronograma Diario */}
      <View style={[styles.scheduleCard, { borderColor: themeColor + '40' }]}>
        <View style={styles.scheduleHeader}>
          <View style={styles.scheduleHeaderLeft}>
            <Clock size={16} color={themeColor} />
            <Text style={[styles.scheduleTitle, { color: themeColor }]}>
              Cronograma de Alertas al Día
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: themeColor + '1A' }]}>
            <Text style={[styles.badgeText, { color: themeColor }]}>
              {horarios.length} {horarios.length === 1 ? 'toma programada' : 'tomas programadas'}
            </Text>
          </View>
        </View>

        {/* Píldoras de Horarios */}
        <View style={styles.pillsContainer}>
          {horarios.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Bell size={20} color={commonColors.textSecondary} style={{ opacity: 0.5, marginBottom: 4 }} />
              <Text style={styles.emptyText}>
                No hay horas asignadas. Selecciona un atajo clínico arriba o agrega una hora abajo.
              </Text>
            </View>
          ) : (
            horarios.map((horaTxt, idx) => (
              <View
                key={`${horaTxt}-${idx}`}
                style={[
                  styles.timePill,
                  { borderColor: themeColor, backgroundColor: '#FFF' },
                ]}
              >
                <Text style={[styles.timePillText, { color: themeColor }]}>
                  ⏰ {horaTxt}
                </Text>
                {horarios.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveHora(idx)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={14} color={semanticColors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        {/* Barra de adición unificada */}
        <View style={styles.addBar}>
          <View style={{ flex: 1 }}>
            <DateTimeField
              label=""
              mode="time"
              value={newHora}
              onChange={setNewHora}
              themeColor={themeColor}
              placeholder="Elegir hora..."
              minuteStep={5}
              containerStyle={{ marginBottom: 0 }}
            />
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: themeColor }]}
            onPress={handleAddHora}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFF" />
            <Text style={styles.addBtnText}>Añadir toma</Text>
          </TouchableOpacity>
        </View>

        {/* Nota explicativa inferior */}
        <View style={styles.footerNote}>
          <Sparkles size={13} color={commonColors.textSecondary} style={{ marginTop: 2, marginRight: 6 }} />
          <Text style={styles.footerText}>
            La gestante recibirá alertas Push e In-App automáticas e independientes por cada hora programada aquí en su celular.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  presetsContainer: {
    marginTop: -4,
    marginBottom: spacing.xs,
  },
  presetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  presetsTitle: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  presetText: {
    ...typography.caption,
    fontWeight: '600',
  },
  scheduleCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.md,
    marginTop: 4,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  scheduleHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleTitle: {
    ...typography.label,
    fontWeight: '800',
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '800',
    fontSize: 12,
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
    minHeight: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: commonColors.borderLight,
    borderStyle: 'dashed',
  },
  emptyText: {
    ...typography.caption,
    color: commonColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timePillText: {
    ...typography.bodySm,
    fontWeight: '800',
    fontSize: 14,
    marginRight: 8,
  },
  removeBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: semanticColors.danger + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 52,
    paddingHorizontal: 18,
    borderRadius: borderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  addBtnText: {
    ...typography.bodySm,
    color: '#FFF',
    fontWeight: '700',
  },
  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: commonColors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: commonColors.borderLight,
  },
  footerText: {
    flex: 1,
    ...typography.caption,
    color: commonColors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
});
