import { describe, it, expect } from '@jest/globals';
import { calcularRachas, calcularGamificacion } from '../../src/utils/gamification.js';

/** Helper: genera 'yyyy-mm-dd' a `n` días de la referencia (negativo = pasado). */
function dayOffset(ref: Date, n: number): string {
  const d = new Date(ref);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().split('T')[0];
}

describe('Gamificación de adherencia', () => {
  const REF = new Date('2026-06-18T12:00:00.000Z');

  describe('calcularRachas', () => {
    it('sin registros → todo en cero', () => {
      const r = calcularRachas([], REF);
      expect(r).toEqual({ rachaActual: 0, mejorRacha: 0, totalDiasTomados: 0 });
    });

    it('cuenta racha actual de días consecutivos hasta hoy', () => {
      const logs = [
        { fecha: dayOffset(REF, 0), tomado: true },
        { fecha: dayOffset(REF, -1), tomado: true },
        { fecha: dayOffset(REF, -2), tomado: true },
      ];
      const r = calcularRachas(logs, REF);
      expect(r.rachaActual).toBe(3);
      expect(r.mejorRacha).toBe(3);
      expect(r.totalDiasTomados).toBe(3);
    });

    it('la racha sigue viva si el último día tomado fue ayer (hoy aún sin registro)', () => {
      const logs = [
        { fecha: dayOffset(REF, -1), tomado: true },
        { fecha: dayOffset(REF, -2), tomado: true },
      ];
      const r = calcularRachas(logs, REF);
      expect(r.rachaActual).toBe(2);
    });

    it('la racha actual es 0 si el último día tomado es anterior a ayer', () => {
      const logs = [
        { fecha: dayOffset(REF, -3), tomado: true },
        { fecha: dayOffset(REF, -4), tomado: true },
      ];
      const r = calcularRachas(logs, REF);
      expect(r.rachaActual).toBe(0);
      expect(r.mejorRacha).toBe(2);
    });

    it('los días NO tomados no cuentan y rompen la consecutividad', () => {
      const logs = [
        { fecha: dayOffset(REF, 0), tomado: true },
        { fecha: dayOffset(REF, -1), tomado: false },
        { fecha: dayOffset(REF, -2), tomado: true },
        { fecha: dayOffset(REF, -3), tomado: true },
      ];
      const r = calcularRachas(logs, REF);
      expect(r.rachaActual).toBe(1); // solo hoy
      expect(r.mejorRacha).toBe(2); // los dos de hace 2-3 días
      expect(r.totalDiasTomados).toBe(3);
    });

    it('días duplicados se cuentan una sola vez', () => {
      const logs = [
        { fecha: dayOffset(REF, 0), tomado: true },
        { fecha: dayOffset(REF, 0), tomado: true },
      ];
      const r = calcularRachas(logs, REF);
      expect(r.totalDiasTomados).toBe(1);
      expect(r.rachaActual).toBe(1);
    });
  });

  describe('calcularGamificacion (logros y mensaje)', () => {
    it('desbloquea logros según la mejor racha alcanzada', () => {
      const logs = Array.from({ length: 7 }, (_, i) => ({ fecha: dayOffset(REF, -i), tomado: true }));
      const g = calcularGamificacion(logs, REF);
      const desbloqueados = g.logros.filter((l) => l.desbloqueado).map((l) => l.id);
      expect(desbloqueados).toContain('racha_3');
      expect(desbloqueados).toContain('racha_7');
      expect(desbloqueados).not.toContain('racha_14');
    });

    it('un logro se mantiene desbloqueado aunque la racha actual baje', () => {
      // 30 días tomados en el pasado, nada reciente → racha actual 0, mejor 30.
      const logs = Array.from({ length: 30 }, (_, i) => ({ fecha: dayOffset(REF, -10 - i), tomado: true }));
      const g = calcularGamificacion(logs, REF);
      expect(g.rachaActual).toBe(0);
      expect(g.logros.find((l) => l.id === 'racha_30')?.desbloqueado).toBe(true);
    });

    it('siempre devuelve un mensaje motivacional', () => {
      expect(calcularGamificacion([], REF).mensaje).toBeTruthy();
      const logs = [{ fecha: dayOffset(REF, 0), tomado: true }];
      expect(calcularGamificacion(logs, REF).mensaje).toBeTruthy();
    });
  });
});
