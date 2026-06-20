/**
 * VITMATERNA — SectionCard (sección de contenido dentro de una pantalla)
 *
 * Unifica el patrón "tarjeta con título + acción + cuerpo" que hoy se
 * reimplementa a mano en dashboards y fichas (ej. "Distribución de riesgo",
 * "Citas de hoy", secciones clínicas). Da ritmo vertical y jerarquía
 * consistentes sin que cada pantalla repita estilos de tarjeta/encabezado.
 *
 * Anatomía: [icono?] título + subtítulo? ............ acción? │ cuerpo.
 */
import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppCard } from '../ui/AppCard';
import { AppText } from '../ui/AppText';
import { LinkButton } from '../ui/LinkButton';
import { commonColors } from '../../theme/colors';
import { spacing, borderRadius } from '../../theme/spacing';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  icon?: LucideIcon;
  /** Acción de cabecera (p. ej. "Ver todas"). */
  action?: { label: string; onPress: () => void };
  /** Color de acento del rol (icono + acción). */
  accentColor?: string;
  children: React.ReactNode;
  /** Sin padding interno (para listas full-bleed dentro de la tarjeta). */
  noBodyPadding?: boolean;
  style?: ViewStyle;
}

export function SectionCard({
  title,
  subtitle,
  icon: Icon,
  action,
  accentColor = commonColors.textSecondary,
  children,
  noBodyPadding = false,
  style,
}: SectionCardProps): React.ReactElement {
  const hasHeader = Boolean(title || action);
  return (
    <AppCard style={[styles.card, style]} noPadding>
      {hasHeader ? (
        <View style={styles.header}>
          {Icon ? (
            <View style={[styles.iconWrap, { backgroundColor: accentColor + '14' }]}>
              <Icon size={18} color={accentColor} />
            </View>
          ) : null}
          <View style={styles.titleWrap}>
            {title ? <AppText variant="h4">{title}</AppText> : null}
            {subtitle ? (
              <AppText variant="caption" color={commonColors.textSecondary} numberOfLines={1}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {action ? <LinkButton label={action.label} onPress={action.onPress} color={accentColor} /> : null}
        </View>
      ) : null}
      <View style={noBodyPadding ? undefined : styles.body}>{children}</View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, minWidth: 0 },
  body: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: spacing.xs },
});

export default SectionCard;
