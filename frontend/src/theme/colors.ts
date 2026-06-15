/**
 * VITMATERNA — Sistema de Color (rediseño minimalista ice-blue)
 *
 * Base ice-blue (#EEF2F8) inspirada en apps de salud premium. Superficies
 * blancas flotantes con sombra suave (no bordes como jerarquía principal).
 * Un acento por rol + semánticos + semáforo de riesgo.
 *
 * - Gestante: acento púrpura (#7C3AED)
 * - Obstetra: acento azul brillante (#3A86FF)
 * - Admin: slate profesional (#334155)
 *
 * Cada color semántico y de riesgo expone 3 variantes:
 *   <name>        → color sólido (texto/íconos)
 *   <name>Mid     → fondo de chips/badges
 *   <name>Light   → fondo ultra suave de tarjetas
 */

/** Neutros compartidos (la base de toda la app) */
export const commonColors = {
  background: '#EEF2F8', // fondo principal (ice blue suave)
  backgroundWarm: '#F5F0FF', // fondo para pantallas gestante (tono lila)
  backgroundCool: '#EEF4FF', // fondo para pantallas obstetra (tono azul)
  surface: '#FFFFFF', // tarjetas y paneles flotantes
  surfaceAlt: '#F0F4FC', // superficie secundaria / inputs / toggles
  surfaceHover: '#E8EEFA', // hover/pressed en superficies

  text: '#1E2A3A', // texto principal (azul muy oscuro)
  textSecondary: '#5C6E8E', // texto secundario (azul grisáceo, WCAG AA sobre ice-blue)
  textTertiary: '#9BAAC4', // placeholders y meta (azul claro)

  border: '#E4EAF5', // borde suave (azulado)
  borderLight: '#EEF2F8', // divisor casi invisible
  borderStrong: '#C8D4E8', // borde con presencia

  disabled: '#C5CDD9',
  overlay: 'rgba(30, 42, 58, 0.40)', // dimmed detrás de modales
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#1E2A3A',
} as const;

/** Acento del rol gestante (púrpura/violeta) */
export const gestanteColors = {
  primary: '#7C3AED', // púrpura profundo
  primaryDark: '#6D28D9', // hover / estados activos (alias compat)
  primaryLight: '#F3EEFF', // fondo ultra suave
  primaryMid: '#EDE0FF', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#9B59F5', '#7C3AED'] as const, // headers
} as const;

/** Acento del rol obstetra (azul brillante, referencia) */
export const obstetraColors = {
  primary: '#3A86FF', // azul brillante
  primaryDark: '#2F5FE0', // hover / estados activos (alias compat)
  primaryLight: '#EBF2FF', // fondo ultra suave
  primaryMid: '#DAEAFF', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#5B9FFF', '#3A86FF'] as const, // headers
} as const;

/** Acento del rol admin (slate azulado profesional, con más vida) */
export const adminColors = {
  primary: '#3D5A80', // slate con matiz azul (más vivo que el gris neutro)
  primaryDark: '#2C4566',
  primaryLight: '#EEF3FA', // fondo ultra suave azulado
  primaryMid: '#DCE7F5', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#4A6E96', '#3D5A80'] as const, // headers
} as const;

/** CTA secundario compartido (teal) — conservado para compatibilidad */
export const accentColors = {
  teal: '#06B6D4',
  tealDark: '#0891B2',
  tealLight: '#CFFAFE',
} as const;

/** Colores semánticos */
export const semanticColors = {
  success: '#16A34A',
  successMid: '#BBFFD4',
  successLight: '#F0FFF6',
  warning: '#F59E0B', // amber (más cálido)
  warningMid: '#FFE9B0',
  warningLight: '#FFFBEB',
  danger: '#EF4444', // rojo más moderno
  dangerMid: '#FFCDD2',
  dangerLight: '#FFF5F5',
  info: '#3A86FF',
  infoMid: '#DAEAFF',
  infoLight: '#EBF2FF',
} as const;

/**
 * Semáforo de riesgo gestacional (verde/ámbar/rojo).
 * Nunca se usan solos: siempre acompañados de etiqueta de texto.
 */
export const riskColors = {
  riskGreen: '#10B981',
  riskGreenMid: '#C9FFE5',
  riskGreenLight: '#F0FFF8',
  riskYellow: '#F59E0B',
  riskYellowMid: '#FFE9B0',
  riskYellowLight: '#FFFBEB',
  riskRed: '#EF4444',
  riskRedMid: '#FFCDD2',
  riskRedLight: '#FFF5F5',
} as const;

/** Colores de odontograma / mapa dental */
export const dentalColors = {
  treated: '#3A86FF', // dientes con tratamiento previo
  pending: '#F59E0B', // dientes recomendados para tratar
  done: '#10B981',
  toDo: '#F59E0B',
} as const;

export const colors = {
  gestante: gestanteColors,
  obstetra: obstetraColors,
  admin: adminColors,
  accent: accentColors,
  common: commonColors,
  semantic: semanticColors,
  risk: riskColors,
  dental: dentalColors,
} as const;
