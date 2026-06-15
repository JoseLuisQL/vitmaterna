/**
 * VITMATERNA - Admin Layout
 * Wrapper layout for the admin role screens.
 */
import React from 'react';
import { Stack } from 'expo-router';
import { commonColors } from '../../src/theme/colors';

export default function AdminLayout(): React.ReactElement {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: commonColors.background },
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="supervision/reportes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="supervision/gestantes" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="supervision/citas" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
