/**
 * VITMATERNA — makeStyles helper
 *
 * Pequeño wrapper sobre StyleSheet.create que mantiene el tipado y permite
 * un punto único para, en el futuro, inyectar theme/dark-mode. Por ahora es
 * equivalente a StyleSheet.create pero estandariza el patrón de estilos.
 *
 *   const styles = makeStyles({ container: { flex: 1 } });
 */
import { StyleSheet, ImageStyle, TextStyle, ViewStyle } from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function makeStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  styles: T & NamedStyles<any>,
): T {
  return StyleSheet.create(styles);
}
