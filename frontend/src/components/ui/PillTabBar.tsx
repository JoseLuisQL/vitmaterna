/**
 * VITMATERNA - PillTabBar
 * Tab bar inferior personalizada con indicador pill animado debajo del ícono
 * activo. Sin borde superior (usa sombra), badges por tab y safe-area.
 *
 * Se usa como `tabBar` en el layout de Tabs de expo-router:
 *   <Tabs tabBar={(props) => <PillTabBar {...props} accentColor={...} />} />
 */
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { animations } from '../../theme/animations';
import { haptics } from '../../utils/haptics';

/**
 * Subconjunto de BottomTabBarProps (react-navigation) que consumimos. Se
 * tipa localmente para no depender de un import de ruta interna frágil.
 */
interface TabBarRoute {
  key: string;
  name: string;
  params?: object;
}
interface TabBarDescriptor {
  options: {
    title?: string;
    tabBarLabel?: unknown;
    tabBarBadge?: number | string;
    tabBarIcon?: (props: { focused: boolean; color: string; size: number }) => React.ReactNode;
    href?: string | null;
  };
}
interface NavigationLike {
  emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
    defaultPrevented: boolean;
  };
  dispatch: (action: object) => void;
  navigate: (name: string) => void;
}

/**
 * Props públicas permisivas (compatibles con lo que entrega expo-router) más
 * `accentColor`. Internamente normalizamos a tipos estrictos.
 */
interface PillTabBarProps {
  state: { index: number; key: string; routes: TabBarRoute[] };
  descriptors: Record<string, any>;
  navigation: any;
  accentColor?: string;
}

const INDICATOR_WIDTH = 28;

export function PillTabBar({
  state,
  descriptors: descriptorsRaw,
  navigation: navigationRaw,
  accentColor = gestanteColors.primary,
}: PillTabBarProps): React.ReactElement {
  const descriptors = descriptorsRaw as Record<string, TabBarDescriptor>;
  const navigation = navigationRaw as NavigationLike;
  const insets = useSafeAreaInsets();
  const [barWidth, setBarWidth] = React.useState(0);

  // Ruta activa según el índice del estado COMPLETO (incluye ocultas).
  const activeRouteKey = state.routes[state.index]?.key;

  // Sólo las rutas visibles. expo-router oculta con `href: null`; detectamos
  // varias señales de "oculta" porque, según la versión, el flag se traduce a
  // distintas opciones del descriptor.
  const visibleRoutes = state.routes.filter((route) => {
    const descriptor = descriptors[route.key];
    if (!descriptor) return false;
    const o = descriptor.options as any;
    if (o.href === null) return false;
    if (o.tabBarButton === null) return false;
    if (o.tabBarItemStyle && o.tabBarItemStyle.display === 'none') return false;
    // Sin icono definido => no es un tab principal (las ocultas no declaran icono).
    if (typeof o.tabBarIcon !== 'function') return false;
    return true;
  });

  // Índice de la ruta activa DENTRO de las visibles (para el indicador pill).
  const activeVisibleIndex = Math.max(
    0,
    visibleRoutes.findIndex((r) => r.key === activeRouteKey),
  );

  const count = Math.max(1, visibleRoutes.length);
  const slot = barWidth > 0 ? barWidth / count : 0;
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    if (slot > 0) {
      translateX.value = withSpring(
        activeVisibleIndex * slot + (slot - INDICATOR_WIDTH) / 2,
        animations.spring,
      );
    }
  }, [activeVisibleIndex, slot, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.bar,
        shadows.modal,
        { paddingBottom: Math.max(insets.bottom, spacing.sm), height: 64 + Math.max(insets.bottom, spacing.sm) },
      ]}
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
    >
      {slot > 0 && (
        <Animated.View
          style={[styles.indicator, { width: INDICATOR_WIDTH, backgroundColor: accentColor }, indicatorStyle]}
        />
      )}
      {visibleRoutes.map((route) => {
        const { options } = descriptors[route.key];
        const isFocused = activeRouteKey === route.key;
        const label =
          typeof options.tabBarLabel === 'string'
            ? options.tabBarLabel
            : options.title ?? route.name;
        const color = isFocused ? accentColor : commonColors.textTertiary;
        const badge = options.tabBarBadge;

        const onPress = () => {
          haptics.selection();
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={styles.tab}
            accessibilityRole="button"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={typeof label === 'string' ? label : route.name}
          >
            <View>
              {options.tabBarIcon?.({ focused: isFocused, color, size: 22 })}
              {badge != null ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText} numberOfLines={1}>
                    {badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {label as string}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: commonColors.surface,
    paddingTop: spacing.sm + 2,
    ...(Platform.OS === 'web' ? { borderTopWidth: 1, borderTopColor: commonColors.borderLight } : {}),
  },
  indicator: {
    position: 'absolute',
    top: 0,
    height: 3,
    borderRadius: borderRadius.full,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    ...typography.overline,
    fontSize: 10,
    letterSpacing: 0.3,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: borderRadius.full,
    backgroundColor: '#EF4444',
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.micro,
    color: commonColors.white,
    fontSize: 9,
  },
});
