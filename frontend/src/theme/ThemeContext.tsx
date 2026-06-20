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
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    // Forzado a modo claro porque el modo oscuro/sistema está en desarrollo
    setModeState('light');
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    if (m === 'light') {
      setModeState('light');
      AsyncStorage.setItem(STORAGE_KEY, 'light').catch(() => {});
    }
  }, []);

  const scheme: 'light' | 'dark' = 'light';
  const isDark = false;

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, scheme, isDark, colors: commonColors, setMode }),
    [mode, setMode],
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
