/**
 * VITMATERNA - Admin Tabs Layout
 * Bottom tab navigator for System Admin role.
 */
import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import {
  Users,
  FileText,
  Settings,
  ShieldAlert,
} from 'lucide-react-native';
import { commonColors, semanticColors } from '../../../src/theme/colors';
import { typography } from '../../../src/theme/typography';
import { shadows } from '../../../src/theme/shadows';

export default function AdminTabsLayout(): React.ReactElement {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: semanticColors.info,
        tabBarInactiveTintColor: commonColors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="usuarios"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <Users size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="contenido"
        options={{
          title: 'Contenido',
          tabBarIcon: ({ color, size }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="config"
        options={{
          title: 'Config',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="auditoria"
        options={{
          title: 'Auditoría',
          tabBarIcon: ({ color, size }) => (
            <ShieldAlert size={size} color={color} />
          ),
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
    fontFamily: typography.caption.fontFamily,
    fontSize: 11,
    fontWeight: '600',
  },
  tabItem: {
    paddingVertical: 4,
  },
});
