import {
  getAUReference,
  classifyAlturaUterina,
  interpolateAU,
} from '../src/utils/clinicalReferences';

describe('Referencias clínicas de altura uterina (RF-5.03)', () => {
  it('devuelve el punto de referencia exacto por semana', () => {
    const ref = getAUReference(20);
    expect(ref).not.toBeNull();
    expect(ref?.semana).toBe(20);
    expect(ref?.p10).toBeLessThan(ref!.p90);
  });

  it('redondea la semana al buscar referencia', () => {
    expect(getAUReference(20.4)?.semana).toBe(20);
  });

  it('clasifica como baja por debajo de P10', () => {
    const ref = getAUReference(28)!;
    expect(classifyAlturaUterina(28, ref.p10 - 1)).toBe('baja');
  });

  it('clasifica como alta por encima de P90', () => {
    const ref = getAUReference(28)!;
    expect(classifyAlturaUterina(28, ref.p90 + 1)).toBe('alta');
  });

  it('clasifica como normal dentro del rango', () => {
    const ref = getAUReference(28)!;
    const medio = (ref.p10 + ref.p90) / 2;
    expect(classifyAlturaUterina(28, medio)).toBe('normal');
  });

  it('devuelve sin_referencia para semanas fuera de tabla', () => {
    expect(classifyAlturaUterina(5, 10)).toBe('sin_referencia');
  });

  it('interpola P10/P90 entre semanas y hace clamp en los extremos', () => {
    const mid = interpolateAU(20.5);
    expect(mid).not.toBeNull();
    expect(mid!.p10).toBeGreaterThan(0);

    const low = interpolateAU(5);
    expect(low).toEqual({ p10: getAUReference(13)!.p10, p90: getAUReference(13)!.p90 });

    const high = interpolateAU(45);
    expect(high).toEqual({ p10: getAUReference(40)!.p10, p90: getAUReference(40)!.p90 });
  });
});
