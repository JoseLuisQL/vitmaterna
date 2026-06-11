/**
 * Configuración de entorno para las pruebas del frontend.
 * Mock manual y mínimo de react-native-reanimated para que los componentes
 * que usan animaciones se rendericen en el entorno de pruebas (sin parte nativa
 * de worklets).
 */
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
    withSpring: (v) => v,
    withTiming: (v) => v,
    withDelay: (_d, v) => v,
    Easing: { linear: () => 0, ease: () => 0, inOut: () => () => 0 },
    View,
    Text,
  };
});
