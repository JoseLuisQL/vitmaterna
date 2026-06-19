import { describe, it, expect } from '@jest/globals';
import { toE164PE, isValidPeruMobile, isValidE164 } from '../../src/utils/phone.js';

describe('Normalización de teléfono a E.164 (Perú)', () => {
  describe('toE164PE', () => {
    it('normaliza un celular nacional de 9 dígitos', () => {
      expect(toE164PE('987654321')).toBe('+51987654321');
      expect(toE164PE('999888777')).toBe('+51999888777');
    });

    it('respeta números que ya traen +51', () => {
      expect(toE164PE('+51987654321')).toBe('+51987654321');
    });

    it('normaliza el prefijo 51 sin +', () => {
      expect(toE164PE('51987654321')).toBe('+51987654321');
    });

    it('normaliza el prefijo internacional 0051', () => {
      expect(toE164PE('0051987654321')).toBe('+51987654321');
    });

    it('limpia espacios, guiones y paréntesis', () => {
      expect(toE164PE('+51 987-654-321')).toBe('+51987654321');
      expect(toE164PE('(987) 654 321')).toBe('+51987654321');
    });

    it('rechaza números que no son celulares peruanos válidos', () => {
      expect(toE164PE('123456789')).toBeNull(); // no empieza con 9
      expect(toE164PE('12345')).toBeNull(); // muy corto
      expect(toE164PE('98765432')).toBeNull(); // 8 dígitos
      expect(toE164PE('9876543210')).toBeNull(); // 10 dígitos sin CC
    });

    it('maneja entradas vacías o nulas', () => {
      expect(toE164PE('')).toBeNull();
      expect(toE164PE(null)).toBeNull();
      expect(toE164PE(undefined)).toBeNull();
      expect(toE164PE('   ')).toBeNull();
    });
  });

  describe('isValidPeruMobile', () => {
    it('acepta 9 dígitos que empiezan con 9', () => {
      expect(isValidPeruMobile('987654321')).toBe(true);
    });
    it('rechaza los que no empiezan con 9 o tienen otra longitud', () => {
      expect(isValidPeruMobile('887654321')).toBe(false);
      expect(isValidPeruMobile('98765432')).toBe(false);
    });
  });

  describe('isValidE164', () => {
    it('valida formato E.164 genérico', () => {
      expect(isValidE164('+51987654321')).toBe(true);
      expect(isValidE164('+15550001111')).toBe(true);
    });
    it('rechaza cadenas sin + o inválidas', () => {
      expect(isValidE164('51987654321')).toBe(false);
      expect(isValidE164('+0123')).toBe(false);
      expect(isValidE164('')).toBe(false);
      expect(isValidE164(null)).toBe(false);
    });
  });
});
