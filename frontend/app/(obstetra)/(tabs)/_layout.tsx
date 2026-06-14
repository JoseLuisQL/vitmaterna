/**
 * VITMATERNA - Obstetra Tabs Layout
 * Bottom tab navigator con PillTabBar (indicador animado). Acento: azul.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Baby, Calendar, MessageCircle, User } from 'lucide-react-native';
import { obstetraColors } from '../../../src/theme/colors';
import { PillTabBar } from '../../../src/components/ui/PillTabBar';

export default function ObstetraTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PillTabBar {...props} accentColor={obstetraColors.primary} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="gestantes"
        options={{
          title: 'Gestantes',
          tabBarIcon: ({ color, size }) => <Baby size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cronograma"
        options={{
          title: 'Cronograma',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="reportes" options={{ title: 'Reportes', href: null }} />
      <Tabs.Screen name="alertas" options={{ title: 'Alertas', href: null }} />
    </Tabs>
  );
}
