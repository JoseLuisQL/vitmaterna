/**
 * VITMATERNA — MobileFrame
 *
 * La app es mobile-first. En web/tablet (pantallas anchas) el contenido se
 * estiraba a todo el ancho y se veía deformado. Este frame centra la app en
 * una columna de ancho máximo tipo teléfono y pinta el resto con el fondo
 * ice-blue. En móvil nativo (o ventanas angostas) es transparente y ocupa
 * todo el alto, sin afectar el layout.
 */
import React from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import { commonColors } from '../../theme/colors';

/** Ancho máximo del "teléfono" en pantallas anchas. */
const MAX_WIDTH = 440;

export function MobileFrame({ children }: { children: React.ReactNode }): React.ReactElement {
  const { width } = useWindowDimensions();

  // Solo aplicamos el marco en web cuando la ventana es más ancha que un móvil.
  const framed = Platform.OS === 'web' && width > MAX_WIDTH;

  if (!framed) {
    return <View style={styles.full}>{children}</View>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={[styles.frame, { width: MAX_WIDTH }]}>{children}</View>
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
  frame: {
    flex: 1,
    backgroundColor: commonColors.background,
    overflow: 'hidden',
    // Sombra sutil para separar el "teléfono" del fondo (solo web).
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 0 40px rgba(30,42,58,0.12)' as unknown as undefined }
      : {}),
  },
});
