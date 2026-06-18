/**
 * VITMATERNA — Análisis de tickets de Expo Push.
 *
 * Tras enviar push, Expo devuelve un ticket por mensaje. Los que vienen con
 * status 'error' y details.error === 'DeviceNotRegistered' indican que ese token
 * ya no es válido (app desinstalada, sesión cerrada en el dispositivo, etc.) y
 * debe eliminarse para no seguir gastando envíos fallidos.
 *
 * Utilidad PURA (sin BD ni SDK) para poder testearla de forma aislada.
 */

export interface PushTicketLike {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string } | null;
}

/**
 * Dado el arreglo de tokens enviados (en el MISMO orden que los tickets),
 * devuelve los tokens cuyo ticket indica que el dispositivo ya no está
 * registrado y deben eliminarse.
 */
export function getInvalidTokens(tokens: string[], tickets: PushTicketLike[]): string[] {
  const invalid: string[] = [];
  const n = Math.min(tokens.length, tickets.length);
  for (let i = 0; i < n; i++) {
    const t = tickets[i];
    if (t.status === 'error' && t.details?.error === 'DeviceNotRegistered') {
      invalid.push(tokens[i]);
    }
  }
  return invalid;
}
