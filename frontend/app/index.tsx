/**
 * VITMATERNA - Splash/Redirect Screen
 * Checks auth state and redirects by role.
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { useAuthStore } from '../src/store/authStore';
import { gestanteColors, commonColors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';

export default function IndexScreen(): React.ReactElement {
  const router = useRouter();
  const { isAuthenticated, user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) return;

    const timeout = setTimeout(() => {
      if (isAuthenticated && user) {
        if (user.role === 'gestante') {
          router.replace('/(gestante)/(tabs)');
        } else if (user.role === 'admin') {
          router.replace('/(admin)/(tabs)/usuarios' as any);
        } else {
          router.replace('/(obstetra)/(tabs)');
        }
      } else {
        router.replace('/(auth)/login');
      }
    }, 800); // Brief splash delay for visual polish

    return () => clearTimeout(timeout);
  }, [isAuthenticated, user, isInitialized, router]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <View style={styles.iconCircle}>
          <Heart
            size={40}
            color={commonColors.surface}
            fill={commonColors.surface}
          />
        </View>
        <Text style={styles.title}>VITMATERNA</Text>
        <Text style={styles.subtitle}>Cuidado prenatal inteligente</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gestanteColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    fontFamily: typography.display.fontFamily,
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  subtitle: {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
});
