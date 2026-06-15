import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { commonColors } from '../../theme/colors';
import { borderRadius, spacing } from '../../theme/spacing';
import { shadows } from '../../theme/shadows';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Si el contenido es largo, se hace scroll dentro del sheet. */
  scroll?: boolean;
}

/**
 * Bottom sheet modal estilo SaaS: handle pill, fondo atenuado (30%) y panel
 * inferior con esquinas superiores redondeadas.
 */
export function BottomSheet({ visible, onClose, children, scroll = true }: BottomSheetProps): React.ReactElement {
  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      translateY.setValue(40);
      opacity.setValue(0);
    }
  }, [visible, opacity, translateY]);

  const Content = scroll ? ScrollView : View;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Cerrar" />
        <Animated.View style={[styles.sheet, shadows.modal, { transform: [{ translateY }] }]}>
          <View style={styles.handle} />
          <Content
            showsVerticalScrollIndicator={false}
            contentContainerStyle={scroll ? styles.scrollContent : undefined}
            style={scroll ? styles.scrollArea : undefined}
          >
            {children}
          </Content>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: commonColors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: commonColors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    maxHeight: '85%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.borderStrong,
    marginBottom: spacing.md,
  },
  scrollArea: { width: '100%' },
  scrollContent: { paddingBottom: spacing.sm },
});
