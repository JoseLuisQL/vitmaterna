/**
 * VITMATERNA — PrenatalRibbon (componente insignia del sistema de diseño)
 *
 * La "cinta prenatal": un trazo clínico que representa el embarazo de la semana 1
 * a la 40. NO es decoración — codifica información real del control prenatal:
 *   - avance actual (semana de gestación),
 *   - los tres trimestres (cortes en semana 13 y 27, norma obstétrica),
 *   - un nodo "hoy" que late suavemente (gesto de marca, respeta reduce-motion),
 *   - hitos opcionales (p. ej. la próxima cita) ubicados en su semana real.
 *
 * Es la firma visual que hace que cualquier pantalla se reconozca como VITMATERNA.
 * Vive en `ui/` y consume solo tokens del tema: color por rol, espacio del grid
 * de 8pt y el lenguaje de movimiento (`useReducedMotion`).
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Line,
  Circle,
} from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { AppText } from './AppText';
import { commonColors, gestanteColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useReducedMotion } from '../../theme/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Cortes de trimestre (norma obstétrica): 1.º ≤13, 2.º 14–27, 3.º ≥28. */
const TRIMESTER_BOUNDARIES = [13, 27] as const;

export interface RibbonMilestone {
  /** Semana de gestación donde cae el hito (0–total). */
  week: number;
  /** Etiqueta accesible del hito (p. ej. "Próxima cita"). */
  label?: string;
}

interface PrenatalRibbonProps {
  /** Semana de gestación actual (0–42). 0 = aún sin FUM registrada. */
  week: number;
  /** Total de semanas de referencia. Por defecto 40 (a término). */
  totalWeeks?: number;
  /** Par de colores del trazo de avance [inicio, fin]. Por defecto, acento gestante. */
  colors?: readonly [string, string];
  /** Color de la pista de fondo. */
  trackColor?: string;
  /** Hitos sobre la línea (p. ej. la próxima cita). */
  milestones?: RibbonMilestone[];
  /** Muestra la fila de leyenda (trimestre · semanas restantes). */
  showCaption?: boolean;
  /** Anima el latido del nodo "hoy" (se desactiva con reduce-motion). */
  animated?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEIGHT = 28;
const PAD_X = 14;
const TRACK_W = 6;
const NODE_R = 7;

function trimesterOf(week: number): 1 | 2 | 3 {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

const TRIMESTER_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Primer trimestre',
  2: 'Segundo trimestre',
  3: 'Tercer trimestre',
};

export function PrenatalRibbon({
  week,
  totalWeeks = 40,
  colors = gestanteColors.gradient,
  trackColor = commonColors.surfaceAlt,
  milestones = [],
  showCaption = true,
  animated = true,
  style,
  testID,
}: PrenatalRibbonProps): React.ReactElement {
  const gradientId = useId();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);

  const clampedWeek = Math.max(0, Math.min(totalWeeks, week));
  const hasStarted = week > 0;
  const trimester = trimesterOf(clampedWeek);
  const weeksLeft = Math.max(0, totalWeeks - clampedWeek);

  const pulse = useSharedValue(0);

  useEffect(() => {
    const shouldPulse = animated && !reduceMotion && hasStarted && width > 0;
    if (shouldPulse) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1100, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 1100, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = 0;
    }
    return () => cancelAnimation(pulse);
  }, [animated, reduceMotion, hasStarted, width, pulse]);

  const haloProps = useAnimatedProps(() => ({
    r: NODE_R + 2 + pulse.value * 6,
    opacity: 0.28 - pulse.value * 0.28,
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== width) setWidth(w);
  };

  const xFor = (w: number): number => {
    const usable = width - PAD_X * 2;
    return PAD_X + (Math.max(0, Math.min(totalWeeks, w)) / totalWeeks) * usable;
  };

  const cy = HEIGHT / 2;
  const nodeX = xFor(clampedWeek);

  const trimesterTicks = useMemo(
    () => TRIMESTER_BOUNDARIES.map((b) => ({ week: b, x: xFor(b) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, totalWeeks],
  );

  const accessibilityLabel = hasStarted
    ? `Semana ${clampedWeek} de ${totalWeeks}. ${TRIMESTER_LABEL[trimester]}. ` +
      `${weeksLeft === 0 ? 'A término.' : `Faltan ${weeksLeft} semanas.`}`
    : `Embarazo sin semana registrada. Registra tu última regla para ver tu avance.`;

  return (
    <View style={[styles.wrap, style]} testID={testID}>
      <View
        style={styles.canvas}
        onLayout={onLayout}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {width > 0 ? (
          <Svg width={width} height={HEIGHT}>
            <Defs>
              <SvgLinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={colors[0]} />
                <Stop offset="1" stopColor={colors[1]} />
              </SvgLinearGradient>
            </Defs>

            {/* Pista completa (semana 1 → 40) */}
            <Line
              x1={PAD_X}
              y1={cy}
              x2={width - PAD_X}
              y2={cy}
              stroke={trackColor}
              strokeWidth={TRACK_W}
              strokeLinecap="round"
            />

            {/* Cortes de trimestre — información real, marcados con discreción */}
            {trimesterTicks.map((t) => (
              <Line
                key={`tri-${t.week}`}
                x1={t.x}
                y1={cy - TRACK_W}
                x2={t.x}
                y2={cy + TRACK_W}
                stroke={commonColors.surface}
                strokeWidth={2}
                strokeLinecap="round"
              />
            ))}

            {/* Avance hasta la semana actual */}
            {hasStarted ? (
              <Line
                x1={PAD_X}
                y1={cy}
                x2={nodeX}
                y2={cy}
                stroke={`url(#${gradientId})`}
                strokeWidth={TRACK_W}
                strokeLinecap="round"
              />
            ) : null}

            {/* Hitos (p. ej. próxima cita) sobre la línea */}
            {milestones.map((m, i) => (
              <Circle
                key={`ms-${i}-${m.week}`}
                cx={xFor(m.week)}
                cy={cy}
                r={4}
                fill={commonColors.surface}
                stroke={colors[1]}
                strokeWidth={2}
              />
            ))}

            {/* Nodo "hoy": halo que late + punto sólido */}
            {hasStarted ? (
              <>
                <AnimatedCircle
                  cx={nodeX}
                  cy={cy}
                  fill={colors[1]}
                  animatedProps={haloProps}
                />
                <Circle cx={nodeX} cy={cy} r={NODE_R} fill={commonColors.surface} />
                <Circle cx={nodeX} cy={cy} r={NODE_R - 2.5} fill={colors[1]} />
              </>
            ) : (
              <Circle cx={PAD_X} cy={cy} r={NODE_R - 2} fill={commonColors.textTertiary} />
            )}
          </Svg>
        ) : null}
      </View>

      {showCaption ? (
        <View style={styles.caption}>
          <AppText variant="overline" color={colors[1]}>
            {hasStarted ? TRIMESTER_LABEL[trimester] : 'Sin fecha registrada'}
          </AppText>
          <AppText variant="overline" color={commonColors.textTertiary}>
            {hasStarted
              ? weeksLeft === 0
                ? 'A término'
                : `Faltan ${weeksLeft} sem`
              : 'Registra tu FUM'}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: spacing.sm },
  canvas: { width: '100%', height: HEIGHT },
  caption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default PrenatalRibbon;
