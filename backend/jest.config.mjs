/**
 * Configuración de Jest para el backend (TypeScript + ESM con NodeNext).
 *
 * - Usa ts-jest en modo ESM.
 * - Reescribe los imports con extensión .js a su origen .ts (necesario porque
 *   el código usa imports ESM con extensión explícita).
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  roots: ['<rootDir>/tests'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    // `expo-server-sdk` se publica como ESM puro y rompe la carga en Jest
    // (SyntaxError: Cannot use import statement outside a module). Los tests
    // solo ejercitan lógica pura (payload de push), así que lo sustituimos por
    // un stub ligero. Debe ir ANTES del mapeo genérico de `.js` (issues #32/#34/#35).
    '^expo-server-sdk$': '<rootDir>/tests/mocks/expo-server-sdk.ts',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        // Un tsconfig DEDICADO a los tests (tsconfig.test.json) con
        // module=ESNext + target=ES2022. Sin esto, ts-jest degrada `module` y
        // rompe el `await import()` de nivel superior que usan los tests que
        // mockean módulos ESM con `jest.unstable_mockModule`
        // (openwaClient/openwaCommands) → error TS1378.
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
  // Las pruebas de integración necesitan más tiempo (red/BD)
  testTimeout: 20000,
  clearMocks: true,
};
