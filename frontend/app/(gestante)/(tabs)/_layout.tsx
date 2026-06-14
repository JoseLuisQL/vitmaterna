/**
 * VITMATERNA - Gestante Tabs Layout
 * Bottom tab navigator with 5 tabs using Lucide icons.
 * Active color: gestanteColors.primary (teal)
 */
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  Home,
  Calendar,
  Pill,
  MessageCircle,
  User,
} from 'lucide-react-native';
import { gestanteColors, commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';

export default function GestanteTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: gestanteColors.primary,
        tabBarInactiveTintColor: commonColors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="citas"
        options={{
          title: 'Citas',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tratamiento"
        options={{
          title: 'Tratamiento',
          tabBarIcon: ({ color, size }) => (
            <Pill size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="mi-progreso"
        options={{
          title: 'Mi Progreso',
          href: null,
        }}
      />
      <Tabs.Screen
        name="educacion"
        options={{
          title: 'Educación',
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: commonColors.surface,
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    ...shadows.sm,
  },
  tabLabel: {
    ...typography.overline,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  tabItem: {
    paddingVertical: 4,
  },
});
