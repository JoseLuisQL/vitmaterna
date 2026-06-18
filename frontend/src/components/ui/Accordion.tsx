/**
 * VITMATERNA — Accordion (sección colapsable)
 * Encabezado con icono opcional + contador, contenido plegable. Pensado para
 * descongestionar vistas con muchos datos (p. ej. la historia clínica), dejando
 * abierto solo lo importante y plegado el detalle.
 */
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { ChevronDown, type LucideIcon } from 'lucide-react-native';
import { commonColors, obstetraColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

// Habilita LayoutAnimation en Android (en web/iOS ya funciona).
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface AccordionProps {
  title: string;
  icon?: LucideIcon;
  /** Contador opcional a la derecha del título (p. ej. nº de antecedentes). */
  count?: number;
  /** Estado inicial (abierto/cerrado). */
  defaultOpen?: boolean;
  /** Color de acento (icono y chevron). */
  accentColor?: string;
  /** Acción opcional en el encabezado (p. ej. botón "Editar"/"Añadir"). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function Accordion({
  title,
  icon: Icon,
  count,
  defaultOpen = false,
  accentColor = obstetraColors.primary,
  headerAction,
  children,
}: AccordionProps): React.ReactElement {
  const [open, setOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        {/* Zona pulsable (icono + título + contador + chevron). El botón de
            acción queda FUERA del área pulsable para que nunca desborde. */}
        <TouchableOpacity
          style={styles.headerMain}
          onPress={toggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={title}
        >
          {Icon && (
            <View style={[styles.iconWrap, { backgroundColor: accentColor + '18' }]}>
              <Icon size={16} color={accentColor} />
            </View>
          )}
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {typeof count === 'number' && count > 0 && (
            <View style={styles.countPill}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          )}
          <View style={[styles.chevron, open && styles.chevronOpen]}>
            <ChevronDown size={18} color={commonColors.textSecondary} />
          </View>
        </TouchableOpacity>
        {headerAction ? <View style={styles.headerActionWrap}>{headerAction}</View> : null}
      </View>

      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm2,
    overflow: 'hidden',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm2,
    paddingHorizontal: spacing.md,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerActionWrap: {
    marginLeft: spacing.sm,
    flexShrink: 0,
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    ...typography.bodyMedium,
    fontWeight: '600',
    color: commonColors.text,
    flexShrink: 1,
  },
  countPill: {
    minWidth: 20, height: 20, borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: commonColors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  countText: { ...typography.caption, fontWeight: '700', color: commonColors.textSecondary },
  chevron: { transform: [{ rotate: '0deg' }], marginLeft: 'auto', flexShrink: 0 },
  chevronOpen: { transform: [{ rotate: '180deg' }], marginLeft: 'auto' },
  body: {
    borderTopWidth: 1,
    borderTopColor: commonColors.borderLight,
  },
});
