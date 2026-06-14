/**
 * VITMATERNA - ToggleTabs
 * Selector pill: track gris con pastilla activa de acento que se desliza con
 * animación spring. Soporta badges numéricos por tab.
 */
import React, { useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { commonColors, gestanteColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';
import { animations } from '../../theme/animations';
import { haptics } from '../../utils/haptics';

export interface ToggleTab {
  key: string;
  label: string;
  badge?: number;
}

interface ToggleTabsProps {
  tabs: ToggleTab[];
  value: string;
  onChange: (key: string) => void;
  /** Color de la pastilla activa. Por defecto acento gestante. */
  activeColor?: string;
  style?: ViewStyle;
}

const TRACK_PADDING = 4;

export function ToggleTabs({
  tabs,
  value,
  onChange,
  activeColor = gestanteColors.primary,
  style,
}: ToggleTabsProps): React.ReactElement {
  const [trackWidth, setTrackWidth] = useState(0);
  const translateX = useSharedValue(0);

  const count = Math.max(1, tabs.length);
  const tabWidth = trackWidth > 0 ? (trackWidth - TRACK_PADDING * 2) / count : 0;
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === value));

  React.useEffect(() => {
    if (tabWidth > 0) {
      translateX.value = withSpring(activeIndex * tabWidth, animations.spring);
    }
  }, [activeIndex, tabWidth, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: tabWidth,
  }));

  const onLayout = (e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width);

  const handlePress = (key: string) => {
    haptics.selection();
    onChange(key);
  };

  return (
    <View style={[styles.track, style]} onLayout={onLayout}>
      {tabWidth > 0 && (
        <Animated.View
          style={[styles.indicator, { backgroundColor: activeColor }, shadows.card, indicatorStyle]}
        />
      )}
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => handlePress(tab.key)}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={[styles.label, { color: active ? commonColors.white : commonColors.textSecondary }]}
              numberOfLines={1}
            >
              {tab.label}
            </Text>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: active ? commonColors.white : activeColor },
                ]}
              >
                <Text
                  style={[styles.badgeText, { color: active ? activeColor : commonColors.white }]}
                >
                  {tab.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: commonColors.surfaceAlt,
    borderRadius: borderRadius.full,
    padding: TRACK_PADDING,
  },
  indicator: {
    position: 'absolute',
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    bottom: TRACK_PADDING,
    borderRadius: borderRadius.full,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.full,
    gap: spacing.xs + 2,
  },
  label: { ...typography.buttonSm },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...typography.micro },
});
