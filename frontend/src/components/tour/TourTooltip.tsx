/**
 * VITMATERNA — TourTooltip (tarjeta de un paso del recorrido).
 *
 * Diseño limpio y profesional, a prueba de desbordes:
 *  - Cabecera ligera: punto de acento + etiqueta de sección y, a la derecha,
 *    el contador "N / M" + botón cerrar (área táctil amplia, sin solaparse).
 *  - Título + descripción en lenguaje simple, con buena medida de línea.
 *  - Progreso: barra SEGMENTADA (un segmento por paso) que se llena con el
 *    acento del rol. Escala a cualquier número de pasos y comunica la posición
 *    de un vistazo, sin empujar los botones.
 *  - Acciones: fila propia, ancho completo. "Atrás" (icono, sólo desde el 2º
 *    paso) + acción primaria que ocupa el resto. Feedback de presión con
 *    PressableScale.
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

/** Máximo de segmentos visibles en la barra de progreso (evita saturar). */
const MAX_SEGMENTS = 14;

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
      progress.value = withTiming(target, { duration: 320, easing: Easing.out(Easing.cubic) });
    }
  }, [stepIndex, stepCount, reduced, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.value)) * 100}%`,
    height: '100%',
  }));

  const showSegments = stepCount <= MAX_SEGMENTS;

  return (
    <View style={[styles.card, style]} accessibilityRole="summary">
      {/* Cabecera ligera: acento + etiqueta · contador + cerrar */}
      <View style={styles.headerRow}>
        <View style={styles.labelWrap}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.label, { color: accent }]} numberOfLines={1}>
            {(label || 'Recorrido').toUpperCase()}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.counter}>
            {stepIndex + 1} <Text style={styles.counterTotal}>/ {stepCount}</Text>
          </Text>
          <PressableScale
            onPress={onSkip}
            style={styles.close}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel="Salir del recorrido"
            hitSlop={12}
          >
            <X size={17} color={commonColors.textSecondary} />
          </PressableScale>
        </View>
      </View>

      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={styles.description}>{description}</Text>

      {/* Progreso: barra segmentada (un segmento por paso) sobre pista continua. */}
      <View
        style={styles.progressTrack}
        accessibilityLabel={`Paso ${stepIndex + 1} de ${stepCount}`}
      >
        <Animated.View style={[styles.progressFill, { backgroundColor: accent }, fillStyle]} />
        {showSegments && (
          <View style={styles.segments} pointerEvents="none">
            {Array.from({ length: stepCount - 1 }).map((_, i) => (
              <View key={i} style={styles.segmentGap} />
            ))}
          </View>
        )}
      </View>

      {/* Acciones: fila propia, ancho completo, sin desbordes. */}
      <View style={styles.actions}>
        {!isFirst && (
          <PressableScale
            onPress={onPrev}
            style={styles.backBtn}
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
    paddingTop: spacing.md2,
    paddingBottom: spacing.md2,
    paddingHorizontal: spacing.lg,
    width: '100%',
    maxWidth: 348,
    borderWidth: 1,
    borderColor: commonColors.borderLight,
    ...shadows.modal,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm2,
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    flexShrink: 1,
  },
  dot: { width: 7, height: 7, borderRadius: borderRadius.full },
  label: { ...typography.overline, flexShrink: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 0,
  },
  counter: { ...typography.label, fontWeight: '700', color: commonColors.text },
  counterTotal: { color: commonColors.textTertiary, fontWeight: '600' },
  close: {
    width: 30,
    height: 30,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: commonColors.surfaceAlt,
  },
  title: {
    ...typography.h3,
    color: commonColors.text,
    marginBottom: spacing.xs + 1,
  },
  description: {
    ...typography.body,
    color: commonColors.textSecondary,
    lineHeight: 23,
  },
  progressTrack: {
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.surfaceAlt,
    overflow: 'hidden',
    marginTop: spacing.md2,
  },
  progressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: borderRadius.full,
  },
  // Cortes finos (color de superficie) que segmentan la barra por paso.
  segments: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  segmentGap: { width: 2, height: '100%', backgroundColor: commonColors.surface },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    marginTop: spacing.md2,
  },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: commonColors.border,
    backgroundColor: commonColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  primaryBtn: {
    flex: 1,
    height: 52,
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
