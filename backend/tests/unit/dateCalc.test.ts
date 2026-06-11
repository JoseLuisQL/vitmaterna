import { describe, it, expect } from '@jest/globals';
import {
  calculateFPP,
  calculateEG,
  getTrimester,
  getWeeksRemaining,
  formatEG,
} from '../../src/utils/dateCalc.js';

describe('dateCalc — cálculos obstétricos', () => {
  describe('calculateFPP (regla de Naegele)', () => {
    it('FUM 2025-01-01 → FPP 2025-10-08', () => {
      const fpp = calculateFPP(new Date('2025-01-01T00:00:00Z'));
      expect(fpp.getUTCFullYear()).toBe(2025);
      expect(fpp.getUTCMonth()).toBe(9); // octubre (0-indexado)
      expect(fpp.getUTCDate()).toBe(8);
    });

    it('FUM 2024-06-15 → FPP 2025-03-22', () => {
      const fpp = calculateFPP(new Date('2024-06-15T00:00:00Z'));
      expect(fpp.getUTCFullYear()).toBe(2025);
      expect(fpp.getUTCMonth()).toBe(2); // marzo
      expect(fpp.getUTCDate()).toBe(22);
    });
  });

  describe('calculateEG (edad gestacional)', () => {
    it('20 semanas exactas desde la FUM', () => {
      const fum = new Date('2025-01-01T00:00:00Z');
      const ref = new Date('2025-05-21T00:00:00Z'); // 140 días = 20 sem
      const eg = calculateEG(fum, ref);
      expect(eg.weeks).toBe(20);
      expect(eg.days).toBe(0);
      expect(eg.totalDays).toBe(140);
    });

    it('semanas y días parciales (15 sem 3 días)', () => {
      const fum = new Date('2025-01-01T00:00:00Z');
      const ref = new Date('2025-04-19T00:00:00Z'); // 108 días
      const eg = calculateEG(fum, ref);
      expect(eg.weeks).toBe(15);
      expect(eg.days).toBe(3);
    });

    it('fecha de referencia anterior a la FUM → 0', () => {
      const fum = new Date('2025-06-01T00:00:00Z');
      const ref = new Date('2025-05-01T00:00:00Z');
      const eg = calculateEG(fum, ref);
      expect(eg).toEqual({ weeks: 0, days: 0, totalDays: 0 });
    });
  });

  describe('getTrimester', () => {
    it('≤13 sem → 1er trimestre', () => {
      expect(getTrimester(1)).toBe(1);
      expect(getTrimester(13)).toBe(1);
    });
    it('14–27 sem → 2do trimestre', () => {
      expect(getTrimester(14)).toBe(2);
      expect(getTrimester(27)).toBe(2);
    });
    it('≥28 sem → 3er trimestre', () => {
      expect(getTrimester(28)).toBe(3);
      expect(getTrimester(40)).toBe(3);
    });
  });

  describe('getWeeksRemaining', () => {
    it('en la semana 30 quedan 10 semanas', () => {
      expect(getWeeksRemaining(30)).toBe(10);
    });
    it('a término o después no es negativo', () => {
      expect(getWeeksRemaining(41)).toBeGreaterThanOrEqual(0);
    });
  });

  describe('formatEG', () => {
    it('formatea semanas y días', () => {
      expect(formatEG(20, 3)).toContain('20');
    });
  });
});
