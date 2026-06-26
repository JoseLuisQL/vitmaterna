/**
 * VITMATERNA — TourTooltip (tarjeta de un paso del tour).
 *
 * Muestra el texto explicativo del paso actual: etiqueta, título, descripción,
 * indicador de progreso (dots) y acciones (Atrás / Siguiente·Finalizar /
 * Omitir). Usa solo tokens del sistema y el color de acento del rol.
 *
 * El posicionamiento (sobre/bajo el target, o centrado) lo decide el TourHost y
 * se aplica vía `style`.
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable, type ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface Props {
  label?: string;
  title: string;
  description: string;
  stepIndex: number;
  stepCount: number;
  accent: string;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  style?: ViewStyle;
}

export function TourTooltip({
  label,
  title,
  description,
  stepIndex,
  stepCount,
  accent,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onSkip,
  style,
}: Props): React.ReactElement {
  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      {/* Cerrar / omitir */}
      <Pressable
        onPress={onSkip}
        style={styles.close}
        accessibilityRole="button"
        accessibilityLabel="Omitir el recorrido"
        hitSlop={10}
      >
        <X size={18} color={commonColors.textTertiary} />
      </Pressable>

      {!!label && <Text style={[styles.label, { color: accent }]}>{label.toUpperCase()}</Text>}
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.footer}>
        {/* Dots de progreso */}
        <View style={styles.dots} accessibilityLabel={`Paso ${stepIndex + 1} de ${stepCount}`}>
          {Array.from({ length: stepCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === stepIndex ? accent : commonColors.border },
                i === stepIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Acciones */}
        <View style={styles.actions}>
          {!isFirst && (
            <Pressable
              onPress={onPrev}
              style={styles.ghostBtn}
              accessibilityRole="button"
              accessibilityLabel="Paso anterior"
            >
              <Text style={styles.ghostBtnText}>Atrás</Text>
            </Pressable>
          )}
          <Pressable
            onPress={onNext}
            style={[styles.primaryBtn, { backgroundColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Finalizar el recorrido' : 'Siguiente paso'}
          >
            <Text style={styles.primaryBtnText}>{isLast ? 'Finalizar' : 'Siguiente'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: 320,
    maxWidth: '100%',
    ...shadows.modal,
  },
  close: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    padding: spacing.xs,
    zIndex: 1,
  },
  label: {
    ...typography.overline,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.xs,
    paddingRight: spacing.lg,
  },
  description: {
    ...typography.body,
    color: commonColors.textSecondary,
  },
  footer: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ghostBtn: {
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    ...typography.button,
    color: commonColors.textSecondary,
  },
  primaryBtn: {
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...typography.button,
    color: commonColors.white,
  },
});

export default TourTooltip;
