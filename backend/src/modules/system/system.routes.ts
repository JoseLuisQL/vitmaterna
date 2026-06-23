/**
 * Rutas de estado del sistema (públicas).
 *
 * Permiten a la app saber si el sistema está en mantenimiento sin requerir
 * sesión ni rol privilegiado, para mostrar la pantalla correspondiente.
 */
import { Router } from 'express';
import { successResponse } from '../../utils/responseHelper.js';
import { getMaintenanceState } from '../../utils/maintenance.js';

export const systemRoutes = Router();

/** GET /v1/system/status → estado público (mantenimiento + mensaje). */
systemRoutes.get('/status', async (_req, res) => {
  const maintenance = await getMaintenanceState();
  res.json(
    successResponse({
      maintenance: {
        enabled: maintenance.enabled,
        message: maintenance.message,
      },
    }),
  );
});

export default systemRoutes;
