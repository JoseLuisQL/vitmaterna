/**
 * VITMATERNA — Sistema de Color (estilo SaaS limpio)
 *
 * Base blanca con superficies en gris muy claro. Un acento por rol más un
 * CTA teal compartido. Semánticos verde/naranja/rojo. Paleta alineada a las
 * guías de diseño de referencia (app dental + app de performance).
 *
 * - Gestante: acento púrpura (#7C3AED)
 * - Obstetra: acento azul (#4A7AFF)
 * - Admin: reutiliza el neutro + acento azul
 */

/** Neutros compartidos (la base de toda la app) */
export const commonColors = {
  background: '#FFFFFF', // fondo principal blanco puro
  surface: '#F8F8F8', // tarjetas y superficies (gris muy claro)
  surfaceAlt: '#F2F2F2', // superficie secundaria / chips / toggle track
  text: '#1A1A1A', // texto principal
  textSecondary: '#6B6B6B', // texto secundario
  textTertiary: '#9A9A9A', // texto terciario / placeholders
  border: '#E8E8E8', // bordes de tarjetas y divisores
  borderLight: '#F0F0F0', // divisores muy suaves
  borderStrong: '#D8D8D8', // bordes con más presencia
  disabled: '#CFCFCF',
  overlay: 'rgba(26, 26, 26, 0.30)', // dimmed 30% detrás de modales
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#1A1A1A',
} as const;

/** Acento del rol gestante (púrpura, estilo performance) */
export const gestanteColors = {
  primary: '#7C3AED',
  primaryDark: '#6D28D9', // hover / estados activos
  primaryLight: '#EDE7FE', // fondos suaves del acento
  onPrimary: '#FFFFFF',
} as const;

/** Acento del rol obstetra (azul, estilo dental) */
export const obstetraColors = {
  primary: '#4A7AFF',
  primaryDark: '#2F5FE0',
  primaryLight: '#E5ECFF',
  onPrimary: '#FFFFFF',
} as const;

/** CTA secundario compartido (teal) */
export const accentColors = {
  teal: '#06B6D4',
  tealDark: '#0891B2',
  tealLight: '#CFFAFE',
} as const;

/** Colores semánticos */
export const semanticColors = {
  success: '#16A34A',
  successLight: '#DCFCE7',
  warning: '#F97316',
  warningLight: '#FFEDD5',
  danger: '#DC2626',
  dangerLight: '#FEE2E2',
  info: '#4A7AFF',
  infoLight: '#E5ECFF',
} as const;

/**
 * Semáforo de riesgo gestacional (verde/ámbar/rojo).
 * Nunca se usan solos: siempre acompañados de etiqueta de texto.
 */
export const riskColors = {
  riskGreen: '#22C55E',
  riskGreenLight: '#DCFCE7',
  riskYellow: '#FFC045',
  riskYellowLight: '#FFF4D6',
  riskRed: '#DC2626',
  riskRedLight: '#FEE2E2',
} as const;

/** Colores de odontograma / mapa dental */
export const dentalColors = {
  treated: '#4A7AFF', // dientes con tratamiento previo
  pending: '#FFC045', // dientes recomendados para tratar
  done: '#22C55E',
  toDo: '#F97316',
} as const;

export const colors = {
  gestante: gestanteColors,
  obstetra: obstetraColors,
  accent: accentColors,
  common: commonColors,
  semantic: semanticColors,
  risk: riskColors,
  dental: dentalColors,
} as const;
