/**
 * VITMATERNA — Gamificación de la adherencia a la suplementación.
 *
 * Convierte el historial de tomas (supplement_logs) en señales motivacionales
 * para la gestante: racha actual, mejor racha y logros desbloqueados. El
 * objetivo clínico es elevar la adherencia (Objetivo 2 de la tesis) reforzando
 * la conducta de toma diaria con retroalimentación positiva.
 *
 * Es una utilidad PURA (sin acceso a BD) para poder testearla de forma aislada,
 * igual que `adherence.ts`. El servidor es la fuente de verdad: la racha se
 * calcula aquí y el cliente solo la muestra.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface StreakLogInput {
  /** Fecha del registro (Date o ISO/yyyy-mm-dd). */
  fecha: Date | string;
  /** ¿La gestante tomó el suplemento ese día? */
  tomado: boolean;
}

export interface Achievement {
  /** Identificador estable del logro. */
  id: string;
  /** Etiqueta corta para mostrar. */
  titulo: string;
  /** Descripción motivacional. */
  descripcion: string;
  /** Emoji/ícono representativo. */
  icono: string;
  /** ¿Ya está desbloqueado? */
  desbloqueado: boolean;
}

export interface GamificationResult {
  /** Días consecutivos tomados hasta hoy (o ayer, si hoy aún no registra). */
  rachaActual: number;
  /** Mejor racha histórica de días consecutivos tomados. */
  mejorRacha: number;
  /** Total de días con toma registrada. */
  totalDiasTomados: number;
  /** Logros (desbloqueados y por desbloquear) para mostrar progreso. */
  logros: Achievement[];
  /** Mensaje motivacional acorde a la racha actual. */
  mensaje: string;
}

/** Normaliza una fecha a 'yyyy-mm-dd' (UTC) para comparar por día. */
function toDayKey(fecha: Date | string): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toISOString().split('T')[0];
}

/** Diferencia en días enteros entre dos claves 'yyyy-mm-dd'. */
function dayDiff(aKey: string, bKey: string): number {
  const a = new Date(`${aKey}T00:00:00.000Z`).getTime();
  const b = new Date(`${bKey}T00:00:00.000Z`).getTime();
  return Math.round((a - b) / MS_PER_DAY);
}

/**
 * Calcula racha actual y mejor racha a partir de los días con `tomado === true`.
 * La racha actual cuenta hacia atrás desde HOY; si hoy aún no hay registro pero
 * ayer sí, la racha sigue "viva" (no se penaliza por no haber tomado todavía
 * hoy). Si el último día tomado es anterior a ayer, la racha actual es 0.
 */
export function calcularRachas(
  logs: StreakLogInput[],
  referencia: Date = new Date(),
): { rachaActual: number; mejorRacha: number; totalDiasTomados: number } {
  // Conjunto de días únicos efectivamente tomados.
  const diasTomados = Array.from(
    new Set(logs.filter((l) => l.tomado).map((l) => toDayKey(l.fecha))),
  ).sort(); // ascendente

  const totalDiasTomados = diasTomados.length;
  if (totalDiasTomados === 0) {
    return { rachaActual: 0, mejorRacha: 0, totalDiasTomados: 0 };
  }

  // Mejor racha: recorre los días ordenados contando consecutivos.
  let mejorRacha = 1;
  let run = 1;
  for (let i = 1; i < diasTomados.length; i++) {
    if (dayDiff(diasTomados[i], diasTomados[i - 1]) === 1) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > mejorRacha) mejorRacha = run;
  }

  // Racha actual: desde el último día tomado hacia atrás, solo si ese último
  // día es hoy o ayer (la racha aún no se "rompió").
  const hoyKey = toDayKey(referencia);
  const ultimo = diasTomados[diasTomados.length - 1];
  const distanciaUltimo = dayDiff(hoyKey, ultimo);

  let rachaActual = 0;
  if (distanciaUltimo === 0 || distanciaUltimo === 1) {
    rachaActual = 1;
    for (let i = diasTomados.length - 1; i > 0; i--) {
      if (dayDiff(diasTomados[i], diasTomados[i - 1]) === 1) rachaActual += 1;
      else break;
    }
  }

  return { rachaActual, mejorRacha, totalDiasTomados };
}

/**
 * Hitos de racha (días consecutivos) que desbloquean logros.
 * `icono` es un IDENTIFICADOR de icono (no un emoji): el frontend lo mapea a un
 * icono profesional (Lucide). Mantiene la UI consistente y sin emojis.
 */
const STREAK_MILESTONES: { dias: number; id: string; titulo: string; descripcion: string; icono: string }[] = [
  { dias: 3, id: 'racha_3', titulo: 'Primeros pasos', descripcion: '3 días seguidos', icono: 'sprout' },
  { dias: 7, id: 'racha_7', titulo: 'Una semana firme', descripcion: '7 días seguidos', icono: 'flame' },
  { dias: 14, id: 'racha_14', titulo: 'Constancia', descripcion: '14 días seguidos', icono: 'shield' },
  { dias: 30, id: 'racha_30', titulo: 'Mes ejemplar', descripcion: '30 días seguidos', icono: 'trophy' },
];

/** Mensaje motivacional según la racha actual (sin emojis, tono profesional). */
function mensajeMotivacional(rachaActual: number): string {
  if (rachaActual === 0) return 'Hoy es un buen día para retomar tu suplemento.';
  if (rachaActual < 3) return `Llevas ${rachaActual} día(s) seguido(s). Sigue así por ti y tu bebé.`;
  if (rachaActual < 7) return `${rachaActual} días seguidos. Estás creando un buen hábito.`;
  if (rachaActual < 30) return `Excelente: ${rachaActual} días de constancia.`;
  return `${rachaActual} días seguidos. Eres un ejemplo de cuidado.`;
}

/**
 * Resultado completo de gamificación para mostrar en la app de la gestante.
 */
export function calcularGamificacion(
  logs: StreakLogInput[],
  referencia: Date = new Date(),
): GamificationResult {
  const { rachaActual, mejorRacha, totalDiasTomados } = calcularRachas(logs, referencia);

  const logros: Achievement[] = STREAK_MILESTONES.map((m) => ({
    id: m.id,
    titulo: m.titulo,
    descripcion: m.descripcion,
    icono: m.icono,
    // Un logro se considera desbloqueado si la MEJOR racha alcanzó el hito
    // (no se pierde aunque la racha actual baje: es un reconocimiento histórico).
    desbloqueado: mejorRacha >= m.dias,
  }));

  return {
    rachaActual,
    mejorRacha,
    totalDiasTomados,
    logros,
    mensaje: mensajeMotivacional(rachaActual),
  };
}
