/**
 * VITMATERNA — Sistema de Color · "Clinical Calm"
 *
 * Rediseño minimalista de salud: base neutra fría casi blanca, superficies
 * blancas limpias separadas por sombra suave (no por bordes), y un acento de
 * salud verde-azulado (teal/esmeralda) que transmite vida, cuidado y confianza
 * clínica. Un acento por rol + semánticos + semáforo de riesgo.
 *
 * Acentos por rol:
 *   - Gestante: teal-esmeralda (#0C8174) — salud, vida, crecimiento.
 *   - Obstetra: azul clínico sereno (#2C6EA8) — profesionalismo y calma.
 *   - Admin:    slate azulado (#3C5168) — neutralidad de control.
 *
 * Cada color semántico y de riesgo expone 3 variantes:
 *   <name>        → color sólido (texto/íconos)
 *   <name>Mid     → fondo de chips/badges
 *   <name>Light   → fondo ultra suave de tarjetas
 *
 * Todos los pares texto/fondo y texto-blanco/acento cumplen WCAG AA
 * (verificado en __tests__/theme.test.ts con cálculo de contraste en vivo).
 */

/**
 * Neutros compartidos (la base de toda la app).
 * Paleta serena tipo "spa clínico": un neutro frío casi blanco con un matiz
 * verde-azulado imperceptible, superficies blancas puras y jerarquía dada por
 * la sombra suave, con bordes casi invisibles.
 */
export const commonColors = {
  background: '#F6F8F8', // fondo principal (neutro frío casi blanco)
  backgroundWarm: '#F4F8F7', // pantallas gestante (velo teal imperceptible)
  backgroundCool: '#F4F7FA', // pantallas obstetra (velo azul imperceptible)
  surface: '#FFFFFF', // tarjetas y paneles flotantes
  surfaceAlt: '#EEF2F3', // superficie secundaria / inputs / toggles
  surfaceHover: '#E7ECEE', // hover/pressed en superficies

  text: '#16242B', // texto principal (tinta slate-teal profunda, no negro)
  textSecondary: '#566873', // texto secundario (AA 5.4:1 sobre fondo claro)
  textTertiary: '#7E8F99', // placeholders y meta

  border: '#E7ECEE', // borde suave (casi invisible → minimalismo)
  borderLight: '#EEF2F3', // divisor casi invisible
  borderStrong: '#D2DADD', // borde con presencia

  disabled: '#C6D0D3',
  overlay: 'rgba(16, 36, 43, 0.42)', // dimmed detrás de modales (legible)
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#16242B',

  // Texto y superficies SOBRE color (headers con gradiente de rol). Centraliza
  // los blancos translúcidos que antes se escribían a mano en cada pantalla.
  onColorText: '#FFFFFF', // título sobre gradiente
  onColorTextStrong: 'rgba(255,255,255,0.92)', // dato/contador sobre gradiente
  onColorTextSoft: 'rgba(255,255,255,0.86)', // subtítulo sobre gradiente
  onColorTextFaint: 'rgba(255,255,255,0.76)', // etiqueta tenue sobre gradiente
  onColorSurface: 'rgba(255,255,255,0.16)', // fondo de botón sobre gradiente
  onColorSurfaceStrong: 'rgba(255,255,255,0.22)', // fondo de botón (énfasis)
  onColorSurfaceFaint: 'rgba(255,255,255,0.10)', // halo muy tenue sobre gradiente
  onColorTrack: 'rgba(255,255,255,0.26)', // pista de progreso sobre gradiente

  // Banner global "sin conexión": grafito teal, legible sobre cualquier vista.
  bannerBackground: '#16323A',
} as const;

/**
 * Neutros en MODO OSCURO. Mismas claves que commonColors para poder
 * intercambiarlos vía tema. Fondo teal-grafito profundo, superficies elevadas
 * y texto claro, manteniendo el carácter sereno de la marca.
 */
export const commonColorsDark = {
  background: '#0C1417', // fondo principal (grafito teal profundo)
  backgroundWarm: '#0C1614', // gestante (teal muy oscuro)
  backgroundCool: '#0C151C', // obstetra (azul muy oscuro)
  surface: '#152125', // tarjetas y paneles flotantes
  surfaceAlt: '#1C2A2F', // superficie secundaria / inputs
  surfaceHover: '#243439', // hover/pressed

  text: '#EAF2F1', // texto principal (casi blanco con matiz teal)
  textSecondary: '#A6B7BC', // texto secundario
  textTertiary: '#6E8088', // placeholders y meta

  border: '#243135', // borde suave
  borderLight: '#1B262A', // divisor casi invisible
  borderStrong: '#384A50', // borde con presencia

  disabled: '#384A50',
  overlay: 'rgba(0, 0, 0, 0.58)', // dimmed detrás de modales
  transparent: 'transparent',
  white: '#FFFFFF',
  black: '#0C1417',

  onColorText: '#FFFFFF',
  onColorTextStrong: 'rgba(255,255,255,0.92)',
  onColorTextSoft: 'rgba(255,255,255,0.86)',
  onColorTextFaint: 'rgba(255,255,255,0.76)',
  onColorSurface: 'rgba(255,255,255,0.14)',
  onColorSurfaceStrong: 'rgba(255,255,255,0.20)',
  onColorSurfaceFaint: 'rgba(255,255,255,0.08)',
  onColorTrack: 'rgba(255,255,255,0.24)',

  bannerBackground: '#0A1F25',
} as const;

/**
 * Acento del rol gestante — teal-esmeralda de salud.
 * Transmite vida, cuidado y crecimiento. Texto blanco encima cumple AA (4.76:1).
 */
export const gestanteColors = {
  primary: '#0C8174', // teal-esmeralda sereno (WCAG AA con texto blanco)
  primaryDark: '#0A6B60', // hover / estados activos (alias compat)
  primaryLight: '#E7F4F2', // fondo ultra suave
  primaryMid: '#CDE9E5', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#16A394', '#0C8174'] as const, // headers (frescos, serenos)
} as const;

/**
 * Acento del rol obstetra — azul clínico sereno.
 * Calma y profesionalismo médico, sin la frialdad del azul eléctrico.
 */
export const obstetraColors = {
  primary: '#2C6EA8', // azul clínico profesional
  primaryDark: '#235980', // hover / estados activos (alias compat)
  primaryLight: '#E8F1F8', // fondo ultra suave
  primaryMid: '#D0E2F0', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#3D86C4', '#2C6EA8'] as const, // headers
} as const;

/** Acento del rol admin (slate azulado profesional) */
export const adminColors = {
  primary: '#3C5168', // slate con matiz azul, sobrio
  primaryDark: '#2C3D50',
  primaryLight: '#ECF0F4', // fondo ultra suave
  primaryMid: '#D8E0E9', // chips y badges
  onPrimary: '#FFFFFF',
  gradient: ['#4C657F', '#3C5168'] as const, // headers
} as const;

/** CTA secundario compartido (teal claro) — conservado para compatibilidad */
export const accentColors = {
  teal: '#0C8174',
  tealDark: '#0A6B60',
  tealLight: '#E7F4F2',
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
  timeOnBubble: 'rgba(255,255,255,0.78)', // hora sobre burbuja propia
} as const;

/** Colores semánticos (serenos; mantienen significado inequívoco) */
export const semanticColors = {
  success: '#1F9D6B', // verde salud, sereno
  successMid: '#BBEAD3',
  successLight: '#EAF7F0',
  warning: '#B07A14', // ámbar cálido (AA sobre superficie)
  warningMid: '#F6E3B8',
  warningLight: '#FBF4E5',
  danger: '#D64545', // rojo claro e inequívoco — reservado a urgencias
  dangerMid: '#F4C6C6',
  dangerLight: '#FBEDED',
  info: '#2C6EA8', // = azul obstetra (coherencia)
  infoMid: '#D0E2F0',
  infoLight: '#E8F1F8',
} as const;

/**
 * Semáforo de riesgo gestacional (verde/ámbar/rojo).
 * Nunca se usan solos: siempre acompañados de etiqueta de texto.
 */
export const riskColors = {
  riskGreen: '#1F9D6B',
  riskGreenMid: '#BBEAD3',
  riskGreenLight: '#EAF7F0',
  riskYellow: '#B07A14',
  riskYellowMid: '#F6E3B8',
  riskYellowLight: '#FBF4E5',
  riskRed: '#D64545',
  riskRedMid: '#F4C6C6',
  riskRedLight: '#FBEDED',
} as const;

/** Colores de odontograma / mapa dental */
export const dentalColors = {
  treated: '#2C6EA8', // dientes con tratamiento previo
  pending: '#B07A14', // dientes recomendados para tratar
  done: '#1F9D6B',
  toDo: '#B07A14',
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

/**
 * Helper robusto para aplicar opacidad a un color hex. Reemplaza la frágil
 * concatenación `${accent}1A` (que rompe si el color no tiene `#` o si el
 * formato no es 6 dígitos). Soporta hex de 3 y 6 dígitos y devuelve `rgba()`.
 *
 *   withAlpha('#0C8174', 0.1)   → 'rgba(12,129,116,0.1)'
 *   withAlpha('#000', 0.2)      → 'rgba(0,0,0,0.2)'
 */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (h.length !== 6) return hex; // no es hex de 6 → devolver tal cual (fallback seguro)
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

