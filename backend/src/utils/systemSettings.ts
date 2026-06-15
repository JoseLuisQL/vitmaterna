/**
 * Lectura de parámetros del sistema (SystemConfig) con respaldo en variables
 * de entorno. Centraliza valores configurables por el administrador (RF-10.03),
 * como la altitud para la corrección de hemoglobina.
 */
import { prisma } from '../config/database.js';
import { env } from '../config/env.js';

/** Obtiene un valor de configuración por clave (o undefined si no existe). */
export async function getConfigValue(clave: string): Promise<unknown> {
  const cfg = await prisma.systemConfig.findUnique({ where: { clave } });
  return cfg?.valor;
}

/** Crea o actualiza un valor de configuración por clave. */
export async function setConfigValue(
  clave: string,
  valor: unknown,
  updatedBy?: string,
  descripcion?: string,
): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { clave },
    create: { clave, valor: valor as object, updatedBy: updatedBy ?? null, descripcion: descripcion ?? null },
    update: { valor: valor as object, updatedBy: updatedBy ?? null },
  });
}

/**
 * Altitud (msnm) usada para corregir la hemoglobina. Toma el valor de
 * SystemConfig.altitudMsnm si está definido y es válido; si no, usa
 * env.DEFAULT_ALTITUDE_MSNM (2926 para Talavera por defecto).
 */
export async function getAltitudeMsnm(): Promise<number> {
  const valor = await getConfigValue('altitudMsnm');
  const n = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isNaN(n) && n >= 0 && n <= 6000) return n;
  return env.DEFAULT_ALTITUDE_MSNM;
}
