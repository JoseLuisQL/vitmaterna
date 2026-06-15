/**
 * VITMATERNA — MobileFrame (contenedor responsivo)
 *
 * La app es mobile-first, pero en navegador de escritorio debe aprovechar la
 * pantalla. Este contenedor:
 *  - En móvil nativo (o web angosto): transparente, ocupa todo el alto y ancho.
 *  - En web ancho: usa todo el alto de la ventana y centra el contenido en una
 *    columna de ancho máximo cómodo (no un teléfono diminuto, ni estirado de
 *    borde a borde en monitores muy anchos). El fondo lateral es ice-blue.
 */
import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { commonColors } from '../../theme/colors';

/**
 * Ancho máximo del contenido en web de escritorio. Cómodo para lectura y para
 * los layouts de una sola columna, sin verse como un teléfono.
 */
const CONTENT_MAX_WIDTH = 920;

export function MobileFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  const { width } = useWindowDimensions();

  // Sólo centramos en web cuando la ventana supera el ancho máximo del
  // contenido. En móvil y en ventanas angostas, ocupa todo el ancho.
  const centered = Platform.OS === 'web' && width > CONTENT_MAX_WIDTH;

  if (!centered) {
    return <View style={styles.full}>{children}</View>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.content, { maxWidth: CONTENT_MAX_WIDTH }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1 },
  backdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: commonColors.surfaceHover,
  },
  content: {
    flex: 1,
    width: '100%',
    backgroundColor: commonColors.background,
  },
});
