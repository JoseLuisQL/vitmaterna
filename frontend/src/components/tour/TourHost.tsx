/**
 * VITMATERNA — TourHost (orquestador del tour guiado).
 *
 * Se monta una vez en el árbol raíz (como ConfirmHost). Expone la API
 * imperativa vía `tourController` y, cuando hay un tour activo:
 *   1. Filtra los pasos según la plataforma (web/móvil).
 *   2. Para cada paso: navega si hace falta, espera y mide el target.
 *   3. Pinta el velo con recorte (TourSpotlight) y la tarjeta (TourTooltip),
 *      posicionada cerca del target sin salirse de la pantalla.
 *
 * Robusto: si un target no se puede medir tras varios intentos, el paso se
 * muestra centrado (sin spotlight) en vez de romper el flujo. El overlay
 * captura toques fuera de la tarjeta (no se filtran a la app debajo).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing, useWindowDimensions, Platform, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { colors as roleColorMap, commonColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { zIndex } from '../../theme/zIndex';
import { useResponsive } from '../../theme/responsive';
import { useReducedMotion } from '../../theme/motion';
import { haptics } from '../../utils/haptics';
import type { UserRole } from '../../types/user';
import type { TargetRect, TourStep } from './types';
import { _registerTourHost } from './tourController';
import { measureTarget, scrollTargetIntoView } from './tourTargets';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 16;
const MEASURE_RETRIES = 12;
const MEASURE_DELAY = 140;
// Margen tras navegar a otra pantalla, para que monte y registre sus targets.
const NAV_SETTLE_MS = 380;

interface Props {
  /** Se llama cuando el tour termina (finalizado u omitido). */
  onFinish?: () => void;
}

export function TourHost({ onFinish }: Props): React.ReactElement | null {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { webShell } = useResponsive();
  const role = (useAuthStore((s) => s.user?.role) as UserRole | undefined) ?? 'gestante';
  const accent = (roleColorMap[role] ?? roleColorMap.gestante).primary;
  const { markTourDone } = useOnboarding();
  const reduced = useReducedMotion();

  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  // ¿Ya se resolvió la posición del paso actual? Para pasos con target, la
  // tarjeta permanece oculta hasta que el target se midió (o se agotaron los
  // reintentos), evitando que aparezca centrada y luego "salte" a su sitio.
  const [resolved, setResolved] = useState(false);
  // Altura real de la tarjeta (medida con onLayout) para posicionarla sin tapar
  // el elemento resaltado. Mientras no se conoce, se usa una estimación.
  const [cardHeight, setCardHeight] = useState(0);
  const cancelled = useRef(false);
  // Animación de aparición de la tarjeta/spotlight en cada paso (fade + leve sube).
  const appear = useRef(new Animated.Value(0)).current;

  const platform: 'web' | 'mobile' = webShell ? 'web' : 'mobile';

  // Filtra los pasos aplicables a la plataforma actual.
  const applicableSteps = useMemo(() => {
    if (!steps) return null;
    return steps.filter((s) => !s.platform || s.platform === 'both' || s.platform === platform);
  }, [steps, platform]);

  const finish = useCallback(() => {
    cancelled.current = true;
    setSteps(null);
    setIndex(0);
    setRect(null);
    markTourDone();
    onFinish?.();
  }, [onFinish, markTourDone]);

  // Registro del host singleton.
  useEffect(() => {
    const api = {
      start: (s: TourStep[]) => {
        cancelled.current = false;
        setIndex(0);
        setRect(null);
        setSteps(s);
      },
      stop: () => finish(),
      next: () => setIndex((i) => i + 1),
      prev: () => setIndex((i) => Math.max(0, i - 1)),
    };
    _registerTourHost(api);
    // Puente de depuración solo en desarrollo (útil para QA del recorrido).
    if (__DEV__ && typeof globalThis !== 'undefined') {
      (globalThis as any).__vitmaternaStartTour = api.start;
    }
    return () => _registerTourHost(null);
  }, [finish]);

  const step = applicableSteps && index >= 0 && index < applicableSteps.length ? applicableSteps[index] : null;

  // Al terminar la lista de pasos, cerrar.
  useEffect(() => {
    if (applicableSteps && index >= applicableSteps.length) {
      haptics.success();
      finish();
    }
  }, [applicableSteps, index, finish]);

  // Resolver el paso actual: navegar (si aplica) + medir el target con reintentos.
  useEffect(() => {
    if (!step) return;
    let active = true;
    cancelled.current = false;
    setRect(null);
    setResolved(false);
    setCardHeight(0); // re-medir la altura de la tarjeta para este paso

    (async () => {
      let didNavigate = false;
      if (step.navigateTo) {
        try {
          router.navigate(step.navigateTo as any);
          didNavigate = true;
        } catch {
          /* ruta inválida: continuar sin navegar */
        }
      }

      // Esperar a que termine la interacción/montaje antes de medir.
      await new Promise<void>((resolve) => {
        const task = InteractionManager.runAfterInteractions(() => resolve());
        // Fallback por si runAfterInteractions no dispara en web.
        setTimeout(() => resolve(), 50);
        return () => task?.cancel?.();
      });

      // Tras navegar a otra pantalla, dar tiempo a que monte y registre sus
      // targets (la transición de ruta + carga de datos puede tardar).
      if (didNavigate) {
        await new Promise((r) => setTimeout(r, NAV_SETTLE_MS));
        if (!active || cancelled.current) return;
      }

      if (!step.targetId) {
        // Paso centrado (sin spotlight): se muestra de inmediato.
        if (active) {
          setRect(null);
          setResolved(true);
        }
        return;
      }

      // Enfoque inteligente: primero esperamos a que el target exista, luego lo
      // desplazamos para centrarlo en la vista y recién después medimos. Así la
      // zona resaltada queda siempre visible (no a medias ni fuera de pantalla).
      let scrolled = false;
      for (let attempt = 0; attempt < MEASURE_RETRIES; attempt++) {
        if (!active || cancelled.current) return;

        // Una vez que el target ya está montado, lo centramos (solo una vez).
        if (!scrolled) {
          const exists = await measureTarget(step.targetId);
          if (exists) {
            scrolled = true;
            await scrollTargetIntoView(step.targetId);
            if (!active || cancelled.current) return;
          }
        }

        const measured = await measureTarget(step.targetId);
        if (measured) {
          if (active) {
            setRect(measured);
            setResolved(true);
          }
          return;
        }
        await new Promise((r) => setTimeout(r, MEASURE_DELAY));
      }
      // No se pudo medir: mostrar el paso centrado (no romper el flujo).
      if (active) {
        setRect(null);
        setResolved(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [step]);

  // Animación de entrada suave de la tarjeta cada vez que cambia el paso o se
  // resuelve la posición del target (transición fluida y profesional).
  useEffect(() => {
    // Solo animamos la entrada cuando la posición del paso ya está resuelta
    // (evita el "salto" de la tarjeta desde el centro a su posición final).
    if (!resolved) {
      appear.setValue(0);
      return;
    }
    if (reduced) {
      appear.setValue(1);
      return;
    }
    appear.setValue(0);
    const t = Animated.timing(appear, {
      toValue: 1,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    t.start();
    return () => t.stop();
  }, [index, resolved, reduced, appear]);

  const handleNext = useCallback(() => {
    haptics.selection();
    setIndex((i) => i + 1);
  }, []);

  const handlePrev = useCallback(() => {
    haptics.selection();
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!step || !applicableSteps) return null;

  // Posición y ancho de la tarjeta. Garantiza que la tarjeta NUNCA tape el
  // elemento resaltado: la coloca en el lado (arriba/abajo) con más espacio y
  // dentro de los límites de la pantalla. Usa la altura real medida.
  const { top, left, cardWidth } = computeTooltipPosition(
    rect,
    width,
    height,
    cardHeight,
    insets,
  );

  return (
    <View style={[styles.overlay, { zIndex: zIndex.modal }]} pointerEvents="box-none">
      {/* Captura de toques fuera de la tarjeta (no se filtran a la app). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { /* swallow */ }} accessibilityElementsHidden>
        <TourSpotlight
          width={width}
          height={height}
          rect={rect}
          overlayColor={commonColors.overlay}
          accent={accent}
        />
      </Pressable>

      <Animated.View
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          if (h > 0 && Math.abs(h - cardHeight) > 1) setCardHeight(h);
        }}
        style={[
          styles.tooltipWrap,
          { top, left, width: cardWidth },
          {
            // Oculta hasta resolver la posición (no parpadea ni salta).
            opacity: resolved ? appear : 0,
            transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
          },
        ]}
        pointerEvents={resolved ? 'box-none' : 'none'}
      >
        <TourTooltip
          label={step.label}
          title={step.title}
          description={step.description}
          stepIndex={index}
          stepCount={applicableSteps.length}
          accent={accent}
          isFirst={index === 0}
          isLast={index === applicableSteps.length - 1}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={finish}
        />
      </Animated.View>
    </View>
  );
}

interface Insets { top: number; bottom: number; left: number; right: number }

/**
 * Calcula posición y ancho de la tarjeta de forma profesional:
 *  - Ancho seguro: mín(320, viewport − márgenes).
 *  - Elige el lado (debajo / encima del elemento) con MÁS espacio libre, de modo
 *    que la tarjeta NUNCA tape el elemento resaltado.
 *  - Respeta safe-areas y nunca se sale de la pantalla (clamp en X e Y).
 *  - Usa la altura real medida (`measuredH`); si aún no se conoce, una estimación.
 */
function computeTooltipPosition(
  rect: TargetRect | null,
  width: number,
  height: number,
  measuredH: number,
  insets: Insets,
): { top: number; left: number; cardWidth: number } {
  const cardWidth = Math.min(TOOLTIP_WIDTH, width - spacing.md * 2);
  const cardH = measuredH > 0 ? measuredH : 240;
  const topSafe = insets.top + spacing.md;
  const bottomSafe = height - insets.bottom - spacing.md;

  // Sin target: tarjeta centrada en pantalla.
  if (!rect) {
    return {
      top: Math.max((height - cardH) / 2, topSafe),
      left: Math.round((width - cardWidth) / 2),
      cardWidth,
    };
  }

  // Horizontal: centrar respecto al elemento, con clamp a los bordes.
  let left = rect.x + rect.width / 2 - cardWidth / 2;
  left = Math.max(spacing.md, Math.min(left, width - cardWidth - spacing.md));

  // Espacio libre por encima y por debajo del elemento (descontando el gap).
  const spaceBelow = bottomSafe - (rect.y + rect.height + TOOLTIP_GAP);
  const spaceAbove = (rect.y - TOOLTIP_GAP) - topSafe;

  let top: number;
  if (spaceBelow >= cardH) {
    // Cabe debajo: justo debajo del elemento.
    top = rect.y + rect.height + TOOLTIP_GAP;
  } else if (spaceAbove >= cardH) {
    // Cabe encima: justo encima del elemento.
    top = rect.y - TOOLTIP_GAP - cardH;
  } else {
    // No cabe completa en ningún lado: usar el lado con más espacio y anclar al
    // borde seguro (la tarjeta puede recortar su contenido por scroll interno,
    // pero NO se superpone al elemento resaltado).
    if (spaceBelow >= spaceAbove) {
      top = Math.max(rect.y + rect.height + TOOLTIP_GAP, bottomSafe - cardH);
    } else {
      top = Math.min(rect.y - TOOLTIP_GAP - cardH, topSafe);
      top = Math.max(top, topSafe);
    }
  }

  // Clamp final dentro de la zona segura.
  top = Math.max(topSafe, Math.min(top, bottomSafe - cardH));

  return { top, left, cardWidth };
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    ...(Platform.OS === 'web' ? ({ position: 'fixed' } as any) : null),
  },
  tooltipWrap: {
    position: 'absolute',
    // El ancho se fija inline (cardWidth) para adaptarse al viewport.
  },
});

export default TourHost;
