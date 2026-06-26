/**
 * VITMATERNA — WelcomeScreen (bienvenida para usuarios nuevos).
 *
 * Carrusel de bienvenida propio, liviano y profesional. Reemplaza a la librería
 * externa (que forzaba una imagen PNG pesada por lámina y cargaba lento). Aquí:
 *   - NO se cargan imágenes: cada lámina usa un icono vectorial (Lucide), por lo
 *     que la pantalla aparece al instante (regla de rendimiento del sistema de
 *     diseño: sin assets raster pesados).
 *   - Diseño calmo y de marca: gradiente del rol, una tarjeta blanca flotante con
 *     el contenido, indicador de progreso y una sola acción primaria.
 *   - Accesible: roles/labels, contraste AA, respeta reduce-motion, áreas táctiles
 *     ≥48, un único CTA primario por pantalla.
 *
 * Contenido en `welcomeSlides.ts`. Al terminar llama `onStartTour`; al omitir,
 * `onSkip`.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, ArrowLeft, X, Check } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { colors as roleColorMap, commonColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { VitMaternaLogo } from '../ui/VitMaternaLogo';
import { welcomeContentForRole } from './welcomeSlides';
import { haptics } from '../../utils/haptics';
import { useReducedMotion } from '../../theme/motion';
import type { UserRole } from '../../types/user';

interface Props {
  /** Se llama al completar la última lámina ("Empezar el recorrido"). */
  onStartTour: () => void;
  /** Se llama si el usuario omite ("Explorar por mi cuenta") o cierra. */
  onSkip: () => void;
}

export function WelcomeScreen({ onStartTour, onSkip }: Props): React.ReactElement {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role as UserRole | undefined) ?? 'gestante';
  const accent = roleColorMap[role] ?? roleColorMap.gestante;
  const content = useMemo(() => welcomeContentForRole(role), [role]);
  const reduced = useReducedMotion();
  const { width } = useWindowDimensions();

  const firstName = user?.firstName?.trim().split(' ')[0] || '';
  const greeting = content.introTitle.replace('{nombre}', firstName || '');

  // -1 = pantalla de bienvenida (intro); 0..n = láminas.
  const [index, setIndex] = useState(-1);
  const total = content.slides.length;

  // Animación de transición entre láminas (fade + leve desplazamiento vertical).
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced) {
      anim.setValue(1);
      return;
    }
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [index, reduced, anim]);

  const goNext = useCallback(() => {
    haptics.selection();
    if (index >= total - 1) {
      haptics.success();
      onStartTour();
      return;
    }
    setIndex((i) => i + 1);
  }, [index, total, onStartTour]);

  const goPrev = useCallback(() => {
    haptics.selection();
    setIndex((i) => Math.max(-1, i - 1));
  }, []);

  const startSlides = useCallback(() => {
    haptics.light();
    setIndex(0);
  }, []);

  const cardWidth = Math.min(width - spacing.lg * 2, 460);
  const animStyle = {
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  };

  return (
    <LinearGradient
      colors={accent.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.fill}
    >
      {/* Halos decorativos suaves (sin imágenes). */}
      <View style={styles.haloTop} pointerEvents="none" />
      <View style={styles.haloBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Botón omitir, siempre accesible arriba a la derecha. */}
        <View style={styles.topBar}>
          <Pressable
            onPress={onSkip}
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Omitir la introducción"
            hitSlop={10}
          >
            <Text style={styles.skipText}>Omitir</Text>
            <X size={16} color={commonColors.onColorTextSoft} />
          </Pressable>
        </View>

        <View style={styles.center}>
          {index === -1 ? (
            // ── Lámina de bienvenida ──────────────────────────────────────
            <Animated.View style={[styles.intro, { width: cardWidth }, animStyle]}>
              <View style={styles.logoPlate} accessibilityRole="image" accessibilityLabel="VITMATERNA">
                <VitMaternaLogo size={64} />
              </View>
              <Text style={styles.introTitle} accessibilityRole="header">
                {greeting ? `¡Hola, ${firstName}!` : '¡Te damos la bienvenida!'}
              </Text>
              <Text style={styles.introSubtitle}>{content.introSubtitle}</Text>
            </Animated.View>
          ) : (
            // ── Láminas de funciones ──────────────────────────────────────
            <Animated.View style={[styles.card, { width: cardWidth }, animStyle]}>
              <SlideIcon icon={content.slides[index].icon} accent={accent.primary} accentBg={accent.primaryLight} />
              <Text style={[styles.cardLabel, { color: accent.primary }]}>
                {content.slides[index].label.toUpperCase()}
              </Text>
              <Text style={styles.cardTitle} accessibilityRole="header">
                {content.slides[index].title}
              </Text>
              <Text style={styles.cardDescription}>{content.slides[index].description}</Text>
            </Animated.View>
          )}
        </View>

        {/* Controles inferiores: progreso + acción primaria. */}
        <View style={[styles.footer, { width: cardWidth, alignSelf: 'center' }]}>
          {/* Indicador de progreso por puntos. */}
          <View style={styles.dots} accessibilityLabel={index === -1 ? 'Bienvenida' : `Paso ${index + 1} de ${total}`}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  { backgroundColor: i === index ? commonColors.white : commonColors.onColorTrack },
                  i === index && styles.dotActive,
                ]}
              />
            ))}
          </View>

          {index === -1 ? (
            <Pressable
              onPress={startSlides}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Conocer la app"
            >
              <Text style={[styles.primaryBtnText, { color: accent.primary }]}>Conocer la app</Text>
              <ArrowRight size={20} color={accent.primary} />
            </Pressable>
          ) : (
            <View style={styles.navRow}>
              <Pressable
                onPress={goPrev}
                style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Anterior"
                hitSlop={8}
              >
                <ArrowLeft size={22} color={commonColors.white} />
              </Pressable>
              <Pressable
                onPress={goNext}
                style={({ pressed }) => [styles.primaryBtn, styles.primaryBtnFlex, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel={index === total - 1 ? 'Empezar el recorrido' : 'Siguiente'}
              >
                <Text style={[styles.primaryBtnText, { color: accent.primary }]}>
                  {index === total - 1 ? 'Empezar el recorrido' : 'Siguiente'}
                </Text>
                {index === total - 1 ? (
                  <Check size={20} color={accent.primary} />
                ) : (
                  <ArrowRight size={20} color={accent.primary} />
                )}
              </Pressable>
            </View>
          )}

          {index === -1 && (
            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Explorar por mi cuenta"
            >
              <Text style={styles.ghostBtnText}>Explorar por mi cuenta</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/** Icono de la lámina dentro de un círculo translúcido blanco. */
function SlideIcon({
  icon: Icon,
  accent,
  accentBg,
}: {
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  accent: string;
  accentBg: string;
}): React.ReactElement {
  return (
    <View style={[styles.iconCircle, { backgroundColor: accentBg }]}>
      <Icon size={34} color={accent} strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safe: { flex: 1, justifyContent: 'space-between' },
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    minHeight: 44,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  skipText: { ...typography.label, color: commonColors.onColorTextSoft },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },

  // Bienvenida
  intro: { alignItems: 'center', gap: spacing.md },
  logoPlate: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: commonColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...({ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' } as any),
    elevation: 10,
  },
  introTitle: { ...typography.displayXl, fontSize: 30, lineHeight: 38, color: commonColors.white, textAlign: 'center' },
  introSubtitle: {
    ...typography.bodyLg,
    color: commonColors.onColorTextSoft,
    textAlign: 'center',
    paddingHorizontal: spacing.sm,
  },

  // Lámina de función (tarjeta blanca flotante)
  card: {
    backgroundColor: commonColors.surface,
    borderRadius: borderRadius.xxl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...({ boxShadow: '0 16px 40px rgba(0,0,0,0.20)' } as any),
    elevation: 12,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  cardLabel: { ...typography.overline, letterSpacing: 1 },
  cardTitle: { ...typography.h2, color: commonColors.text, textAlign: 'center' },
  cardDescription: {
    ...typography.body,
    color: commonColors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },

  // Footer / controles
  footer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md, alignItems: 'center' },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 8 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  dotActive: { width: 22 },

  navRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, width: '100%' },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.onColorSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnFlex: { flex: 1, width: undefined },
  primaryBtnText: { ...typography.button, fontSize: 16 },
  ghostBtn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { ...typography.button, color: commonColors.onColorTextSoft },
  pressed: { opacity: 0.82 },
});

export default WelcomeScreen;
