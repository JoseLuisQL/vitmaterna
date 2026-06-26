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
import { View, StyleSheet, Pressable, useWindowDimensions, Platform, InteractionManager } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { colors as roleColorMap, commonColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { zIndex } from '../../theme/zIndex';
import { useResponsive } from '../../theme/responsive';
import { haptics } from '../../utils/haptics';
import type { UserRole } from '../../types/user';
import type { TargetRect, TourStep } from './types';
import { _registerTourHost } from './tourController';
import { measureTarget, scrollTargetIntoView } from './tourTargets';
import { TourSpotlight } from './TourSpotlight';
import { TourTooltip } from './TourTooltip';

const TOOLTIP_WIDTH = 320;
const TOOLTIP_GAP = 16;
const MEASURE_RETRIES = 6;
const MEASURE_DELAY = 120;

interface Props {
  /** Se llama cuando el tour termina (finalizado u omitido). */
  onFinish?: () => void;
}

export function TourHost({ onFinish }: Props): React.ReactElement | null {
  const { width, height } = useWindowDimensions();
  const { webShell } = useResponsive();
  const role = (useAuthStore((s) => s.user?.role) as UserRole | undefined) ?? 'gestante';
  const accent = (roleColorMap[role] ?? roleColorMap.gestante).primary;
  const { markTourDone } = useOnboarding();

  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<TargetRect | null>(null);
  const cancelled = useRef(false);

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

    (async () => {
      if (step.navigateTo) {
        try {
          router.navigate(step.navigateTo as any);
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

      if (!step.targetId) {
        // Paso centrado (sin spotlight).
        if (active) setRect(null);
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
          if (active) setRect(measured);
          return;
        }
        await new Promise((r) => setTimeout(r, MEASURE_DELAY));
      }
      // No se pudo medir: mostrar el paso centrado (no romper el flujo).
      if (active) setRect(null);
    })();

    return () => {
      active = false;
    };
  }, [step]);

  const handleNext = useCallback(() => {
    haptics.selection();
    setIndex((i) => i + 1);
  }, []);

  const handlePrev = useCallback(() => {
    haptics.selection();
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  if (!step || !applicableSteps) return null;

  // Posición de la tarjeta: bajo el target si cabe, si no encima; centrada si no
  // hay rect.
  const tooltipStyle = computeTooltipPosition(rect, width, height);

  return (
    <View style={[styles.overlay, { zIndex: zIndex.modal }]} pointerEvents="box-none">
      {/* Captura de toques fuera de la tarjeta (no se filtran a la app). */}
      <Pressable style={StyleSheet.absoluteFill} onPress={() => { /* swallow */ }} accessibilityElementsHidden>
        <TourSpotlight
          width={width}
          height={height}
          rect={rect}
          shape={step.shape}
          overlayColor={commonColors.overlay}
        />
      </Pressable>

      <View style={[styles.tooltipWrap, tooltipStyle]} pointerEvents="box-none">
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
      </View>
    </View>
  );
}

/** Calcula la posición de la tarjeta respecto al target. */
function computeTooltipPosition(
  rect: TargetRect | null,
  width: number,
  height: number,
): { top: number; left: number } {
  const estimatedHeight = 220;
  if (!rect) {
    // Centrado.
    return {
      top: Math.max((height - estimatedHeight) / 2, spacing.lg),
      left: Math.max((width - TOOLTIP_WIDTH) / 2, spacing.md),
    };
  }

  // Horizontal: alinear con el target, sin salirse de la pantalla.
  let left = rect.x + rect.width / 2 - TOOLTIP_WIDTH / 2;
  left = Math.max(spacing.md, Math.min(left, width - TOOLTIP_WIDTH - spacing.md));

  // Vertical: debajo del target si cabe; si no, encima.
  const below = rect.y + rect.height + TOOLTIP_GAP;
  const fitsBelow = below + estimatedHeight < height - spacing.lg;
  const top = fitsBelow
    ? below
    : Math.max(rect.y - estimatedHeight - TOOLTIP_GAP, spacing.lg);

  return { top, left };
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
    width: TOOLTIP_WIDTH,
    maxWidth: '100%',
  },
});

export default TourHost;
