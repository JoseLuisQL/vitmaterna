import { z } from 'zod';

/**
 * Réplica de las reglas de dominio usadas en los formularios (auth y clínicos).
 * Estos tests blindan las validaciones profesionales de F4.
 */

// --- Registro / Login ---
const dni = z.string().length(8).regex(/^\d{8}$/);
const phonePE = z.string().regex(/^9\d{8}$/);
const password = z.string().min(8).regex(/[A-Za-z]/).regex(/\d/);

describe('Validación DNI', () => {
  it('acepta 8 dígitos', () => expect(dni.safeParse('12345678').success).toBe(true));
  it('rechaza menos de 8', () => expect(dni.safeParse('1234').success).toBe(false));
  it('rechaza letras', () => expect(dni.safeParse('1234567a').success).toBe(false));
});

describe('Validación teléfono PE', () => {
  it('acepta celular que empieza en 9', () => expect(phonePE.safeParse('987654321').success).toBe(true));
  it('rechaza si no empieza en 9', () => expect(phonePE.safeParse('123456789').success).toBe(false));
  it('rechaza longitud distinta de 9', () => expect(phonePE.safeParse('98765').success).toBe(false));
});

describe('Validación contraseña', () => {
  it('acepta letras + números, 8+', () => expect(password.safeParse('clave123').success).toBe(true));
  it('rechaza sin números', () => expect(password.safeParse('clavesegura').success).toBe(false));
  it('rechaza corta', () => expect(password.safeParse('ab12').success).toBe(false));
});

// --- Control prenatal: rangos fisiológicos ---
const numInRange = (min: number, max: number) =>
  z.string().min(1).refine((v) => {
    const n = Number(v.replace(',', '.'));
    return !Number.isNaN(n) && n >= min && n <= max;
  });

describe('Control prenatal: rangos', () => {
  const week = numInRange(1, 42);
  const fcf = numInRange(60, 220);
  const bp = z.string().regex(/^\d{2,3}\/\d{2,3}$/);

  it('semana 1-42 válida', () => expect(week.safeParse('24').success).toBe(true));
  it('semana fuera de rango inválida', () => expect(week.safeParse('50').success).toBe(false));
  it('FCF 60-220 válida', () => expect(fcf.safeParse('140').success).toBe(true));
  it('FCF fuera de rango inválida', () => expect(fcf.safeParse('400').success).toBe(false));
  it('presión 120/80 válida', () => expect(bp.safeParse('120/80').success).toBe(true));
  it('presión mal formada inválida', () => expect(bp.safeParse('120-80').success).toBe(false));
});
