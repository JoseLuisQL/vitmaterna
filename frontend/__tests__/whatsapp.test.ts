import { normalizePhonePE, buildWhatsAppUrl } from '../src/utils/whatsapp';

describe('WhatsApp utils (RF-9.05)', () => {
  it('normaliza un celular peruano de 9 dígitos anteponiendo 51', () => {
    expect(normalizePhonePE('987654321')).toBe('51987654321');
  });

  it('respeta un número que ya trae código de país 51', () => {
    expect(normalizePhonePE('51987654321')).toBe('51987654321');
  });

  it('limpia símbolos y espacios', () => {
    expect(normalizePhonePE('+51 987-654-321')).toBe('51987654321');
  });

  it('devuelve null para entradas inválidas', () => {
    expect(normalizePhonePE('')).toBeNull();
    expect(normalizePhonePE('abc')).toBeNull();
    expect(normalizePhonePE('123')).toBeNull();
  });

  it('construye una URL wa.me con mensaje codificado', () => {
    const url = buildWhatsAppUrl('987654321', 'Hola obstetra');
    expect(url).toBe('https://wa.me/51987654321?text=Hola%20obstetra');
  });

  it('construye una URL wa.me sin mensaje', () => {
    expect(buildWhatsAppUrl('987654321')).toBe('https://wa.me/51987654321');
  });

  it('devuelve null si el teléfono es inválido', () => {
    expect(buildWhatsAppUrl('123')).toBeNull();
  });
});
