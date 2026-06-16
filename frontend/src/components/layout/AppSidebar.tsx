/**
 * VITMATERNA — AppSidebar (drawer lateral profesional)
 *
 * Menú lateral deslizante por rol. La barra inferior (tabs) lleva solo los
 * módulos más usados; el resto de secciones vive aquí, con jerarquía y orden
 * lógico de uso. Incluye cabecera con identidad del usuario, grupos de items
 * con icono + descripción, selector de tema y cierre de sesión.
 *
 * No usa librerías nuevas: Modal + Animated (consistente con EmergencyAlert),
 * funciona igual en web y nativo.
 */
import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { LogOut, X, type LucideIcon, ChevronRight } from 'lucide-react-native';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuthStore } from '../../store/authStore';
import { useToast } from '../ui/ToastProvider';
import { confirmAction } from '../../utils/confirm';
import { commonColors, semanticColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

export interface SidebarItem {
  icon: LucideIcon;
  label: string;
  description?: string;
  href: Href;
}

export interface SidebarSection {
  title?: string;
  items: SidebarItem[];
}

interface AppSidebarProps {
  visible: boolean;
  onClose: () => void;
  /** Color de acento del rol. */
  accentColor: string;
  /** Nombre y subtítulo de la cabecera. */
  userName: string;
  userSubtitle?: string;
  /** Secciones de navegación. */
  sections: SidebarSection[];
}

const PANEL_MAX = 360;

export function AppSidebar({
  visible,
  onClose,
  accentColor,
  userName,
  userSubtitle,
  sections,
}: AppSidebarProps): React.ReactElement {
  const router = useRouter();
  const toast = useToast();
  const { logout } = useAuthStore();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(PANEL_MAX, Math.round(width * 0.84));

  const translateX = useRef(new Animated.Value(-panelWidth)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, friction: 9, tension: 70 }),
        Animated.timing(overlayOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      translateX.setValue(-panelWidth);
      overlayOpacity.setValue(0);
    }
  }, [visible, panelWidth, translateX, overlayOpacity]);

  const go = (href: Href) => {
    onClose();
    // Pequeño respiro para que cierre el panel antes de navegar.
    setTimeout(() => router.push(href), 60);
  };

  const handleLogout = async () => {
    onClose();
    const ok = await confirmAction({
      title: 'Cerrar sesión',
      message: '¿Seguro que deseas salir de tu cuenta?',
      confirmText: 'Cerrar sesión',
      destructive: true,
    });
    if (!ok) return;
    await logout();
    toast.info('Sesión cerrada', 'Has salido de VITMATERNA correctamente.');
    router.replace('/(auth)/login');
  };

  const initial = (userName || 'U').trim().charAt(0).toUpperCase();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar menú" />
      </Animated.View>

      <Animated.View style={[styles.panel, shadows.modal, { width: panelWidth, transform: [{ translateX }] }]}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.flex}>
          {/* Cabecera con identidad */}
          <View style={styles.header}>
            <View style={[styles.avatar, { backgroundColor: accentColor }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.headerTexts}>
              <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
              {userSubtitle ? <Text style={styles.userSubtitle} numberOfLines={1}>{userSubtitle}</Text> : null}
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar menú">
              <X size={20} color={commonColors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {sections.map((section, si) => (
              <View key={si} style={styles.section}>
                {section.title ? <Text style={styles.sectionTitle}>{section.title}</Text> : null}
                <View style={styles.sectionCard}>
                  {section.items.map((item, ii) => {
                    const Icon = item.icon;
                    return (
                      <Pressable
                        key={ii}
                        onPress={() => go(item.href)}
                        style={({ pressed }) => [styles.item, ii > 0 && styles.itemBorder, pressed && styles.itemPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={item.label}
                        accessibilityHint={item.description}
                      >
                        <View style={[styles.itemIcon, { backgroundColor: accentColor + '1A' }]}>
                          <Icon size={20} color={accentColor} />
                        </View>
                        <View style={styles.flex}>
                          <Text style={styles.itemLabel}>{item.label}</Text>
                          {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
                        </View>
                        <ChevronRight size={18} color={commonColors.textTertiary} />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* Apariencia */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Apariencia</Text>
              <View style={[styles.sectionCard, { padding: spacing.sm2 }]}>
                <ThemeToggle accentColor={accentColor} />
              </View>
            </View>

            {/* Cerrar sesión */}
            <View style={styles.section}>
              <View style={styles.sectionCard}>
                <Pressable
                  onPress={handleLogout}
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar sesión"
                >
                  <View style={[styles.itemIcon, { backgroundColor: semanticColors.dangerLight }]}>
                    <LogOut size={20} color={semanticColors.danger} />
                  </View>
                  <Text style={[styles.itemLabel, { color: semanticColors.danger }]}>Cerrar sesión</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: commonColors.overlay },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: commonColors.background,
    borderTopRightRadius: borderRadius.xxl,
    borderBottomRightRadius: borderRadius.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm2,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...typography.h2, color: commonColors.white },
  headerTexts: { flex: 1, minWidth: 0 },
  userName: { ...typography.h3, color: commonColors.text },
  userSubtitle: { ...typography.bodySm, color: commonColors.textSecondary, marginTop: 1 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: commonColors.surfaceAlt },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  section: { marginBottom: spacing.md },
  sectionTitle: { ...typography.overline, color: commonColors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm, marginLeft: 4 },
  sectionCard: { backgroundColor: commonColors.surface, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: commonColors.border, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm2 + 2 },
  itemBorder: { borderTopWidth: 1, borderTopColor: commonColors.borderLight },
  itemPressed: { backgroundColor: commonColors.surfaceAlt },
  itemIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  itemLabel: { ...typography.bodyMedium, color: commonColors.text },
  itemDesc: { ...typography.caption, color: commonColors.textSecondary, marginTop: 1 },
});

export default AppSidebar;
