import { describe, it, expect } from '@jest/globals';
import {
  VIOLENCE_POSITIVE_THRESHOLD,
  computeViolenceScore,
  isViolencePositive,
  isSrq18Positive,
} from '../../src/utils/screeningThresholds.js';

describe('Umbrales de tamizaje (RF-5.11)', () => {
  describe('violencia', () => {
    it('el umbral positivo es 15', () => {
      expect(VIOLENCE_POSITIVE_THRESHOLD).toBe(15);
    });

    it('puntaje por debajo de 15 es negativo', () => {
      expect(isViolencePositive(0)).toBe(false);
      expect(isViolencePositive(5)).toBe(false);
      expect(isViolencePositive(14)).toBe(false);
    });

    it('puntaje 15 o más es positivo', () => {
      expect(isViolencePositive(15)).toBe(true);
      expect(isViolencePositive(20)).toBe(true);
    });

    it('usa el puntaje explícito si se provee', () => {
      expect(computeViolenceScore({ a: true }, 17)).toBe(17);
    });

    it('calcula el puntaje desde respuestas (afirmativas y numéricas)', () => {
      expect(computeViolenceScore({ a: true, b: 'si', c: false, d: 10 })).toBe(12);
    });

    it('respuestas vacías o nulas dan 0', () => {
      expect(computeViolenceScore(null)).toBe(0);
      expect(computeViolenceScore(undefined)).toBe(0);
      expect(computeViolenceScore({})).toBe(0);
    });
  });

  describe('SRQ-18 (salud mental)', () => {
    it('positivo por trastorno mental (≥9 en 1-18)', () => {
      expect(isSrq18Positive({ p1_18: 9 })).toBe(true);
    });

    it('positivo por síntoma psicótico (≥1 en 19-22)', () => {
      expect(isSrq18Positive({ p19_22: 1 })).toBe(true);
    });

    it('positivo por epilepsia (pregunta 23)', () => {
      expect(isSrq18Positive({ pregunta23: true })).toBe(true);
    });

    it('positivo por consumo de alcohol (≥1 en 24-28)', () => {
      expect(isSrq18Positive({ p24_28: 2 })).toBe(true);
    });

    it('negativo cuando ningún criterio se cumple', () => {
      expect(isSrq18Positive({ p1_18: 8, p19_22: 0, pregunta23: false, p24_28: 0 })).toBe(false);
      expect(isSrq18Positive({})).toBe(false);
    });
  });
});
