/**
 * VITMATERNA — Resumen clínico autogenerado de la gestante.
 *
 * Al abrir la ficha de una gestante, el obstetra recibe un párrafo de "estado
 * actual" que sintetiza lo esencial: edad gestacional, riesgo, último control,
 * última hemoglobina (corregida por altitud), adherencia y pendientes. Ahorra
 * tiempo de lectura y reduce omisiones en consultas de alta carga.
 *
 * Es una utilidad PURA (sin BD ni LLM): construye el texto con plantillas y la
 * lógica clínica ya existente. Determinista y testeable. El servidor es la
 * fuente de verdad; el cliente solo lo muestra.
 */

import { calculateEG, getTrimester, getWeeksRemaining } from './dateCalc.js';
import { classifyAnemia } from './hemoglobinCorrection.js';

export interface ClinicalSummaryInput {
  nombre?: string | null;
  edad?: number | null;
  nivelRiesgo?: 'verde' | 'amarillo' | 'rojo' | null;
  fum?: Date | string | null;
  fppEco?: Date | string | null;
  fppFum?: Date | string | null;
  /** Último control prenatal (el más reciente). */
  ultimoControl?: {
    fecha: Date | string;
    numeroControl?: number | null;
    presionSistolica?: number | null;
    presionDiastolica?: number | null;
    peso?: number | null;
    alturaUterina?: number | null;
    fcf?: number | null;
  } | null;
  /** Última hemoglobina (ya corregida por altitud si aplica). */
  ultimaHb?: {
    valorCorregido?: number | null;
    valorNumerico?: number | null;
    fecha?: Date | string | null;
  } | null;
  /** Adherencia promedio a la suplementación (0–100). */
  adherenciaPct?: number | null;
  /** Total de controles prenatales registrados. */
  totalControles?: number | null;
  /** Exámenes obligatorios del tamizaje básico que faltan. */
  examenesPendientes?: string[];
  /** Próxima cita programada/confirmada, si existe. */
  proximaCita?: Date | string | null;
}

export interface ClinicalSummary {
  /** Texto narrativo listo para mostrar. */
  texto: string;
  /** Señales destacadas (banderas) para resaltar en la UI. */
  alertas: string[];
  /** Datos clave estructurados (por si la UI quiere chips/badges). */
  destacados: {
    egTexto: string | null;
    trimestre: number | null;
    riesgo: string | null;
    anemia: string | null;
    adherencia: number | null;
  };
}

const RIESGO_TEXTO: Record<string, string> = {
  verde: 'riesgo bajo',
  amarillo: 'riesgo moderado',
  rojo: 'ALTO RIESGO',
};

function fmtFecha(fecha: Date | string): string {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toLocaleDateString('es-PE');
}

/** Genera el resumen clínico a partir de los datos de la gestante. */
export function generarResumenClinico(
  input: ClinicalSummaryInput,
  referencia: Date = new Date(),
): ClinicalSummary {
  const partes: string[] = [];
  const alertas: string[] = [];

  const nombre = input.nombre?.trim() || 'La gestante';

  // ---- Edad gestacional y trimestre ----
  let egTexto: string | null = null;
  let trimestre: number | null = null;
  if (input.fum) {
    const eg = calculateEG(new Date(input.fum), referencia);
    if (eg.totalDays > 0) {
      egTexto = `${eg.weeks} sem ${eg.days} d`;
      trimestre = getTrimester(eg.weeks);
      const restantes = getWeeksRemaining(eg.weeks);
      partes.push(
        `${nombre}${input.edad ? `, ${input.edad} años,` : ''} cursa ${eg.weeks} semanas de gestación (${trimestre}° trimestre)` +
          (restantes > 0 ? `; faltan ~${restantes} semanas para la FPP.` : '.'),
      );
    }
  }
  if (!egTexto) {
    partes.push(`${nombre}${input.edad ? `, ${input.edad} años` : ''} sin FUM registrada para calcular la edad gestacional.`);
  }

  // ---- Nivel de riesgo ----
  let riesgoTxt: string | null = null;
  if (input.nivelRiesgo) {
    riesgoTxt = RIESGO_TEXTO[input.nivelRiesgo] ?? input.nivelRiesgo;
    partes.push(`Clasificada como ${riesgoTxt}.`);
    if (input.nivelRiesgo === 'rojo') alertas.push('Alto riesgo: requiere seguimiento estrecho.');
  }

  // ---- Último control ----
  if (input.ultimoControl) {
    const c = input.ultimoControl;
    const detalle: string[] = [];
    if (c.presionSistolica && c.presionDiastolica) {
      detalle.push(`PA ${c.presionSistolica}/${c.presionDiastolica}`);
      if (c.presionSistolica >= 140 || c.presionDiastolica >= 90) {
        alertas.push(`Presión arterial elevada (${c.presionSistolica}/${c.presionDiastolica}).`);
      }
    }
    if (c.peso != null) detalle.push(`peso ${c.peso} kg`);
    if (c.alturaUterina != null) detalle.push(`AU ${c.alturaUterina} cm`);
    if (c.fcf != null) detalle.push(`FCF ${c.fcf} lpm`);
    partes.push(
      `Último control (${c.numeroControl ? `N° ${c.numeroControl}, ` : ''}${fmtFecha(c.fecha)})` +
        (detalle.length ? `: ${detalle.join(', ')}.` : ' sin signos registrados.'),
    );
  } else {
    partes.push('Aún no tiene controles prenatales registrados.');
    alertas.push('Sin controles prenatales registrados.');
  }

  // ---- Hemoglobina / anemia ----
  let anemiaTxt: string | null = null;
  const hbVal = input.ultimaHb?.valorCorregido ?? input.ultimaHb?.valorNumerico;
  if (hbVal != null) {
    const clas = classifyAnemia(Number(hbVal));
    anemiaTxt = clas;
    const fechaHb = input.ultimaHb?.fecha ? ` (${fmtFecha(input.ultimaHb.fecha)})` : '';
    if (clas === 'normal') {
      partes.push(`Hemoglobina ${hbVal} g/dL${fechaHb}: sin anemia.`);
    } else {
      partes.push(`Hemoglobina ${hbVal} g/dL${fechaHb}: anemia ${clas}.`);
      alertas.push(`Anemia ${clas} (Hb ${hbVal} g/dL).`);
    }
  }

  // ---- Adherencia ----
  if (input.adherenciaPct != null) {
    partes.push(`Adherencia a la suplementación: ${input.adherenciaPct}%.`);
    if (input.adherenciaPct < 50) alertas.push(`Adherencia baja (${input.adherenciaPct}%).`);
  }

  // ---- Exámenes pendientes ----
  if (input.examenesPendientes && input.examenesPendientes.length > 0) {
    partes.push(`Exámenes pendientes del tamizaje básico: ${input.examenesPendientes.join(', ')}.`);
    alertas.push(`Exámenes pendientes: ${input.examenesPendientes.join(', ')}.`);
  }

  // ---- Próxima cita ----
  if (input.proximaCita) {
    partes.push(`Próxima cita: ${fmtFecha(input.proximaCita)}.`);
  } else {
    alertas.push('Sin próxima cita programada.');
  }

  return {
    texto: partes.join(' '),
    alertas,
    destacados: {
      egTexto,
      trimestre,
      riesgo: riesgoTxt,
      anemia: anemiaTxt,
      adherencia: input.adherenciaPct ?? null,
    },
  };
}
