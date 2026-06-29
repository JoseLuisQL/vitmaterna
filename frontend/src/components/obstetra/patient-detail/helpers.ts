/**
 * VITMATERNA — Helpers del detalle de gestante (ficha obstétrica)
 *
 * Funciones PURAS de presentación/clasificación extraídas del monolito
 * `app/(obstetra)/gestante/[id].tsx` (Fase 3 del rediseño). No contienen
 * lógica de negocio ni mutación: solo clasifican datos clínicos para
 * mostrarlos con el color/etiqueta correctos. Moverlas aquí no cambia el
 * comportamiento de la pantalla.
 */
import { riskColors, semanticColors, commonColors } from '../../../theme/colors';

/** Mapea deep-links antiguos (tab=laboratorio, alarmas, etc.) a los 4 grupos
 * actuales (resumen / embarazo / evolucion / clinico). */
export const TAB_ALIASES: Record<string, string> = {
  datos: 'embarazo',
  personales: 'embarazo',
  antecedentes: 'embarazo',
  seguimiento: 'evolucion',
  controles: 'evolucion',
  visitas: 'evolucion',
  tratamiento: 'clinico',
  vacunas: 'clinico',
  laboratorio: 'clinico',
  alarmas: 'clinico',
};

/** Color de texto del semáforo de riesgo. */
export function riskTextColor(riskLevel?: string): string {
  if (riskLevel === 'Alto') return riskColors.riskRed;
  if (riskLevel === 'Medio') return riskColors.riskYellow;
  return riskColors.riskGreen;
}

/** Fondo suave del semáforo de riesgo (para el banner de estado). */
export function riskBgColor(riskLevel?: string): string {
  if (riskLevel === 'Alto') return riskColors.riskRedLight;
  if (riskLevel === 'Medio') return riskColors.riskYellowLight;
  return riskColors.riskGreenLight;
}

/** Etiqueta legible del nivel de riesgo. */
export function riskLabel(riskLevel?: string): string {
  if (riskLevel === 'Alto') return 'Riesgo alto';
  if (riskLevel === 'Medio') return 'Riesgo moderado';
  return 'Sin riesgo';
}

/**
 * Clasifica un signo vital de un control prenatal como normal o de alerta, para
 * que el obstetra detecte de un vistazo lo que requiere atención.
 * Devuelve 'warn' (fuera de rango) o 'ok'. Rangos de referencia obstétrica.
 */
export function vitalStatus(
  type: 'pa' | 'fcf' | 'temp' | 'pulso',
  c: any,
): 'ok' | 'warn' {
  if (type === 'pa') {
    const s = c.presionSistolica, d = c.presionDiastolica;
    if (s == null || d == null) return 'ok';
    return s >= 140 || d >= 90 || s < 90 ? 'warn' : 'ok';
  }
  if (type === 'fcf') {
    const v = c.fetalHeartRate;
    if (v == null) return 'ok';
    return v < 110 || v > 160 ? 'warn' : 'ok';
  }
  if (type === 'temp') {
    const v = c.temperatura;
    if (v == null) return 'ok';
    return v >= 38 || v < 35 ? 'warn' : 'ok';
  }
  if (type === 'pulso') {
    const v = c.pulsoMaterno;
    if (v == null) return 'ok';
    return v < 60 || v > 100 ? 'warn' : 'ok';
  }
  return 'ok';
}

/** Estado de interpretación de un resultado de laboratorio. */
export type LabState = 'normal' | 'alerta' | 'pendiente' | 'info';

/** Clasifica la hemoglobina (corregida por altitud) según umbrales OMS/MINSA. */
export function classifyHb(corrected: number | null): { state: LabState; label: string } {
  if (corrected == null) return { state: 'pendiente', label: 'Pendiente' };
  if (corrected < 7) return { state: 'alerta', label: 'Anemia severa' };
  if (corrected < 10) return { state: 'alerta', label: 'Anemia moderada' };
  if (corrected < 11) return { state: 'alerta', label: 'Anemia leve' };
  return { state: 'normal', label: 'Normal' };
}

/**
 * Interpreta un resultado cualitativo (VIH, VDRL, Hepatitis B, orina, PAP).
 * Reconoce reactivo/positivo/anormal como alerta; no reactivo/negativo/normal
 * como normal. Sin dato → pendiente.
 */
export function classifyQualitative(value?: string | null): { state: LabState; label: string } {
  if (!value || !String(value).trim()) return { state: 'pendiente', label: 'Pendiente' };
  const v = String(value).toLowerCase();
  if (/(no reactivo|negativo|normal|no reactiv)/.test(v)) return { state: 'normal', label: value };
  if (/(reactivo|positivo|anormal|alterad|patolog)/.test(v)) return { state: 'alerta', label: value };
  return { state: 'info', label: value };
}

/** Metadatos de color por estado de laboratorio (compartido por LabRow). */
export const LAB_STATE_META: Record<LabState, { color: string; bg: string }> = {
  normal: { color: semanticColors.success, bg: semanticColors.successLight },
  alerta: { color: semanticColors.danger, bg: semanticColors.dangerLight },
  pendiente: { color: commonColors.textTertiary, bg: commonColors.surfaceAlt },
  info: { color: semanticColors.info, bg: semanticColors.infoLight },
};

/**
 * Catálogo de exámenes de laboratorio del control prenatal (MINSA). Define para
 * cada uno cómo se captura: 'numeric' (un valor + unidad) o 'qualitative'
 * (opciones reactivo/no reactivo, normal/anormal). Simplifica el formulario:
 * la obstetra ya no decide entre 4 campos de valor.
 */
export interface LabExamType {
  tipo: string;
  label: string;
  kind: 'numeric' | 'qualitative';
  unidad?: string;
  placeholder?: string;
  options?: string[];
  hint?: string;
}

export const LAB_EXAM_TYPES: LabExamType[] = [
  { tipo: 'hemoglobina', label: 'Hemoglobina', kind: 'numeric', unidad: 'g/dL', placeholder: 'Ej. 11.5', hint: 'Se corrige por la altitud automáticamente para evaluar anemia.' },
  { tipo: 'glucemia', label: 'Glucemia', kind: 'numeric', unidad: 'mg/dL', placeholder: 'Ej. 85' },
  { tipo: 'vih', label: 'VIH', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'vdrl', label: 'Sífilis (VDRL/RPR)', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'hepatitis_b', label: 'Hepatitis B', kind: 'qualitative', options: ['No reactivo', 'Reactivo'] },
  { tipo: 'orina', label: 'Orina', kind: 'qualitative', options: ['Normal', 'Anormal'], hint: 'Anormal puede indicar infección urinaria.' },
  { tipo: 'pap', label: 'Papanicolaou', kind: 'qualitative', options: ['Normal', 'Anormal'] },
];
