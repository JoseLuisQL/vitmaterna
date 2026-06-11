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
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          // Relaja la verificación estricta solo para los tests
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
  // Las pruebas de integración necesitan más tiempo (red/BD)
  testTimeout: 20000,
  clearMocks: true,
};
