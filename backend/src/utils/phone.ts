/**
 * Normalización de números de teléfono a formato E.164 (Perú).
 *
 * Twilio y la WhatsApp Cloud API EXIGEN E.164 (`+51XXXXXXXXX`). En la base de
 * datos los números se guardan típicamente con 9 dígitos (celular nacional) o
 * con prefijos variados (+51, 51, 0051, con espacios/guiones). Esta utilidad
 * centraliza la conversión para que TODOS los envíos (cron, OTP, acompañante)
 * usen un número válido y consistente.
 *
 * Reglas (Perú, código de país +51):
 *  - Celulares nacionales: 9 dígitos que empiezan con 9 → `+51` + 9 dígitos.
 *  - Acepta y normaliza prefijos: `+51`, `51`, `0051`.
 *  - Limpia espacios, guiones y paréntesis.
 *  - Devuelve `null` si el número no es válido (para que el emisor lo marque
 *    como fallido en vez de llamar al proveedor con basura).
 */

const PERU_CC = '51';

/** Quita todo lo que no sea dígito (conserva un posible `+` inicial aparte). */
function digitsOnly(raw: string): string {
  return raw.replace(/\D+/g, '');
}

/**
 * Convierte un teléfono peruano a E.164 (`+51XXXXXXXXX`).
 * @returns el número en E.164 o `null` si es inválido.
 */
export function toE164PE(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;

  let digits = digitsOnly(raw);
  if (!digits) return null;

  // Prefijo internacional con 00 → quitar (0051... → 51...)
  if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  // Ya trae el código de país 51 + 9 dígitos (total 11).
  if (digits.length === 11 && digits.startsWith(PERU_CC)) {
    const local = digits.slice(2);
    return isValidPeruMobile(local) ? `+${PERU_CC}${local}` : null;
  }

  // Solo el número nacional de 9 dígitos.
  if (digits.length === 9) {
    return isValidPeruMobile(digits) ? `+${PERU_CC}${digits}` : null;
  }

  // Cualquier otra longitud no es un celular peruano válido.
  return null;
}

/** Un celular peruano válido tiene 9 dígitos y empieza con 9. */
export function isValidPeruMobile(local: string): boolean {
  return /^9\d{8}$/.test(local);
}

/** Valida que una cadena ya esté en formato E.164 genérico (`+` y 8–15 dígitos). */
export function isValidE164(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return /^\+[1-9]\d{7,14}$/.test(value.trim());
}
