/**
 * VITMATERNA — Campana de notificaciones con badge de no leídas.
 * Navega a la bandeja de notificaciones del rol correspondiente.
 *
 * Variante `glass` (por defecto en headers con gradiente): botón circular
 * translúcido con campana blanca, alineado al resto de acciones del header.
 */
import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useUnreadCount } from '../../services/api-queries';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius } from '../../theme/spacing';

interface Props {
  /** Ruta de la bandeja de notificaciones del rol. */
  href: string;
  /** 'glass' = sobre header con gradiente (blanco translúcido). 'plain' = ícono suelto. */
  variant?: 'glass' | 'plain';
  color?: string;
  size?: number;
}

export function NotificationBell({
  href,
  variant = 'glass',
  color,
  size = 22,
}: Props): React.ReactElement {
  const router = useRouter();
  const { data: count = 0 } = useUnreadCount();
  const iconColor = color ?? (variant === 'glass' ? commonColors.white : commonColors.text);

  return (
    <TouchableOpacity
      onPress={() => router.push(href as never)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={`Notificaciones${count > 0 ? `, ${count} sin leer` : ''}`}
      style={[styles.btn, variant === 'glass' && styles.glass]}
      activeOpacity={0.7}
    >
      <Bell size={size} color={iconColor} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.full },
  glass: { backgroundColor: 'rgba(255,255,255,0.18)' },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: semanticColors.danger,
    borderWidth: 1.5,
    borderColor: commonColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.overline, color: commonColors.white, fontSize: 9, letterSpacing: 0 },
});
