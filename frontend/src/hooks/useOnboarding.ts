/**
 * useOnboarding — estado de la introducción para usuarios nuevos.
 *
 * Persiste localmente (AsyncStorage), POR USUARIO, si ya vio la pantalla de
 * bienvenida y si ya completó/omitió el tour guiado. No requiere cambios en el
 * backend y funciona offline. Mismo patrón que `useEducationProgress`
 * (claves namespaced con prefijo `vitmaterna_`).
 *
 * Estados:
 *  - `loaded`: false mientras se leen las preferencias (evita parpadeos/gating
 *    prematuro). No mostrar nada de onboarding hasta que sea true.
 *  - `welcomeSeen`: la bienvenida ya se mostró al menos una vez.
 *  - `tourDone`: el tour se completó o se omitió explícitamente.
 *
 * Acciones (idempotentes y tolerantes a fallos de almacenamiento):
 *  - `markWelcomeSeen()` / `markTourDone()`: marcan como visto.
 *  - `reset()`: vuelve a "no visto" (para re-lanzar desde Perfil).
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

type Flag = 'welcome' | 'tour';

/** Clave de almacenamiento por usuario y tipo de marca. */
export const onboardingKey = (userId: string | undefined, flag: Flag): string =>
  `vitmaterna_onboarding_${flag}_${userId || 'anon'}`;

export interface OnboardingState {
  /** true cuando ya se leyeron las preferencias persistidas. */
  loaded: boolean;
  /** La bienvenida ya se mostró al menos una vez para este usuario. */
  welcomeSeen: boolean;
  /** El tour guiado se completó u omitió para este usuario. */
  tourDone: boolean;
  /** Marca la bienvenida como vista. */
  markWelcomeSeen: () => void;
  /** Marca el tour como completado/omitido. */
  markTourDone: () => void;
  /** Reinicia ambas marcas (re-lanzar el onboarding desde Perfil). */
  reset: () => Promise<void>;
}

export function useOnboarding(): OnboardingState {
  const userId = useAuthStore((s) => s.user?.id);
  const [loaded, setLoaded] = useState(false);
  const [welcomeSeen, setWelcomeSeen] = useState(false);
  const [tourDone, setTourDone] = useState(false);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    (async () => {
      try {
        const [w, t] = await Promise.all([
          AsyncStorage.getItem(onboardingKey(userId, 'welcome')),
          AsyncStorage.getItem(onboardingKey(userId, 'tour')),
        ]);
        if (!active) return;
        setWelcomeSeen(w === 'true');
        setTourDone(t === 'true');
      } catch {
        /* noop: ante un fallo de lectura, se asume "no visto" */
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const markWelcomeSeen = useCallback(() => {
    setWelcomeSeen(true);
    AsyncStorage.setItem(onboardingKey(userId, 'welcome'), 'true').catch(() => {});
  }, [userId]);

  const markTourDone = useCallback(() => {
    setTourDone(true);
    AsyncStorage.setItem(onboardingKey(userId, 'tour'), 'true').catch(() => {});
  }, [userId]);

  const reset = useCallback(async () => {
    setWelcomeSeen(false);
    setTourDone(false);
    try {
      await AsyncStorage.multiRemove([
        onboardingKey(userId, 'welcome'),
        onboardingKey(userId, 'tour'),
      ]);
    } catch {
      /* noop */
    }
  }, [userId]);

  return { loaded, welcomeSeen, tourDone, markWelcomeSeen, markTourDone, reset };
}
