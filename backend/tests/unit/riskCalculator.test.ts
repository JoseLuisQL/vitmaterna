import { describe, it, expect } from '@jest/globals';
import { calculateRiskLevel } from '../../src/utils/riskCalculator.js';

describe('riskCalculator — semáforo de riesgo gestacional', () => {
  it('gestante sin factores → verde (score 0)', () => {
    const r = calculateRiskLevel({ age: 25, imc: 22, correctedHemoglobin: 12 });
    expect(r.level).toBe('verde');
    expect(r.score).toBe(0);
    expect(r.factors).toHaveLength(0);
  });

  it('edad >35 suma riesgo moderado → amarillo', () => {
    const r = calculateRiskLevel({ age: 37 });
    expect(r.level).toBe('amarillo');
    expect(r.factors.some((f) => f.includes('35'))).toBe(true);
  });

  it('adolescente <15 → al menos amarillo (score 3)', () => {
    const r = calculateRiskLevel({ age: 14 });
    expect(r.score).toBe(3);
    // score 2-3 = amarillo; >=4 = rojo
    expect(r.level).toBe('amarillo');
  });

  it('adolescente <15 con anemia severa → rojo', () => {
    const r = calculateRiskLevel({ age: 14, correctedHemoglobin: 6.5 });
    expect(r.score).toBeGreaterThanOrEqual(4);
    expect(r.level).toBe('rojo');
  });

  it('anemia severa → rojo', () => {
    const r = calculateRiskLevel({ correctedHemoglobin: 6.5 });
    expect(r.level).toBe('rojo');
    expect(r.factors.some((f) => f.toLowerCase().includes('severa'))).toBe(true);
  });

  it('hipertensión severa → rojo', () => {
    const r = calculateRiskLevel({ presionSistolica: 165, presionDiastolica: 115 });
    expect(r.level).toBe('rojo');
  });

  it('antecedente personal de alto riesgo (diabetes) suma 3 → amarillo', () => {
    const r = calculateRiskLevel({ antecedentesPersonales: ['Diabetes mellitus'] });
    expect(r.score).toBe(3);
    expect(r.level).toBe('amarillo');
  });

  it('combina múltiples factores y acumula el score', () => {
    const r = calculateRiskLevel({
      age: 41,
      imc: 31,
      correctedHemoglobin: 9.0,
      cesareasPrevias: 2,
    });
    expect(r.level).toBe('rojo');
    expect(r.factors.length).toBeGreaterThanOrEqual(3);
  });

  it('un solo factor leve (cesárea previa) → amarillo o verde según umbral', () => {
    const r = calculateRiskLevel({ cesareasPrevias: 1 });
    expect(['verde', 'amarillo']).toContain(r.level);
    expect(r.factors).toContain('Cesárea previa');
  });

  it('gran multigesta (>5) suma riesgo', () => {
    const r = calculateRiskLevel({ gestaciones: 6 });
    expect(r.factors.some((f) => f.toLowerCase().includes('multigesta'))).toBe(true);
  });
});
