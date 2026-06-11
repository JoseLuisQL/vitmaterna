import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';

/**
 * Re-ejecuta los refetch indicados cada vez que la pantalla recupera el foco.
 * Útil para mantener los datos en tiempo real al navegar entre pestañas.
 */
export function useRefetchOnFocus(refetchers: Array<() => unknown>): void {
  useFocusEffect(
    useCallback(() => {
      refetchers.forEach((r) => r());
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );
}
