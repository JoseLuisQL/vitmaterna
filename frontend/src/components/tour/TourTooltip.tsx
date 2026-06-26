/**
 * VITMATERNA — TourTooltip (tarjeta de un paso del recorrido).
 *
 * Diseño cuidado y a prueba de desbordes:
 *  - Cabecera: chip "Paso N de M" + botón cerrar (no se solapan).
 *  - Título + descripción en lenguaje simple y claro.
 *  - Progreso: BARRA fina animada (reanimated) que escala a cualquier número de
 *    pasos — nunca empuja los botones (a diferencia de N puntos en línea).
 *  - Acciones: fila propia, ancho completo. "Atrás" (icono) + acción primaria
 *    que ocupa el resto del ancho. Botones con feedback de presión (PressableScale).
 *
 * Solo tokens del sistema, color de acento del rol, contraste AA, áreas táctiles
 * ≥48, respeta reduce-motion. El posicionamiento lo decide el TourHost vía `style`.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { PressableScale } from '../ui/PressableScale';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { useReducedMotion } from '../../theme/motion';

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
  const reduced = useReducedMotion();
  const progress = useSharedValue((stepIndex + 1) / stepCount);

  useEffect(() => {
    const target = (stepIndex + 1) / stepCount;
    if (reduced) {
      progress.value = target;
    } else {
      progress.value = withTiming(target, { duration: 360, easing: Easing.out(Easing.cubic) });
    }
  }, [stepIndex, stepCount, reduced, progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
  }));

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      {/* Cabecera: progreso textual + cerrar (en su propia fila, sin solaparse) */}
      <View style={styles.headerRow}>
        <View style={[styles.stepChip, { backgroundColor: accent + '14' }]}>
          {!!label && <Text style={[styles.stepLabel, { color: accent }]} numberOfLines={1}>{label.toUpperCase()}</Text>}
          <Text style={[styles.stepCount, { color: accent }]}>Paso {stepIndex + 1} de {stepCount}</Text>
        </View>
        <PressableScale
          onPress={onSkip}
          style={styles.close}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Salir del recorrido"
          hitSlop={10}
        >
          <X size={18} color={commonColors.textSecondary} />
        </PressableScale>
      </View>

      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Barra de progreso animada (escala a cualquier nº de pasos) */}
      <View style={styles.progressTrack} accessibilityLabel={`Paso ${stepIndex + 1} de ${stepCount}`}>
        <Animated.View style={[styles.progressFill, { backgroundColor: accent }, barStyle]} />
      </View>

      {/* Acciones: fila propia, ancho completo, sin desbordes */}
      <View style={styles.actions}>
        {!isFirst && (
          <PressableScale
            onPress={onPrev}
            style={[styles.backBtn, { borderColor: commonColors.border }]}
            scaleTo={0.94}
            accessibilityRole="button"
            accessibilityLabel="Volver al paso anterior"
          >
            <ArrowLeft size={20} color={commonColors.textSecondary} />
          </PressableScale>
        )}
        <PressableScale
          onPress={onNext}
          style={[styles.primaryBtn, { backgroundColor: accent }]}
          scaleTo={0.97}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Terminar el recorrido' : 'Ir al siguiente paso'}
        >
          <Text style={styles.primaryBtnText} numberOfLines={1}>
            {isLast ? 'Entendido' : 'Siguiente'}
          </Text>
          {isLast ? <Check size={18} color={commonColors.white} /> : <ArrowRight size={18} color={commonColors.white} />}
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm2,
  },
  stepChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm2,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    flexShrink: 1,
  },
  stepLabel: { ...typography.overline, fontSize: 10, flexShrink: 1 },
  stepCount: { ...typography.caption, fontSize: 11, fontWeight: '700' },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.xs,
  },
  description: {
    ...typography.body,
    color: commonColors.textSecondary,
    lineHeight: 23,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: commonColors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backBtn: {
    width: 52,
    height: 50,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryBtn: {
    flex: 1,
    height: 50,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  primaryBtnText: {
    ...typography.button,
    fontSize: 16,
    color: commonColors.white,
    flexShrink: 1,
  },
});

export default TourTooltip;
