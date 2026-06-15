/**
 * useEducationProgress — progreso de lectura y favoritos del contenido educativo.
 *
 * Persiste localmente (AsyncStorage) qué artículos ha leído la gestante y cuáles
 * marcó como favoritos, por usuario. No requiere cambios en el backend y funciona
 * offline. Pensado como una librería de contenidos tipo app del mercado.
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

const keyFor = (userId: string | undefined, kind: 'read' | 'fav') =>
  `vitmaterna_edu_${kind}_${userId || 'anon'}`;

export function useEducationProgress() {
  const userId = useAuthStore((s) => s.user?.id);
  const [read, setRead] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [r, f] = await Promise.all([
          AsyncStorage.getItem(keyFor(userId, 'read')),
          AsyncStorage.getItem(keyFor(userId, 'fav')),
        ]);
        if (!active) return;
        setRead(new Set(r ? JSON.parse(r) : []));
        setFavorites(new Set(f ? JSON.parse(f) : []));
      } catch {
        /* noop */
      } finally {
        if (active) setLoaded(true);
      }
    })();
    return () => { active = false; };
  }, [userId]);

  const persist = useCallback(
    (kind: 'read' | 'fav', set: Set<string>) => {
      AsyncStorage.setItem(keyFor(userId, kind), JSON.stringify([...set])).catch(() => {});
    },
    [userId],
  );

  const markRead = useCallback(
    (id: string) => {
      setRead((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist('read', next);
        return next;
      });
    },
    [persist],
  );

  const toggleFavorite = useCallback(
    (id: string) => {
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist('fav', next);
        return next;
      });
    },
    [persist],
  );

  const isRead = useCallback((id: string) => read.has(id), [read]);
  const isFavorite = useCallback((id: string) => favorites.has(id), [favorites]);

  return { loaded, read, favorites, markRead, toggleFavorite, isRead, isFavorite };
}
