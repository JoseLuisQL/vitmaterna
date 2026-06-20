/**
 * VITMATERNA — Banner global de "Sin conexión".
 *
 * Se muestra fijo bajo el área segura superior cuando no hay conexión. Usa el
 * store de red (subscribeOnline) para reaccionar sin re-render del árbol.
 */
import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudOff } from 'lucide-react-native';
import { isOnline, subscribeOnline } from '../../services/network';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { zIndex } from '../../theme/zIndex';

export function OfflineBanner(): React.ReactElement | null {
  const insets = useSafeAreaInsets();
  const [online, setOnline] = React.useState(isOnline());
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => subscribeOnline(setOnline), []);

  React.useEffect(() => {
    Animated.timing(opacity, {
      toValue: online ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [online, opacity]);

  if (online) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, { paddingTop: insets.top + spacing.xs, opacity }]}
    >
      <View style={styles.row}>
        <CloudOff size={15} color={commonColors.white} />
        <Text style={styles.text}>Sin conexión · mostrando datos guardados</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: zIndex.banner,
    backgroundColor: commonColors.bannerBackground,
    paddingBottom: spacing.sm,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  text: { ...typography.caption, color: commonColors.white, fontWeight: '600' },
});
