/**
 * VITMATERNA — Predicción de riesgo de inasistencia a la próxima cita.
 *
 * Objetivo clínico: permitir al obstetra PRIORIZAR seguimiento (recordatorio
 * reforzado, llamada o visita domiciliaria) ANTES de que la gestante falte, en
 * lugar de reaccionar después. Impacta el Objetivo 1 (eficacia del seguimiento
 * prenatal).
 *
 * Enfoque: modelo de REGLAS PONDERADAS, transparente y explicable (no una caja
 * negra). En salud es preferible que el profesional entienda POR QUÉ el sistema
 * marca a una gestante. Es una utilidad PURA (sin BD) para poder testearla.
 *
 * No reemplaza el juicio clínico: es una señal de apoyo.
 */

export type NoShowRiskLevel = 'bajo' | 'medio' | 'alto';

export interface NoShowFactors {
  /** Citas pasadas marcadas como no_asistida. */
  inasistenciasPrevias?: number;
  /** Citas pasadas con asistencia confirmada. */
  asistenciasPrevias?: number;
  /** Solicitudes de reprogramación o cancelaciones previas. */
  reprogramacionesPrevias?: number;
  /** Adherencia a la suplementación (0–100). Baja adherencia correlaciona. */
  adherenciaPct?: number | null;
  /** Distancia aproximada al establecimiento en km (de GPS del domicilio). */
  distanciaKm?: number | null;
  /** ¿Tiene un acompañante/familiar registrado para apoyarla? */
  tieneAcompanante?: boolean;
  /** Nivel de riesgo clínico ('rojo' tiende a más controles y carga). */
  nivelRiesgo?: 'verde' | 'amarillo' | 'rojo' | null;
}

export interface NoShowPrediction {
  /** Puntaje 0–100 (mayor = más probable que falte). */
  score: number;
  /** Nivel categórico para la UI. */
  level: NoShowRiskLevel;
  /** Factores legibles que explican el puntaje (para el obstetra). */
  motivos: string[];
}

/**
 * Distancia Haversine en km entre dos coordenadas. Útil para estimar el esfuerzo
 * de traslado de la gestante al establecimiento.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // radio terrestre km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calcula el riesgo de inasistencia a partir de factores ya conocidos.
 *
 * Pesos (suman hasta ~100). Calibrados con criterio clínico/operacional; el
 * sistema permite ajustarlos en el futuro sin cambiar la interfaz.
 */
export function predictNoShow(factors: NoShowFactors): NoShowPrediction {
  const motivos: string[] = [];
  let score = 0;

  // ---- Historial de inasistencias (la señal más fuerte) ----
  const inas = factors.inasistenciasPrevias ?? 0;
  const asis = factors.asistenciasPrevias ?? 0;
  const totalCitas = inas + asis;
  if (totalCitas > 0) {
    const tasaInasistencia = inas / totalCitas;
    if (tasaInasistencia >= 0.5) {
      score += 40;
      motivos.push(`Faltó a ${inas} de ${totalCitas} citas previas`);
    } else if (tasaInasistencia >= 0.25) {
      score += 25;
      motivos.push(`Historial de inasistencias (${inas} de ${totalCitas})`);
    } else if (inas >= 1) {
      score += 12;
      motivos.push(`${inas} inasistencia(s) previa(s)`);
    }
  } else if (inas >= 1) {
    // Sin asistencias registradas pero con faltas.
    score += 20;
    motivos.push(`${inas} inasistencia(s) sin asistencias registradas`);
  }

  // ---- Reprogramaciones / cancelaciones ----
  const reprog = factors.reprogramacionesPrevias ?? 0;
  if (reprog >= 3) {
    score += 15;
    motivos.push(`Reprogramó/canceló ${reprog} veces`);
  } else if (reprog >= 1) {
    score += 8;
    motivos.push(`${reprog} reprogramación(es) previa(s)`);
  }

  // ---- Adherencia a la suplementación ----
  if (factors.adherenciaPct != null) {
    if (factors.adherenciaPct < 50) {
      score += 20;
      motivos.push(`Adherencia baja al tratamiento (${factors.adherenciaPct}%)`);
    } else if (factors.adherenciaPct < 80) {
      score += 10;
      motivos.push(`Adherencia intermedia (${factors.adherenciaPct}%)`);
    }
  }

  // ---- Distancia al establecimiento ----
  if (factors.distanciaKm != null) {
    if (factors.distanciaKm >= 15) {
      score += 18;
      motivos.push(`Vive lejos del establecimiento (~${Math.round(factors.distanciaKm)} km)`);
    } else if (factors.distanciaKm >= 7) {
      score += 10;
      motivos.push(`Distancia considerable (~${Math.round(factors.distanciaKm)} km)`);
    }
  }

  // ---- Red de apoyo ----
  if (factors.tieneAcompanante === false) {
    score += 8;
    motivos.push('Sin acompañante registrado');
  }

  // ---- Carga por alto riesgo clínico ----
  if (factors.nivelRiesgo === 'rojo') {
    score += 6;
    motivos.push('Alto riesgo clínico (requiere seguimiento estrecho)');
  }

  // Acotar a 0–100.
  score = Math.max(0, Math.min(100, score));

  let level: NoShowRiskLevel;
  if (score >= 50) level = 'alto';
  else if (score >= 25) level = 'medio';
  else level = 'bajo';

  if (motivos.length === 0) {
    motivos.push('Buen historial de asistencia');
  }

  return { score, level, motivos };
}
