/**
 * Estado de "modo mantenimiento" del sistema.
 *
 * El administrador lo activa/desactiva desde la configuración (SystemConfig,
 * claves `maintenanceMode` y `maintenanceMessage`). Cuando está activo, los
 * usuarios que NO son admin quedan bloqueados (503) y la app les muestra una
 * pantalla de mantenimiento; el admin sigue operando con normalidad para poder
 * desactivarlo.
 */
import { getConfigValue } from './systemSettings.js';

export interface MaintenanceState {
  enabled: boolean;
  message: string;
}

const DEFAULT_MESSAGE =
  'Estamos realizando mejoras en VITMATERNA. Vuelve en unos minutos. Gracias por tu paciencia.';

/** Normaliza el valor crudo de SystemConfig (puede venir como boolean o string). */
function toBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

/** Lee el estado de mantenimiento desde SystemConfig (best-effort). */
export async function getMaintenanceState(): Promise<MaintenanceState> {
  try {
    const [enabledRaw, msgRaw] = await Promise.all([
      getConfigValue('maintenanceMode').catch(() => undefined),
      getConfigValue('maintenanceMessage').catch(() => undefined),
    ]);
    const message =
      typeof msgRaw === 'string' && msgRaw.trim().length > 0 ? msgRaw.trim() : DEFAULT_MESSAGE;
    return { enabled: toBool(enabledRaw), message };
  } catch {
    // Ante cualquier fallo de lectura, NO bloqueamos el sistema.
    return { enabled: false, message: DEFAULT_MESSAGE };
  }
}

export const MAINTENANCE_DEFAULT_MESSAGE = DEFAULT_MESSAGE;
