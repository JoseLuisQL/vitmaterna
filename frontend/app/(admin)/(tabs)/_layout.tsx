/**
 * VITMATERNA - Admin Tabs Layout
 * Bottom tab navigator con PillTabBar (indicador animado). Acento: slate.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Users, FileText, Settings, ShieldAlert, Building2 } from 'lucide-react-native';
import { adminColors } from '../../../src/theme/colors';
import { PillTabBar } from '../../../src/components/ui/PillTabBar';

export default function AdminTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PillTabBar {...props} accentColor={adminColors.primary} />}
    >
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="contenido"
        options={{
          title: 'Contenido',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="sedes"
        options={{
          title: 'Sedes',
          tabBarIcon: ({ color, size }) => <Building2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="auditoria"
        options={{
          title: 'Auditoría',
          tabBarIcon: ({ color, size }) => <ShieldAlert size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
