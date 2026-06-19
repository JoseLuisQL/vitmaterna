/**
 * VITMATERNA — WebMaxWidth (limitador de ancho para el portal)
 *
 * Envoltorio ligero para pantallas que NO usan ScreenLayout pero que, en el
 * portal web, deben centrar y acotar su contenido para no estirarse de borde a
 * borde en monitores grandes. En móvil/nativo/web angosto es passthrough total
 * (no añade ningún View extra que altere el layout actual).
 *
 *   <WebMaxWidth width="wide">...</WebMaxWidth>
 *
 * Pensado para usarse dentro del contentContainerStyle de un ScrollView o como
 * contenedor del cuerpo. Solo actúa cuando `webShell` es true.
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useResponsive } from '../../theme/responsive';
import { webLayout } from '../../theme/spacing';

interface WebMaxWidthProps {
  children: React.ReactNode;
  /** 'readable' (760/900), 'wide' (1024/1280/1440) o 'full' (sin límite). */
  width?: 'readable' | 'wide' | 'full';
}

export function WebMaxWidth({ children, width = 'wide' }: WebMaxWidthProps): React.ReactElement {
  const { webShell, select } = useResponsive();

  if (!webShell || width === 'full') {
    return <>{children}</>;
  }

  const maxWidth =
    width === 'wide'
      ? select({ base: 9999, lg: webLayout.contentMaxWidth.lg, xl: webLayout.contentMaxWidth.xl, xxl: webLayout.contentMaxWidth.xxl })
      : select({ base: 9999, lg: 760, xl: 900 });

  return <View style={[styles.center, { maxWidth }]}>{children}</View>;
}

const styles = StyleSheet.create({
  center: { width: '100%', alignSelf: 'center' },
});

export default WebMaxWidth;
