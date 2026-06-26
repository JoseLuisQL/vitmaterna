/**
 * VITMATERNA - Root Layout
 * Provides SafeAreaProvider, QueryClientProvider, DatabaseProvider, auth state initialization.
 */
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useAuthStore } from '../src/store/authStore';
import { ToastProvider } from '../src/components/ui/ToastProvider';
import { ConfirmHost } from '../src/components/ui/ConfirmHost';
import { WebShell } from '../src/components/web/WebShell';
import { OnboardingGate } from '../src/components/onboarding/OnboardingGate';
import { TourHost } from '../src/components/tour/TourHost';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
import { SplashScreen } from '../src/components/ui/SplashScreen';
import { MaintenanceScreen } from '../src/components/ui/MaintenanceScreen';
import { useSystemStatus } from '../src/hooks/useSystemStatus';
import { commonColors } from '../src/theme/colors';
import { initializeDatabase } from '../src/database/init';
import { usePushNotifications } from '../src/hooks/usePushNotifications';
import { useOfflinePrefetch } from '../src/hooks/useOfflinePrefetch';
import { queryClient, startQueryPersistence } from '../src/services/queryClient';
import { initNetwork } from '../src/services/network';
import { initOutbox } from '../src/services/outbox';

// Conectividad + persistencia + cola offline se inician una sola vez, antes de
// montar el árbol (idempotentes).
initNetwork();
startQueryPersistence();
initOutbox(queryClient);

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    * { scrollbar-width: thin; scrollbar-color: #C6D0D3 transparent; }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background-color: #C6D0D3; border-radius: 10px; border: 2px solid transparent; background-clip: content-box; }
    ::-webkit-scrollbar-thumb:hover { background-color: #7E8F99; }
    @media (prefers-color-scheme: dark) {
      * { scrollbar-color: #384A50 transparent; }
      ::-webkit-scrollbar-thumb { background-color: #384A50; }
      ::-webkit-scrollbar-thumb:hover { background-color: #6E8088; }
    }
  `;
  document.head.appendChild(style);
}

export default function RootLayout(): React.ReactElement | null {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    loadStoredAuth();
    initializeDatabase();
  }, [loadStoredAuth]);

  if (!isInitialized || !fontsLoaded) {
    // Mientras cargan fuentes/sesión mostramos la pantalla de carga de marca
    // (logo oficial + animación), no una pantalla en blanco.
    return (
      <SafeAreaProvider>
        <SplashScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <ThemedStatusBar />
            <MaintenanceGate>
              <WebShell>
                <OnboardingGate>
                  <AppNavigator />
                </OnboardingGate>
              </WebShell>
            </MaintenanceGate>
            <OfflineBanner />
            <ConfirmHost />
            <TourHost />
          </ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** StatusBar que se adapta al tema activo. */
function ThemedStatusBar(): React.ReactElement {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

/**
 * Puerta de mantenimiento: si el admin activó el modo mantenimiento, muestra la
 * pantalla de mantenimiento a gestantes y obstetras autenticados. El admin
 * queda exento (sigue operando para poder desactivarlo) y los usuarios sin
 * sesión ven la app normal (login).
 */
function MaintenanceGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const { data, refetch, isFetching } = useSystemStatus();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  const enabled = data?.maintenance?.enabled ?? false;
  const blocked = enabled && isAuthenticated && role !== 'admin';

  if (blocked) {
    return (
      <MaintenanceScreen
        message={data?.maintenance?.message}
        role={role}
        onRetry={() => refetch()}
        retrying={isFetching}
      />
    );
  }

  return <>{children}</>;
}

/**
 * Navegación raíz. Vive dentro de QueryClientProvider y del contexto de router,
 * por lo que aquí se conecta la recepción de notificaciones push.
 */
function AppNavigator(): React.ReactElement {
  usePushNotifications();
  useOfflinePrefetch();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: commonColors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(gestante)" />
      <Stack.Screen name="(obstetra)" />
      <Stack.Screen name="(admin)" />
    </Stack>
  );
}
