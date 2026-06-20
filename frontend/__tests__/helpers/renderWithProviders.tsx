/**
 * Harness de pruebas: envuelve componentes con los providers mínimos que las
 * pantallas necesitan (SafeArea + React Query). Cada test crea su propio
 * QueryClient con reintentos desactivados para que los estados (loading/empty/
 * error) sean deterministas.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

export function makeTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderWithProviders(
  ui: React.ReactElement,
  client: QueryClient = makeTestQueryClient(),
) {
  return render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <QueryClientProvider client={client}>{ui}</QueryClientProvider>
    </SafeAreaProvider>,
  );
}

/** Solo SafeArea (para componentes presentacionales sin datos). */
export function renderWithSafeArea(ui: React.ReactElement) {
  return render(<SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>);
}
