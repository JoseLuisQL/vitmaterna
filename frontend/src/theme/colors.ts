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

/**
 * Neutros compartidos (la base de toda la app).
 * Rediseño sereno/minimalista: del ice-blue frío a un neutro cálido casi
 * blanco que transmite paz y limpieza ("spa de salud"), con bordes casi
 * invisibles para que la jerarquía la den las sombras suaves, no las líneas.
 */
export const commonColors = {
  background: '#F7F8FA', // fondo principal (neutro cálido, casi blanco)
  backgroundWarm: '#FAF8FC', // pantallas gestante (velo lila imperceptible)
  backgroundCool: '#F6F9FC', // pantallas obstetra (velo azul imperceptible)
  surface: '#FFFFFF', // tarjetas y paneles flotantes
  surfaceAlt: '#F1F3F7', // superficie secundaria / inputs / toggles
  surfaceHover: '#ECEFF4', // hover/pressed en superficies

  text: '#232A33', // texto principal (gris azulado profundo, no negro puro)
  textSecondary: '#5E6B7A', // texto secundario (AA sobre fondo claro)
  textTertiary: '#9AA6B4', // placeholders y meta

  border: '#EAEDF2', // borde suave (casi invisible → minimalismo)
  borderLight: '#F1F3F7', // divisor casi invisible
  borderStrong: '#D4DAE2', // borde con presencia

  disabled: '#C5CDD9',
  overlay: 'rgba(35, 42, 51, 0.38)', // dimmed detrás de modales
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#232A33',

  // Texto y superficies SOBRE color (headers con gradiente de rol). Centraliza
  // los blancos translúcidos que antes se escribían a mano en cada pantalla.
  onColorText: '#FFFFFF', // título sobre gradiente
  onColorTextStrong: 'rgba(255,255,255,0.90)', // dato/contador sobre gradiente
  onColorTextSoft: 'rgba(255,255,255,0.85)', // subtítulo sobre gradiente
  onColorTextFaint: 'rgba(255,255,255,0.75)', // etiqueta tenue sobre gradiente
  onColorSurface: 'rgba(255,255,255,0.18)', // fondo de botón sobre gradiente
  onColorSurfaceStrong: 'rgba(255,255,255,0.20)', // fondo de botón (énfasis)
  onColorSurfaceFaint: 'rgba(255,255,255,0.10)', // halo muy tenue sobre gradiente
  onColorTrack: 'rgba(255,255,255,0.25)', // pista de progreso sobre gradiente
} as const;

/**
 * Neutros en MODO OSCURO. Mismas claves que commonColors para poder
 * intercambiarlos vía tema. Fondo azul-grafito profundo, superficies elevadas
 * y texto claro, manteniendo el carácter "ice-blue" de la marca.
 */
export const commonColorsDark = {
  background: '#0E1420', // fondo principal (grafito azulado)
  backgroundWarm: '#16111F', // gestante (lila muy oscuro)
  backgroundCool: '#0E1726', // obstetra (azul muy oscuro)
  surface: '#182230', // tarjetas y paneles flotantes
  surfaceAlt: '#1F2A3A', // superficie secundaria / inputs
  surfaceHover: '#26354A', // hover/pressed

  text: '#EAF0FA', // texto principal (casi blanco azulado)
  textSecondary: '#A6B4CC', // texto secundario
  textTertiary: '#6C7C99', // placeholders y meta

  border: '#26303F', // borde suave
  borderLight: '#1C2533', // divisor casi invisible
  borderStrong: '#3A4860', // borde con presencia

  disabled: '#3A4659',
  overlay: 'rgba(0, 0, 0, 0.55)', // dimmed detrás de modales
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#0E1420',
} as const;

/**
 * Acento del rol gestante — lavanda sereno (desaturado).
 * Transmite cuidado y serenidad femenina sin la energía del púrpura vibrante.
 */
export const gestanteColors = {
  primary: '#7468C4', // lavanda sereno (cumple WCAG AA 4.5:1 con texto blanco)
  primaryDark: '#625699', // hover / estados activos (alias compat)
  primaryLight: '#F3F1FB', // fondo ultra suave
  primaryMid: '#E7E3F6', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#9389D6', '#7468C4'] as const, // headers (suaves)
} as const;

/**
 * Acento del rol obstetra — azul confianza (sereno, no eléctrico).
 * Calma y profesionalismo clínico.
 */
export const obstetraColors = {
  primary: '#4A90D9', // azul sereno y profesional
  primaryDark: '#3A78BD', // hover / estados activos (alias compat)
  primaryLight: '#EDF4FB', // fondo ultra suave
  primaryMid: '#D8E8F6', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#5FA3E0', '#4A90D9'] as const, // headers
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
  /** Verde de marca WhatsApp (botón de contacto). */
  whatsapp: '#25D366',
  /** Fondo verde muy claro para íconos/sumarios de WhatsApp. */
  whatsappLight: '#E7F6EE',
} as const;

/**
 * Colores del CHAT. Los "vistos" (read receipts) usan un azul reconocible
 * (estilo mensajería) y los checks sobre la burbuja propia usan blancos
 * translúcidos. Centralizados para no repetirlos en cada pantalla de chat.
 */
export const chatColors = {
  readReceipt: '#9BE7FF', // doble check "visto" (azul claro)
  tickOnBubble: 'rgba(255,255,255,0.6)', // check sencillo sobre burbuja propia
  timeOnBubble: 'rgba(255,255,255,0.75)', // hora sobre burbuja propia
} as const;

/** Colores semánticos (suavizados; mantienen significado inequívoco) */
export const semanticColors = {
  success: '#2EA66E', // verde salud, sereno
  successMid: '#BBEFD2',
  successLight: '#EEF9F2',
  warning: '#E0A23B', // ámbar cálido
  warningMid: '#FBE6BC',
  warningLight: '#FCF6EA',
  danger: '#E05656', // rojo claro e inequívoco — reservado a urgencias
  dangerMid: '#F6C9C9',
  dangerLight: '#FCEFEF',
  info: '#4A90D9', // = azul obstetra (coherencia)
  infoMid: '#D8E8F6',
  infoLight: '#EDF4FB',
} as const;

/**
 * Semáforo de riesgo gestacional (verde/ámbar/rojo).
 * Nunca se usan solos: siempre acompañados de etiqueta de texto.
 */
export const riskColors = {
  riskGreen: '#2EA66E',
  riskGreenMid: '#BBEFD2',
  riskGreenLight: '#EEF9F2',
  riskYellow: '#E0A23B',
  riskYellowMid: '#FBE6BC',
  riskYellowLight: '#FCF6EA',
  riskRed: '#E05656',
  riskRedMid: '#F6C9C9',
  riskRedLight: '#FCEFEF',
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
  chat: chatColors,
} as const;
