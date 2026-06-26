/**
 * VITMATERNA — TourSpotlight (foco del recorrido, animado).
 *
 * Velo oscuro a pantalla completa con un "agujero" redondeado sobre el elemento
 * resaltado (máscara de `react-native-svg`, cross-platform web + nativo).
 *
 * Profesional y fluido:
 *  - El recorte se DESPLAZA suavemente de un elemento al siguiente con física de
 *    resorte (reanimated), en vez de saltar.
 *  - Doble anillo: un halo de acento difuso (suave, baja opacidad) + un anillo
 *    nítido que enmarca el foco, para guiar la mirada sin estridencias.
 *  - Pulso muy sutil del halo (respira) que llama la atención al elemento sin
 *    distraer. Respeta reduce-motion (sin pulso, corte directo).
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
} from 'react-native-reanimated';
import type { TargetRect } from './types';
import { useReducedMotion } from '../../theme/motion';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface Props {
  width: number;
  height: number;
  rect: TargetRect | null;
  /** Margen alrededor del target (px). */
  padding?: number;
  /** Color del velo (incluye opacidad). */
  overlayColor: string;
  /** Color del anillo que enmarca el foco. */
  accent?: string;
}

const RADIUS = 16;
const HALO_GAP = 6;
// Resorte suave y profesional para el desplazamiento del foco.
const SPRING = { damping: 24, stiffness: 210, mass: 0.9 };

export function TourSpotlight({
  width,
  height,
  rect,
  padding = 10,
  overlayColor,
  accent,
}: Props): React.ReactElement {
  const reduced = useReducedMotion();

  // Geometría destino del agujero (con padding y clamp a la pantalla). Si no hay
  // target, colapsamos el agujero al centro (velo completo).
  const target = rect
    ? {
        x: Math.max(rect.x - padding, 0),
        y: Math.max(rect.y - padding, 0),
        w: rect.width + padding * 2,
        h: rect.height + padding * 2,
      }
    : { x: width / 2, y: height / 2, w: 0, h: 0 };

  // Valores animados del agujero. Inicializan en el destino (primer render).
  const x = useSharedValue(target.x);
  const y = useSharedValue(target.y);
  const w = useSharedValue(target.w);
  const h = useSharedValue(target.h);
  // Pulso del halo (0 = reposo, 1 = expandido). Respira sutilmente.
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      x.value = target.x;
      y.value = target.y;
      w.value = target.w;
      h.value = target.h;
      return;
    }
    // Si aparece/desaparece (w/h en 0), un fade rápido; si se mueve entre
    // elementos, un resorte que desliza el foco.
    const appearing = w.value === 0 || h.value === 0;
    if (appearing) {
      x.value = target.x;
      y.value = target.y;
      w.value = withTiming(target.w, { duration: 220 });
      h.value = withTiming(target.h, { duration: 220 });
    } else {
      x.value = withSpring(target.x, SPRING);
      y.value = withSpring(target.y, SPRING);
      w.value = withSpring(target.w, SPRING);
      h.value = withSpring(target.h, SPRING);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y, target.w, target.h, reduced]);

  // Pulso continuo del halo (solo si hay target y no se pidió reducir motion).
  useEffect(() => {
    if (reduced || !rect) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1100 }),
        withTiming(0, { duration: 1100 }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(pulse);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, rect]);

  const holeProps = useAnimatedProps(() => ({
    x: x.value,
    y: y.value,
    width: Math.max(0, w.value),
    height: Math.max(0, h.value),
  }));

  // Anillo nítido pegado al agujero.
  const ringProps = useAnimatedProps(() => ({
    x: x.value,
    y: y.value,
    width: Math.max(0, w.value),
    height: Math.max(0, h.value),
  }));

  // Halo difuso que respira: se separa unos px del anillo según el pulso.
  const haloProps = useAnimatedProps(() => {
    const grow = HALO_GAP + pulse.value * 5;
    return {
      x: x.value - grow,
      y: y.value - grow,
      width: Math.max(0, w.value + grow * 2),
      height: Math.max(0, h.value + grow * 2),
      opacity: 0.16 + (1 - pulse.value) * 0.12,
    };
  });

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id="tour-hole">
          <Rect x={0} y={0} width={width} height={height} fill="#fff" />
          <AnimatedRect animatedProps={holeProps} rx={RADIUS} ry={RADIUS} fill="#000" />
        </Mask>
      </Defs>
      {/* Velo con el agujero recortado. */}
      <Rect x={0} y={0} width={width} height={height} fill={overlayColor} mask="url(#tour-hole)" />
      {/* Halo difuso de acento que respira (guía la mirada con suavidad). */}
      {!!accent && rect && (
        <AnimatedRect
          animatedProps={haloProps}
          rx={RADIUS + HALO_GAP}
          ry={RADIUS + HALO_GAP}
          fill="none"
          stroke={accent}
          strokeWidth={6}
        />
      )}
      {/* Anillo nítido que enmarca el foco (se desliza con el agujero). */}
      {!!accent && rect && (
        <AnimatedRect
          animatedProps={ringProps}
          rx={RADIUS}
          ry={RADIUS}
          fill="none"
          stroke={accent}
          strokeWidth={2.5}
        />
      )}
    </Svg>
  );
}

export default TourSpotlight;
