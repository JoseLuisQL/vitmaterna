/**
 * VITMATERNA — Tema (claro / oscuro)
 *
 * Provee el esquema de neutros activo (claro u oscuro) y la preferencia del
 * usuario. El modo se resuelve así:
 *   - 'system'  → sigue useColorScheme() del dispositivo
 *   - 'light'   → siempre claro
 *   - 'dark'    → siempre oscuro
 * La preferencia se persiste en AsyncStorage.
 *
 * Migración incremental: las pantallas que aún leen `commonColors` directo
 * siguen funcionando (modo claro). Las que se migren a `useThemedColors()` /
 * `useThemedStyles()` reaccionarán al tema.
 */
import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { commonColors, commonColorsDark } from './colors';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeColors = Record<keyof typeof commonColors, string>;

const STORAGE_KEY = 'vitmaterna_theme_mode';

interface ThemeContextValue {
  mode: ThemeMode;            // preferencia del usuario
  scheme: 'light' | 'dark';  // esquema efectivo resuelto
  colors: ThemeColors;       // neutros del esquema activo
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  scheme: 'light',
  colors: commonColors,
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const isDark = scheme === 'dark';

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, isDark, colors: isDark ? commonColorsDark : commonColors, setMode }),
    [mode, scheme, isDark, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Atajo para obtener solo los neutros del tema activo. */
export function useThemedColors(): ThemeColors {
  return useContext(ThemeContext).colors;
}

/**
 * Crea estilos dependientes del tema. `factory` recibe los neutros activos.
 * Uso:
 *   const styles = useThemedStyles((c) => StyleSheet.create({ box: { backgroundColor: c.surface } }));
 */
export function useThemedStyles<T>(factory: (c: ThemeColors) => T): T {
  const colors = useThemedColors();
  return useMemo(() => factory(colors), [colors, factory]);
}
