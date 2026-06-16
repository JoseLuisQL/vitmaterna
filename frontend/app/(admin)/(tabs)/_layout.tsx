/**
 * VITMATERNA - Admin Tabs Layout
 * Bottom tab navigator con PillTabBar (indicador animado). Acento: slate.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Users, FileText } from 'lucide-react-native';
import { adminColors } from '../../../src/theme/colors';
import { PillTabBar } from '../../../src/components/ui/PillTabBar';

export default function AdminTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <PillTabBar {...props} accentColor={adminColors.primary} />}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
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
      {/* 'Más' ya no es un tab: su contenido vive en el sidebar (menú lateral),
          igual que en gestante y obstetra. Se mantiene la ruta oculta por si
          algún enlace antiguo apunta a ella. */}
      <Tabs.Screen name="mas" options={{ title: 'Más', href: null }} />
      {/* Funciones esporádicas: viven en el sidebar (ocultas de la barra) */}
      <Tabs.Screen name="sedes" options={{ title: 'Sedes', href: null }} />
      <Tabs.Screen name="config" options={{ title: 'Config', href: null }} />
      <Tabs.Screen name="auditoria" options={{ title: 'Auditoría', href: null }} />
      <Tabs.Screen name="notificaciones" options={{ title: 'Notificaciones', href: null }} />
    </Tabs>
  );
}
