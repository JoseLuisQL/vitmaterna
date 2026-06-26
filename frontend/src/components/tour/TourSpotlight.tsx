/**
 * VITMATERNA — TourSpotlight (recorte de foco del tour).
 *
 * Dibuja un velo oscuro a pantalla completa con un "agujero" redondeado sobre el
 * elemento resaltado, usando una máscara de `react-native-svg` (cross-platform).
 * Si no hay rectángulo (paso centrado sin target), pinta el velo completo.
 *
 * No anima la geometría (corte directo entre pasos) para máxima robustez en web
 * y nativo; el TourHost se encarga del fade del conjunto.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, Mask, Rect, Circle } from 'react-native-svg';
import type { TargetRect, SpotlightShape } from './types';

interface Props {
  width: number;
  height: number;
  rect: TargetRect | null;
  shape?: SpotlightShape;
  /** Margen alrededor del target (px). */
  padding?: number;
  /** Color del velo (incluye opacidad). */
  overlayColor: string;
}

export function TourSpotlight({
  width,
  height,
  rect,
  shape = 'rect',
  padding = 8,
  overlayColor,
}: Props): React.ReactElement {
  // Geometría del recorte (con padding y clamp a la pantalla).
  const hole = rect
    ? {
        x: Math.max(rect.x - padding, 0),
        y: Math.max(rect.y - padding, 0),
        w: rect.width + padding * 2,
        h: rect.height + padding * 2,
      }
    : null;

  const radius = 16;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Mask id="tour-hole">
          {/* Todo visible (blanco) por defecto… */}
          <Rect x={0} y={0} width={width} height={height} fill="#fff" />
          {/* …y el agujero (negro) deja ver el contenido por debajo. */}
          {hole &&
            (shape === 'circle' ? (
              <Circle
                cx={hole.x + hole.w / 2}
                cy={hole.y + hole.h / 2}
                r={Math.max(hole.w, hole.h) / 2}
                fill="#000"
              />
            ) : (
              <Rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx={radius} ry={radius} fill="#000" />
            ))}
        </Mask>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={overlayColor} mask="url(#tour-hole)" />
    </Svg>
  );
}

export default TourSpotlight;
