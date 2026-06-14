/**
 * VITMATERNA - Root Layout
 * Provides SafeAreaProvider, QueryClientProvider, DatabaseProvider, auth state initialization.
 */
import React, { useEffect } from 'react';
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
import { MobileFrame } from '../src/components/ui/MobileFrame';
import { OfflineBanner } from '../src/components/ui/OfflineBanner';
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
    return null; // La pantalla splash se muestra mientras carga
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <StatusBar style="dark" />
          <MobileFrame>
            <AppNavigator />
          </MobileFrame>
          <OfflineBanner />
        </ToastProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
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
