/**
 * VITMATERNA — OnboardingGate (puerta de bienvenida para usuarios nuevos).
 *
 * Envuelve la navegación de la app. Si hay sesión iniciada y el usuario aún no
 * vio la bienvenida, muestra `WelcomeScreen` por encima de la app. En cualquier
 * otro caso es un passthrough total (renderiza children sin alterar nada).
 *
 * Se monta DESPUÉS de los guards de autenticación / mantenimiento / cambio de
 * contraseña, igual que el resto de "gates" del proyecto, para no solaparse.
 *
 * Nota: en esta fase, tanto "empezar el recorrido" como "explorar por mi cuenta"
 * marcan la bienvenida como vista. El lanzamiento del tour guiado se conecta en
 * una fase posterior (el flag `tourDone` ya queda preparado).
 */
import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { useOnboarding } from '../../hooks/useOnboarding';
import { WelcomeScreen } from './WelcomeScreen';

export function OnboardingGate({ children }: { children: React.ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const mustChangePassword = useAuthStore((s) => s.user?.mustChangePassword);
  const { loaded, welcomeSeen, markWelcomeSeen, markTourDone } = useOnboarding();

  const handleStartTour = useCallback(() => {
    // El tour guiado se conecta en una fase posterior. Por ahora, empezar el
    // recorrido marca la bienvenida como vista.
    markWelcomeSeen();
  }, [markWelcomeSeen]);

  const handleSkip = useCallback(() => {
    markWelcomeSeen();
    markTourDone();
  }, [markWelcomeSeen, markTourDone]);

  // Mostrar la bienvenida solo si: hay sesión con rol, ya cargaron las
  // preferencias, no se ha visto antes y no hay un cambio de contraseña
  // obligatorio pendiente (ese flujo tiene prioridad).
  const showWelcome =
    isAuthenticated && !!role && loaded && !welcomeSeen && !mustChangePassword;

  if (!showWelcome) {
    return <>{children}</>;
  }

  return (
    <View style={styles.fill}>
      {children}
      <View style={StyleSheet.absoluteFill}>
        <WelcomeScreen onStartTour={handleStartTour} onSkip={handleSkip} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export default OnboardingGate;
