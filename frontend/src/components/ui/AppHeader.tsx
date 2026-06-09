/**
 * VITMATERNA - AppHeader Component
 * Screen header with title, optional back button, and right action.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { ChevronLeft, LucideIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, layout } from '../../theme/spacing';

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  onBackPress?: () => void;
  rightIcon?: LucideIcon;
  rightLabel?: string;
  onRightPress?: () => void;
  style?: ViewStyle;
  themeColor?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  showBack = false,
  onBackPress,
  rightIcon: RightIcon,
  rightLabel,
  onRightPress,
  style,
  themeColor,
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={[styles.header, style]}>
      {/* Left Section */}
      <View style={styles.leftSection}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Volver"
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronLeft
              size={24}
              color={themeColor || commonColors.text}
            />
          </Pressable>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      {/* Right Section */}
      <View style={styles.rightSection}>
        {(RightIcon || rightLabel) && onRightPress && (
          <Pressable
            onPress={onRightPress}
            style={styles.rightButton}
            accessibilityLabel={rightLabel || 'Acción'}
            accessibilityRole="button"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {RightIcon && (
              <RightIcon
                size={22}
                color={themeColor || commonColors.text}
              />
            )}
            {rightLabel && !RightIcon && (
              <Text
                style={[
                  styles.rightLabel,
                  { color: themeColor || commonColors.text },
                ]}
              >
                {rightLabel}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: layout.headerHeight,
    paddingHorizontal: spacing.md,
    backgroundColor: commonColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: commonColors.borderLight,
  },
  leftSection: {
    width: 48,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  title: {
    flex: 1,
    fontFamily: typography.h3.fontFamily,
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: commonColors.text,
    textAlign: 'center',
  },
  rightSection: {
    width: 48,
    alignItems: 'flex-end',
  },
  rightButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  rightLabel: {
    fontFamily: typography.bodyMedium.fontFamily,
    fontSize: typography.bodySmall.fontSize,
    fontWeight: '600',
  },
});
