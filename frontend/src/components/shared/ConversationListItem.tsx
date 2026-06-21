/**
 * VITMATERNA — ConversationListItem (fila de la bandeja de chats, estilo WhatsApp)
 *
 * Fila profesional y consistente para la lista de conversaciones, tanto del
 * obstetra (lista de gestantes) como de la gestante. Muestra:
 *   - Avatar circular con inicial sobre color de acento (o color de riesgo).
 *   - Nombre + hora del último mensaje (resaltada si hay no leídos).
 *   - DNI opcional (obstetra) y preview del último mensaje con icono por tipo.
 *   - Badge contador de mensajes no leídos.
 *   - Punto verde de presencia "en línea".
 *
 * Solo usa tokens del tema. Sirve igual en móvil y en el portal web (la fila
 * activa se resalta con `selected`).
 */
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Check, CheckCheck } from 'lucide-react-native';
import { commonColors, semanticColors, riskColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { IS_WEB } from '../../theme/responsive';
import { formatInboxTime, chatPreview, previewIcon } from '../../utils/chatFormat';
import { normalizeRisk } from '../../utils/statusVariant';

export interface ConversationRow {
  id: string | null;
  gestanteId?: string;
  nombre: string;
  dni?: string | null;
  nivelRiesgo?: string | null;
  otherUserId?: string | null;
  lastSeenAt?: string | null;
  lastMessage?: string;
  lastMessageType?: string | null;
  lastMessageAt?: string | null;
  lastMessageMine?: boolean;
  unreadCount?: number;
}

interface Props {
  item: ConversationRow;
  /** Acento del rol (avatar y resaltes). */
  accent: string;
  onPress: () => void;
  /** Resalta la fila activa (vista master-detail en web). */
  selected?: boolean;
  /** Pinta el avatar con el color del semáforo de riesgo (bandeja del obstetra). */
  useRiskColor?: boolean;
  /** true si el otro participante está en línea (punto verde). */
  online?: boolean;
}

const RISK_AVATAR: Record<0 | 1 | 2, string> = {
  0: riskColors.riskGreen,
  1: riskColors.riskYellow,
  2: riskColors.riskRed,
};

function initials(name?: string | null): string {
  const safe = (name ?? '').toString();
  const parts = safe.replace(/^obst\.?\s*/i, '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
}

export function ConversationListItem({
  item,
  accent,
  onPress,
  selected = false,
  useRiskColor = false,
  online = false,
}: Props): React.ReactElement {
  const nombre = item.nombre || 'Gestante';
  const unread = item.unreadCount ?? 0;
  const hasUnread = unread > 0;
  const avatarColor = useRiskColor ? RISK_AVATAR[normalizeRisk(item.nivelRiesgo as any)] : accent;
  const time = formatInboxTime(item.lastMessageAt);
  const Icon = previewIcon(item.lastMessageType);
  const isEmergency = item.lastMessageType === 'alerta_emergencia';
  const preview = chatPreview(item.lastMessageType, item.lastMessage, 'Toca para escribir');
  const previewColor = isEmergency
    ? semanticColors.danger
    : hasUnread
      ? commonColors.text
      : commonColors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir conversación con ${nombre}${hasUnread ? `, ${unread} sin leer` : ''}`}
      style={({ pressed, hovered }: any) => [
        styles.row,
        selected && { backgroundColor: accent + '12' },
        hovered && !selected && { backgroundColor: commonColors.surfaceHover },
        pressed && !selected && { backgroundColor: commonColors.surfaceAlt },
        IS_WEB && ({ cursor: 'pointer', outlineStyle: 'none' } as any),
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
        <Text style={styles.avatarText}>{initials(nombre)}</Text>
        {online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
            {nombre}
          </Text>
          {!!time && (
            <Text style={[styles.time, hasUnread && { color: accent }]}>{time}</Text>
          )}
        </View>

        <View style={styles.bottomRow}>
          {item.lastMessageMine && !isEmergency && (
            item.lastMessageType === 'texto' || item.lastMessageType == null ? (
              <CheckCheck size={14} color={commonColors.textTertiary} style={styles.tick} />
            ) : null
          )}
          {Icon && (
            <Icon size={14} color={isEmergency ? semanticColors.danger : previewColor} style={styles.previewIcon} />
          )}
          <Text style={[styles.preview, { color: previewColor }, (hasUnread || isEmergency) && styles.previewStrong]} numberOfLines={1}>
            {item.lastMessageMine && (item.lastMessageType === 'texto' || item.lastMessageType == null) ? `Tú: ${preview}` : preview}
          </Text>
          {hasUnread && (
            <View style={[styles.badge, isEmergency && { backgroundColor: semanticColors.danger }, !isEmergency && { backgroundColor: accent }]}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>

        {item.dni ? <Text style={styles.dni}>DNI {item.dni}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...typography.h4, color: commonColors.white, fontWeight: '700' },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: semanticColors.success,
    borderWidth: 2.5,
    borderColor: commonColors.surface,
  },
  info: { flex: 1, minWidth: 0, gap: 3 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { ...typography.bodyMd, color: commonColors.text, flex: 1 },
  nameUnread: { fontWeight: '700' },
  time: { ...typography.caption, color: commonColors.textTertiary },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tick: { flexShrink: 0 },
  previewIcon: { flexShrink: 0 },
  preview: { ...typography.bodySm, flex: 1 },
  previewStrong: { fontWeight: '600' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: { ...typography.caption, fontSize: 11, fontWeight: '800', color: commonColors.white },
  dni: { ...typography.caption, color: commonColors.textTertiary },
});

export default ConversationListItem;
