/**
 * VITMATERNA — Apertura del Manual de Usuario (PDF) por rol.
 *
 * El backend sirve los manuales en `/manuales/<rol>.pdf` (estático, público).
 * En web se abre en una pestaña nueva (visor de PDF del navegador); en móvil,
 * en el navegador/visor del sistema. Mismo patrón que la app usa para abrir
 * recursos educativos (`Linking.openURL`).
 */
import { Linking, Platform } from 'react-native';
import { SERVER_ORIGIN } from '../config/env';
import type { UserRole } from '../types/user';

export const MANUAL_URL: Record<UserRole, string> = {
  gestante: `${SERVER_ORIGIN}/manuales/gestante.pdf`,
  obstetra: `${SERVER_ORIGIN}/manuales/obstetra.pdf`,
  admin: `${SERVER_ORIGIN}/manuales/admin.pdf`,
};

/** Abre el manual de usuario del rol indicado. */
export async function openManual(role: UserRole | undefined): Promise<void> {
  const url = MANUAL_URL[(role as UserRole) ?? 'gestante'] || MANUAL_URL.gestante;
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    await Linking.openURL(url);
  } catch {
    // Como respaldo, intentar de todas formas.
    try {
      await Linking.openURL(url);
    } catch {
      /* noop */
    }
  }
}
