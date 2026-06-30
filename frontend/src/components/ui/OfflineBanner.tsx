/**
 * VITMATERNA — Banner global de "Sin conexión".
 *
 * Franja compacta y profesional que se desliza debajo del safe area top cuando
 * no hay conexión. NO usa position: absolute sobre el header; en su lugar se
 * renderiza en el flujo del layout con una animación de slide-down/slide-up
 * suave. Es delgada (28px), con ícono WifiOff, texto conciso, y un color que
 * destaca sin agredir.
 *
 * Uso en _layout.tsx: <OfflineBanner /> se renderiza ANTES del contenido
 * principal para que empuje el contenido sin tapar la cabecera.
 */
import React from 'react';
import { Animated, StyleSheet, Text, View, Platform } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { isOnline, subscribeOnline } from '../../services/network';
import { commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

/** Altura de la franja. Compacta para no invadir. */
const BANNER_HEIGHT = 28;

export function OfflineBanner(): React.ReactElement | null {
  const [online, setOnline] = React.useState(isOnline());
  const slideAnim = React.useRef(new Animated.Value(online ? 0 : 1)).current;

  React.useEffect(() => subscribeOnline(setOnline), []);

  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: online ? 0 : 1,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }, [online, slideAnim]);

  // Interpolar la altura para que el banner empuje el contenido suavemente
  // en vez de superponerse (position: absolute) sobre el header.
  const animatedHeight = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, BANNER_HEIGHT],
  });

  const animatedOpacity = slideAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0.6, 1],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        { height: animatedHeight, opacity: animatedOpacity },
      ]}
    >
      <View style={styles.row}>
        <WifiOff size={12} color={commonColors.white} strokeWidth={2.5} />
        <Text style={styles.text}>Sin conexión · datos guardados</Text>
        <View style={styles.dot} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: commonColors.bannerBackground,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // Sin position: absolute — vive en el flujo del layout.
    // Se renderiza entre el StatusBar/SafeArea y el contenido.
    ...Platform.select({
      web: {
        // En web añadimos un borde inferior sutil para separación visual
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.08)',
      },
    }),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  text: {
    ...typography.overline,
    color: commonColors.white,
    fontWeight: '600',
    fontSize: 11,
    letterSpacing: 0.3,
    // Asegurar que no se desborda en pantallas pequeñas
    ...Platform.select({
      web: { lineHeight: 'normal' as any },
    }),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    // Punto ámbar como indicador visual de "advertencia" sutil
  },
});
