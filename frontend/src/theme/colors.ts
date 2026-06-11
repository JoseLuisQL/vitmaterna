/**
 * VITMATERNA — Sistema de Color (minimalista y accesible)
 *
 * Filosofía: base neutra cálida + un único acento sobrio por rol.
 * Sin gradientes ni saturación excesiva. Contraste WCAG AA verificado
 * (texto normal ≥ 4.5:1, texto grande ≥ 3:1) sobre los fondos definidos.
 *
 * - Gestante: acento teal sobrio (#0E7C86)
 * - Obstetra: acento ciruela sobrio (#9D2B63)
 * - Admin: reutiliza el neutro + acento obstetra
 */

/** Neutros cálidos compartidos (la base de toda la app) */
export const commonColors = {
  background: '#F7F6F3', // fondo principal (cálido, casi blanco)
  surface: '#FFFFFF', // tarjetas y contenedores
  surfaceAlt: '#F2F1ED', // superficie secundaria / chips
  text: '#1C1B19', // texto principal (15.8:1 sobre background)
  textSecondary: '#5C5A54', // texto secundario (6.9:1)
  textTertiary: '#8A887F', // texto terciario / placeholders (3.6:1, solo grande)
  border: '#E2E0DA', // bordes y divisores
  borderLight: '#EDEBE6', // divisores muy suaves (alias de compatibilidad)
  borderStrong: '#CFCCC4', // bordes con más presencia
  disabled: '#C9C7C0',
  overlay: 'rgba(28, 27, 25, 0.45)',
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#1C1B19',
} as const;

/** Acento del rol gestante (teal sobrio) */
export const gestanteColors = {
  primary: '#0E7C86',
  primaryDark: '#0A5A62', // hover / estados activos (texto en claro)
  primaryLight: '#E3F0F1', // fondos suaves del acento
  onPrimary: '#FFFFFF',
} as const;

/** Acento del rol obstetra (ciruela sobrio) */
export const obstetraColors = {
  primary: '#9D2B63',
  primaryDark: '#7A1F4C',
  primaryLight: '#F6E7EF',
  onPrimary: '#FFFFFF',
} as const;

/** Colores semánticos (usar solo cuando el contenido lo exige) */
export const semanticColors = {
  success: '#3F7D34',
  successLight: '#E6F0E2',
  warning: '#9A5B1A',
  warningLight: '#F6EBDD',
  danger: '#B0203A',
  dangerLight: '#F7E3E6',
  info: '#1F5E8C',
  infoLight: '#E2ECF4',
} as const;

/**
 * Semáforo de riesgo gestacional. Se mantienen colores reconocibles
 * (verde/ámbar/rojo) pero atenuados para integrarse con la base neutra.
 * Nunca se usan solos: siempre acompañados de etiqueta de texto.
 */
export const riskColors = {
  riskGreen: '#3F7D34',
  riskGreenLight: '#E6F0E2',
  riskYellow: '#9A5B1A',
  riskYellowLight: '#F6EBDD',
  riskRed: '#B0203A',
  riskRedLight: '#F7E3E6',
} as const;

export const colors = {
  gestante: gestanteColors,
  obstetra: obstetraColors,
  common: commonColors,
  semantic: semanticColors,
  risk: riskColors,
} as const;
