/**
 * VITMATERNA - Obstetra Tabs Layout
 * Bottom tab navigator con PillTabBar (indicador animado). Acento: azul.
 */
import React from 'react';
import { Tabs } from 'expo-router';
import { Home, Baby, Calendar, MessageCircle } from 'lucide-react-native';
import { obstetraColors } from '../../../src/theme/colors';
import { PillTabBar } from '../../../src/components/ui/PillTabBar';
import { useUnreadCount } from '../../../src/services/api-queries';

export default function ObstetraTabsLayout(): React.ReactElement {
  // Badge en el Chat: avisos sin leer (incluye signos de alarma / emergencias,
  // que ahora viven en el chat). El módulo "Alertas" se eliminó para evitar
  // redundancia con Notificaciones y Chat.
  const { data: unread = 0 } = useUnreadCount();

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
          title: 'Agenda',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
          tabBarBadge: unread > 0 ? unread : undefined,
        }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', href: null }} />
      <Tabs.Screen name="reportes" options={{ title: 'Reportes', href: null }} />
    </Tabs>
  );
}
