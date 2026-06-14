/**
 * VITMATERNA - Root Layout
 * Provides SafeAreaProvider, QueryClientProvider, DatabaseProvider, auth state initialization.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
import { commonColors } from '../src/theme/colors';
import { initializeDatabase } from '../src/database/init';
import { usePushNotifications } from '../src/hooks/usePushNotifications';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      // Datos "frescos" por poco tiempo para favorecer la actualización
      // en tiempo real al volver a una pantalla o reenfocar la app.
      staleTime: 15 * 1000, // 15 segundos
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

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
