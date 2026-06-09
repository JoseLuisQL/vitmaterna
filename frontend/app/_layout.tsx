/**
 * VITMATERNA - Root Layout
 * Provides SafeAreaProvider, QueryClientProvider, DatabaseProvider, auth state initialization.
 */
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { commonColors } from '../src/theme/colors';
import { initializeDatabase } from '../src/database/init';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (was cacheTime)
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout(): React.ReactElement | null {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);
  const isInitialized = useAuthStore((s) => s.isInitialized);

  useEffect(() => {
    loadStoredAuth();
    initializeDatabase();
  }, [loadStoredAuth]);

  if (!isInitialized) {
    return null; // Splash screen will show while loading
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" />
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
