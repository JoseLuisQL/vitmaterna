/**
 * VITMATERNA — WelcomeScreen (bienvenida para usuarios nuevos).
 *
 * Pantalla de introducción de marca que se muestra tras el primer inicio de
 * sesión. Da la bienvenida personalizada ("¡Hola, {nombre}!") y presenta, en
 * pocas láminas, las funciones clave del rol (gestante / obstetra / admin).
 *
 * Construida sobre `@blazejkustra/react-native-onboarding` (Software Mansion),
 * cross-platform web/móvil, tematizada con los tokens del sistema: color del
 * rol, tipografía Inter y voz del producto. El contenido vive en
 * `welcomeSlides.ts`.
 *
 * Al terminar (`onDone`) o si la lib reporta "skip", se considera vista la
 * bienvenida; el llamador decide si continúa con el tour guiado.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Onboarding, {
  type OnboardingColors,
  type OnboardingStep,
} from '@blazejkustra/react-native-onboarding';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../store/authStore';
import { colors as roleColorMap, commonColors } from '../../theme/colors';
import { typography, fontFamilies } from '../../theme/typography';
import { spacing, borderRadius } from '../../theme/spacing';
import { VitMaternaLogo } from '../ui/VitMaternaLogo';
import { welcomeContentForRole } from './welcomeSlides';
import { haptics } from '../../utils/haptics';
import type { UserRole } from '../../types/user';

const WELCOME_IMAGE = require('../../../assets/icon.png');

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
  const firstName = user?.firstName?.trim() || '';
  const introTitle = content.introTitle.replace('{nombre}', firstName || 'bienvenida');

  // Tokens de color del sistema mapeados al contrato de la librería.
  const themeColors: OnboardingColors = useMemo(
    () => ({
      background: {
        primary: commonColors.background,
        secondary: commonColors.surface,
        label: accent.primaryLight,
        accent: accent.primary,
      },
      text: {
        primary: commonColors.text,
        secondary: commonColors.textSecondary,
        contrast: commonColors.white,
      },
    }),
    [accent],
  );

  const themeFonts = useMemo(
    () => ({
      introTitle: fontFamilies.bold,
      introSubtitle: fontFamilies.regular,
      introButton: fontFamilies.semibold,
      stepLabel: fontFamilies.semibold,
      stepTitle: fontFamilies.bold,
      stepDescription: fontFamilies.regular,
      stepButton: fontFamilies.semibold,
      primaryButton: fontFamilies.semibold,
      secondaryButton: fontFamilies.semibold,
    }),
    [],
  );

  const steps: OnboardingStep[] = useMemo(
    () =>
      content.slides.map((slide, idx) => ({
        label: slide.label,
        title: slide.title,
        description: slide.description,
        buttonLabel: idx === content.slides.length - 1 ? 'Empezar el recorrido' : 'Siguiente',
        image: WELCOME_IMAGE,
        position: 'top' as const,
      })),
    [content.slides],
  );

  return (
    <View style={styles.fill}>
      <Onboarding
        colors={themeColors}
        fonts={themeFonts}
        animationDuration={420}
        wrapInModalOnWeb
        showCloseButton
        showBackButton
        steps={steps}
        onComplete={() => {
          haptics.success();
          onStartTour();
        }}
        onSkip={onSkip}
        onStepChange={(i) => {
          if (i >= 0) haptics.selection();
        }}
        background={() => (
          <LinearGradient
            colors={accent.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fill}
          >
            <View style={styles.haloTop} pointerEvents="none" />
            <View style={styles.haloBottom} pointerEvents="none" />
          </LinearGradient>
        )}
        introPanel={({ onPressStart }) => (
          <View style={styles.introPanel} accessibilityRole="summary">
            <View style={styles.logoPlate} accessibilityRole="image" accessibilityLabel="VITMATERNA">
              <VitMaternaLogo size={72} />
            </View>
            <Text style={styles.introTitle} accessibilityRole="header">
              {introTitle}
            </Text>
            <Text style={styles.introSubtitle}>{content.introSubtitle}</Text>

            <Pressable
              onPress={() => {
                haptics.light();
                onPressStart();
              }}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Conocer la app"
            >
              <Text style={styles.primaryBtnText}>Conocer la app</Text>
            </Pressable>

            <Pressable
              onPress={onSkip}
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Explorar por mi cuenta"
            >
              <Text style={styles.ghostBtnText}>Explorar por mi cuenta</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
  introPanel: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  logoPlate: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: commonColors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    ...({ boxShadow: '0 12px 32px rgba(0,0,0,0.18)' } as any),
    elevation: 10,
  },
  introTitle: {
    ...typography.h1,
    color: commonColors.white,
    textAlign: 'center',
  },
  introSubtitle: {
    ...typography.body,
    color: commonColors.onColorTextSoft,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 420,
    height: 52,
    borderRadius: borderRadius.full,
    backgroundColor: commonColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    ...typography.button,
    color: commonColors.text,
  },
  ghostBtn: {
    width: '100%',
    maxWidth: 420,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    ...typography.button,
    color: commonColors.onColorTextSoft,
  },
  btnPressed: { opacity: 0.85 },
});

export default WelcomeScreen;
