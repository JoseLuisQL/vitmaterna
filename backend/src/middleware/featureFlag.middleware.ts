import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../types/index.js';
import { isFeatureEnabled, type FeatureModule } from '../utils/featureFlags.js';

/**
 * Middleware que protege rutas de módulos opcionales (fuera del alcance de los
 * objetivos de la tesis). Si el módulo está desactivado por configuración,
 * responde 404 como si la ruta no existiera. Reversible: basta reactivar el flag.
 */
export function requireFeature(module: FeatureModule) {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await isFeatureEnabled(module);
      if (!enabled) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Módulo no disponible en esta configuración');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
