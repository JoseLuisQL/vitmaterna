/**
 * VITMATERNA - Obstetra Tabs Layout
 * Bottom tab navigator with 5 tabs using Lucide icons.
 * Active color: obstetraColors.primary (ciruela)
 */
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  Home,
  Baby,
  Calendar,
  Bell,
  User,
} from 'lucide-react-native';
import { obstetraColors, commonColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';

export default function ObstetraTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: obstetraColors.primary,
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
        name="gestantes"
        options={{
          title: 'Gestantes',
          tabBarIcon: ({ color, size }) => (
            <Baby size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cronograma"
        options={{
          title: 'Cronograma',
          tabBarIcon: ({ color, size }) => (
            <Calendar size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color, size }) => (
            <Bell size={size} color={color} />
          ),
          tabBarBadge: 3,
          tabBarBadgeStyle: styles.badge,
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
        name="reportes"
        options={{
          title: 'Reportes',
          href: null,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
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
    letterSpacing: 0.1,
  },
  tabItem: {
    paddingVertical: 4,
  },
  badge: {
    backgroundColor: obstetraColors.primary,
    fontSize: 10,
    fontWeight: '700',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
  },
});
