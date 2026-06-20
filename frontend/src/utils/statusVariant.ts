/**
 * VITMATERNA — Mapeo único estado → variante visual
 *
 * Centraliza el `if (riskLevel === 'Alto') ... else ...` que hoy se repite en
 * cada pantalla (lista de gestantes, dashboards, citas, ficha). Una sola fuente
 * de verdad para que el mismo estado se vea SIEMPRE igual.
 *
 * Acepta las variantes en español/inglés que devuelve el backend y las del UI.
 */
import type { AppBadgeVariant } from '../components/ui/AppBadge';

export type RiskInput =
  | 'verde' | 'amarillo' | 'rojo'
  | 'bajo' | 'medio' | 'moderado' | 'alto'
  | 'Bajo' | 'Medio' | 'Alto'
  | 'low' | 'medium' | 'high'
  | null
  | undefined;

export interface RiskMeta {
  /** Variante para AppBadge. */
  variant: AppBadgeVariant;
  /** Etiqueta legible en español, lista para mostrar. */
  label: string;
  /** Nivel normalizado 0/1/2 (bajo/medio/alto). */
  level: 0 | 1 | 2;
}

/** Normaliza cualquier forma del riesgo a 0 (bajo) / 1 (medio) / 2 (alto). */
export function normalizeRisk(input: RiskInput): 0 | 1 | 2 {
  const v = (input ?? '').toString().toLowerCase();
  if (v === 'rojo' || v === 'alto' || v === 'high') return 2;
  if (v === 'amarillo' || v === 'medio' || v === 'moderado' || v === 'medium') return 1;
  return 0;
}

const RISK_META: Record<0 | 1 | 2, RiskMeta> = {
  0: { variant: 'success', label: 'Sin riesgo', level: 0 },
  1: { variant: 'warning', label: 'Riesgo moderado', level: 1 },
  2: { variant: 'danger', label: 'Alto riesgo', level: 2 },
};

/** Devuelve variante + etiqueta + nivel para un riesgo dado. */
export function riskMeta(input: RiskInput): RiskMeta {
  return RISK_META[normalizeRisk(input)];
}

/** Etiqueta corta del riesgo (para chips estrechos): Bajo / Medio / Alto. */
export function riskShortLabel(input: RiskInput): string {
  return ['Bajo', 'Medio', 'Alto'][normalizeRisk(input)];
}
