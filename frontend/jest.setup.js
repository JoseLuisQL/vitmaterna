/**
 * Configuración de entorno para las pruebas del frontend.
 * Mock manual y mínimo de react-native-reanimated para que los componentes
 * que usan animaciones se rendericen en el entorno de pruebas (sin parte nativa
 * de worklets).
 */
// AsyncStorage: mock oficial para que los componentes que leen el tema
// (ThemeContext) y la persistencia funcionen en el entorno de pruebas.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Text, Pressable } = require('react-native');

  const createAnimatedComponent = (Component) => Component;

  return {
    __esModule: true,
    default: {
      View,
      Text,
      createAnimatedComponent,
    },
    createAnimatedComponent,
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: () => ({}),
    useAnimatedProps: () => ({}),
    cancelAnimation: () => {},
    withSpring: (v) => v,
    withTiming: (v) => v,
    withDelay: (_d, v) => v,
    withRepeat: (v) => v,
    withSequence: (...vs) => vs[vs.length - 1],
    interpolate: () => 0,
    interpolateColor: () => '#000000',
    Easing: { linear: () => 0, ease: () => 0, in: () => () => 0, out: () => () => 0, inOut: () => () => 0, cubic: () => 0 },
    View,
    Text,
  };
});
