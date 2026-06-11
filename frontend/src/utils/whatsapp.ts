/**
 * VITMATERNA — Utilidades para abrir WhatsApp (RF-9.05).
 *
 * Construye un deep-link `https://wa.me/<numero>?text=<mensaje>` normalizando
 * números peruanos (asume +51 si no trae código de país).
 */
import { Linking } from 'react-native';

/** Normaliza un teléfono a formato internacional sin símbolos (Perú por defecto). */
export function normalizePhonePE(raw: string): string | null {
  if (!raw) return null;
  // Quitar todo lo que no sea dígito.
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Quitar prefijo de salida 00 si viniera.
  if (digits.startsWith('00')) digits = digits.slice(2);

  // Si ya trae código de país peruano (51XXXXXXXXX -> 11 dígitos), usarlo.
  if (digits.startsWith('51') && digits.length === 11) return digits;

  // Número local de 9 dígitos (celular peruano) -> anteponer 51.
  if (digits.length === 9) return `51${digits}`;

  // Otros casos: devolver tal cual si parece razonable.
  if (digits.length >= 8) return digits;

  return null;
}

/** Construye la URL wa.me con mensaje opcional. */
export function buildWhatsAppUrl(phone: string, message?: string): string | null {
  const normalized = normalizePhonePE(phone);
  if (!normalized) return null;
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Abre WhatsApp con el número dado. Devuelve true si se pudo abrir.
 * Si WhatsApp no está instalado, wa.me abre el navegador como respaldo.
 */
export async function openWhatsApp(phone: string, message?: string): Promise<boolean> {
  const url = buildWhatsAppUrl(phone, message);
  if (!url) return false;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
