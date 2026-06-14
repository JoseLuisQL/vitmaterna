/**
 * VITMATERNA — Contador de cambios pendientes de sincronizar (outbox).
 * Se actualiza al cambiar la cola (subscribeOutbox) y al cambiar la conexión.
 */
import { useEffect, useState } from 'react';
import { pendingCount, subscribeOutbox } from '../services/outbox';
import { subscribeOnline } from '../services/network';

export function usePendingSync(): number {
  const [count, setCount] = useState(() => pendingCount());

  useEffect(() => {
    const refresh = () => setCount(pendingCount());
    refresh();
    const unsubA = subscribeOutbox(refresh);
    const unsubB = subscribeOnline(refresh);
    return () => {
      unsubA();
      unsubB();
    };
  }, []);

  return count;
}
