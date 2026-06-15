/**
 * VITMATERNA - Obstetra Layout
 * Wrapper layout for the obstetra role screens.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { commonColors } from '../../src/theme/colors';

export default function ObstetraLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: commonColors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="atender/[appointmentId]" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="gestante/tamizajes" />
      <Stack.Screen name="mensaje-masivo" options={{ animation: 'slide_from_bottom', presentation: 'card' }} />
      <Stack.Screen name="notificaciones" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
