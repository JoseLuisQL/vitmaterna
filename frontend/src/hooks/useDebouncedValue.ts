/**
 * useDebouncedValue — devuelve el valor "estabilizado" tras un retardo.
 *
 * Evita que las búsquedas/filtros se recalculen en cada tecla: el valor
 * retornado solo cambia cuando el usuario deja de escribir durante `delay` ms.
 * Hace las búsquedas más precisas y reduce trabajo innecesario (renders/red).
 */
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debounced;
}

export default useDebouncedValue;
