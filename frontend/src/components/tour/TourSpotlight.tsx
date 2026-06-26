/**
 * VITMATERNA — TourSpotlight (foco del recorrido, animado).
 *
 * Velo oscuro a pantalla completa con un "agujero" redondeado sobre el elemento
 * resaltado (máscara de `react-native-svg`, cross-platform web + nativo).
 *
 * Profesional y fluido: el recorte se DESPLAZA suavemente de un elemento al
 * siguiente con física de resorte (reanimated), en vez de saltar. Un anillo de
 * acento enmarca el foco para guiar la mirada. Respeta reduce-motion.
 */
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
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

const RADIUS = 18;
// Resorte suave y profesional para el desplazamiento del foco.
const SPRING = { damping: 22, stiffness: 200, mass: 0.9 };

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
    const cfg = appearing ? undefined : SPRING;
    if (appearing) {
      x.value = target.x;
      y.value = target.y;
      w.value = withTiming(target.w, { duration: 220 });
      h.value = withTiming(target.h, { duration: 220 });
    } else {
      x.value = withSpring(target.x, cfg);
      y.value = withSpring(target.y, cfg);
      w.value = withSpring(target.w, cfg);
      h.value = withSpring(target.h, cfg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.x, target.y, target.w, target.h, reduced]);

  const holeProps = useAnimatedProps(() => ({
    x: x.value,
    y: y.value,
    width: Math.max(0, w.value),
    height: Math.max(0, h.value),
  }));

  const ringProps = useAnimatedProps(() => ({
    x: x.value,
    y: y.value,
    width: Math.max(0, w.value),
    height: Math.max(0, h.value),
  }));

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
      {/* Anillo de acento que enmarca el foco (se desliza con el agujero). */}
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
