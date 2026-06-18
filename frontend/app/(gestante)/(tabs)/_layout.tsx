/**
 * VITMATERNA - Gestante Tabs Layout
 * Bottom tab navigator con PillTabBar (indicador animado). Acento: púrpura.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Calendar, Pill, MessageCircle } from 'lucide-react-native';
import { gestanteColors } from '../../../src/theme/colors';
import { PillTabBar } from '../../../src/components/ui/PillTabBar';

export default function GestanteTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PillTabBar {...props} accentColor={gestanteColors.primary} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="tratamiento"
        options={{
          title: 'Tratamiento',
          tabBarIcon: ({ color, size }) => <Pill size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      {/* Funciones secundarias: viven en el sidebar (ocultas de la barra) para
          un look más profesional, igual que en el módulo de administrador. */}
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', href: null }} />
      <Tabs.Screen name="educacion" options={{ title: 'Educación', href: null }} />
    </Tabs>
  );
}
