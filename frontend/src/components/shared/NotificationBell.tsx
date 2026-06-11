/**
 * VITMATERNA — Campana de notificaciones con badge de no leídas.
 * Navega a la bandeja de notificaciones del rol correspondiente.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUnreadCount } from '../../services/api-queries';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface Props {
  /** Ruta de la bandeja de notificaciones del rol. */
  href: string;
  color?: string;
  size?: number;
}

export function NotificationBell({ href, color = commonColors.text, size = 24 }: Props): React.ReactElement {
  const router = useRouter();
  const { data: count = 0 } = useUnreadCount();

  return (
    <TouchableOpacity
      onPress={() => router.push(href as never)}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones${count > 0 ? `, ${count} sin leer` : ''}`}
      style={styles.btn}
    >
      <Bell size={size} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: semanticColors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.overline, color: commonColors.white, fontSize: 9, letterSpacing: 0 },
});
