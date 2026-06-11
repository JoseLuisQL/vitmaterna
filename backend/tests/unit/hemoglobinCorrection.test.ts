import { describe, it, expect } from '@jest/globals';
import {
  getAltitudeCorrectionFactor,
  correctByAltitude,
  classifyAnemia,
  analyzeHemoglobin,
} from '../../src/utils/hemoglobinCorrection.js';

describe('hemoglobinCorrection — corrección por altitud (MINSA)', () => {
  describe('getAltitudeCorrectionFactor', () => {
    it('a nivel del mar el factor es 0', () => {
      expect(getAltitudeCorrectionFactor(0)).toBe(0);
      expect(getAltitudeCorrectionFactor(500)).toBe(0);
    });
    it('Talavera (~2926 msnm) usa el factor del tramo 2500–2999 (-1.3)', () => {
      expect(getAltitudeCorrectionFactor(2926)).toBe(-1.3);
    });
    it('por defecto usa la altitud de Talavera', () => {
      expect(getAltitudeCorrectionFactor()).toBe(-1.3);
    });
    it('3000 msnm → -1.8', () => {
      expect(getAltitudeCorrectionFactor(3000)).toBe(-1.8);
    });
    it('4500 msnm → -4.5', () => {
      expect(getAltitudeCorrectionFactor(4500)).toBe(-4.5);
    });
  });

  describe('correctByAltitude', () => {
    it('Hb 12.0 a 2926 msnm → 10.7 (12.0 - 1.3)', () => {
      expect(correctByAltitude(12.0, 2926)).toBe(10.7);
    });
    it('redondea a 1 decimal', () => {
      const r = correctByAltitude(11.55, 2926);
      expect(Number.isInteger(r * 10)).toBe(true);
    });
  });

  describe('classifyAnemia (gestante)', () => {
    it('≥11.0 → normal', () => {
      expect(classifyAnemia(11.0)).toBe('normal');
      expect(classifyAnemia(13.5)).toBe('normal');
    });
    it('10.0–10.9 → leve', () => {
      expect(classifyAnemia(10.5)).toBe('leve');
    });
    it('7.0–9.9 → moderada', () => {
      expect(classifyAnemia(8.0)).toBe('moderada');
    });
    it('<7.0 → severa', () => {
      expect(classifyAnemia(6.5)).toBe('severa');
    });
  });

  describe('analyzeHemoglobin (integración)', () => {
    it('Hb observada 12.0 en Talavera → corregida 10.7, anemia leve', () => {
      const r = analyzeHemoglobin(12.0, 2926);
      expect(r.observedHb).toBe(12.0);
      expect(r.correctedHb).toBe(10.7);
      expect(r.correctionFactor).toBe(-1.3);
      expect(r.classification).toBe('leve');
    });
    it('Hb 13.0 en Talavera → corregida 11.7, normal', () => {
      const r = analyzeHemoglobin(13.0, 2926);
      expect(r.correctedHb).toBe(11.7);
      expect(r.classification).toBe('normal');
    });
  });
});
