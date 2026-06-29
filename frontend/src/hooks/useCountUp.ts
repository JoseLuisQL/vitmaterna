/**
 * useCountUp — anima un número de 0 (o un valor previo) al valor objetivo.
 * Respeta `useReducedMotion`: si el usuario tiene reduce-motion, salta al
 * valor final sin animación.
 *
 *   const display = useCountUp(target, 900);  // 900ms
 *   <Text>{display}</Text>
 *
 * Implementación sin `runOnJS` (worklets) para ser compatible con el
 * entorno de tests de Jest, donde la parte nativa de worklets no se
 * inicializa. Usa un intervalo de JS que sincroniza el display.
 */
import { useEffect, useState } from 'react';
import { withTiming, Easing, useSharedValue } from 'react-native-reanimated';
import { useReducedMotion } from '../theme/motion';

export function useCountUp(target: number, durationMs = 900): number {
  const reduceMotion = useReducedMotion();
  const shared = useSharedValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(target);
      shared.value = target;
      return;
    }
    shared.value = 0;
    // Animación nativa del shared value (no lee JS, pero sincronizamos el
    // display con un intervalo para no usar runOnJS/worklets en JS thread).
    shared.value = withTiming(target, { duration: durationMs, easing: Easing.out(Easing.cubic) });
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= durationMs) {
        setDisplay(target);
        clearInterval(id);
        return;
      }
      // Aproximación del progreso con el mismo easing cúbico de salida.
      const t = elapsed / durationMs;
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(target * eased));
    }, 16);
    return () => clearInterval(id);
  }, [target, durationMs, reduceMotion, shared]);

  return display;
}
