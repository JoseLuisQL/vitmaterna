/**
 * VITMATERNA — Pantalla de carga (splash) profesional.
 *
 * Marca de apertura de la app: el logo oficial sobre el gradiente de salud de la
 * marca, con una animación serena y profesional:
 *   - Fondo con gradiente teal (identidad gestante) + dos halos suaves.
 *   - El logo entra con fade + escala (spring) desde una placa blanca elevada.
 *   - Un anillo respira (pulso) detrás del logo, transmitiendo "vida/latido"
 *     acorde al cuidado prenatal, sin ser estridente.
 *   - Wordmark "VitMaterna" + tagline aparecen escalonados (stagger).
 *   - Tres puntos de progreso animados en bucle como indicador de carga.
 *
 * Accesibilidad: respeta "reducir movimiento" (todo aparece sin animar) y no usa
 * literales de color (solo tokens del tema).
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { gestanteColors, commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';
import { useReducedMotion } from '../../theme/motion';

interface Props {
  /** Texto de estado bajo el logo (p. ej. "Cargando…"). */
  message?: string;
}

export function SplashScreen({ message = 'Cuidado prenatal inteligente' }: Props): React.ReactElement {
  const reduced = useReducedMotion();

  // Valores animados (persistentes entre renders).
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(12)).current;
  const ringPulse = useRef(new Animated.Value(0)).current;
  const dot0 = useRef(new Animated.Value(0.3)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (reduced) {
      // Sin animación: mostrar todo en su estado final de inmediato.
      logoOpacity.setValue(1);
      logoScale.setValue(1);
      textOpacity.setValue(1);
      textTranslate.setValue(0);
      return;
    }

    // 1) Entrada del logo: fade + escala con spring (sensación natural).
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        damping: 12,
        stiffness: 180,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();

    // 2) Wordmark + tagline, escalonado tras el logo.
    Animated.parallel([
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 380,
        delay: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(textTranslate, {
        toValue: 0,
        duration: 380,
        delay: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 3) Anillo que "respira" en bucle (latido sereno).
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(ringPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(ringPulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    // 4) Tres puntos de progreso en bucle escalonado.
    const makeDot = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration: 480, delay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.3, duration: 480, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
    const d0 = makeDot(dot0, 0);
    const d1 = makeDot(dot1, 160);
    const d2 = makeDot(dot2, 320);
    d0.start();
    d1.start();
    d2.start();

    return () => {
      pulse.stop();
      d0.stop();
      d1.stop();
      d2.stop();
    };
  }, [reduced, logoOpacity, logoScale, textOpacity, textTranslate, ringPulse, dot0, dot1, dot2]);

  const ringScale = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const ringOpacity = ringPulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  const dots = useMemo(() => [dot0, dot1, dot2], [dot0, dot1, dot2]);

  return (
    <LinearGradient
      colors={gestanteColors.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Halos decorativos suaves para dar profundidad al fondo. */}
      <View style={styles.haloTop} pointerEvents="none" />
      <View style={styles.haloBottom} pointerEvents="none" />

      <View style={styles.center}>
        {/* Anillo que respira detrás del logo. */}
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
        />

        {/* Placa con el logo oficial. */}
        <Animated.View
          style={[styles.logoPlate, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}
          accessibilityRole="image"
          accessibilityLabel="VITMATERNA"
        >
          <Image
            source={require('../../../assets/vitmaterna_logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Wordmark + tagline. */}
        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }], alignItems: 'center' }}>
          <Text style={styles.title}>
            <Text style={styles.titleBrand}>Vit</Text>
            <Text style={styles.titleRest}>Materna</Text>
          </Text>
          <Text style={styles.subtitle}>{message}</Text>
        </Animated.View>
      </View>

      {/* Indicador de carga: tres puntos en bucle. */}
      <View style={styles.dotsRow}>
        {dots.map((d, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: d, transform: [{ scale: d }] }]} />
        ))}
      </View>
    </LinearGradient>
  );
}

const LOGO_SIZE = 116;
const PLATE = 150;
const RING = 196;

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  haloTop: {
    position: 'absolute',
    top: -120,
    right: -90,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: commonColors.onColorSurfaceFaint,
  },
  haloBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: commonColors.onColorSurfaceFaint,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  ring: {
    position: 'absolute',
    top: -((RING - PLATE) / 2),
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: commonColors.onColorSurfaceStrong,
  },
  logoPlate: {
    width: PLATE,
    height: PLATE,
    borderRadius: PLATE / 2,
    backgroundColor: commonColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...({ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' } as any),
    elevation: 10,
  },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  title: {
    ...typography.displayXl,
    fontSize: 34,
    letterSpacing: 0.5,
    color: commonColors.white,
  },
  titleBrand: { color: commonColors.white },
  titleRest: { color: commonColors.onColorTextSoft },
  subtitle: {
    ...typography.bodySm,
    color: commonColors.onColorTextSoft,
    letterSpacing: 0.4,
    marginTop: spacing.xs,
  },
  dotsRow: {
    position: 'absolute',
    bottom: spacing.xxl + spacing.lg,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: commonColors.white,
  },
});

export default SplashScreen;
