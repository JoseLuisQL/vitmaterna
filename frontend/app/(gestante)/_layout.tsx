/**
 * VITMATERNA - Gestante Layout
 * Wrapper layout for the gestante role screens.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { commonColors } from '../../src/theme/colors';
import { RoleGuard } from '../../src/components/layout/RoleGuard';
import { SidebarProvider } from '../../src/components/layout/SidebarProvider';

export default function GestanteLayout(): React.ReactElement {
  return (
    <RoleGuard allow="gestante">
    <SidebarProvider role="gestante">
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: commonColors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="alarmas" options={{ animation: 'slide_from_bottom', presentation: 'card' }} />
      <Stack.Screen name="educacion/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="notificaciones" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="visitas" options={{ animation: 'slide_from_right' }} />
    </Stack>
    </SidebarProvider>
    </RoleGuard>
  );
}
