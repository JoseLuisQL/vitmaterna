/**
 * Middleware de modo mantenimiento.
 *
 * Si el administrador activó el modo mantenimiento, bloquea las peticiones de
 * usuarios que NO son admin con un 503 estructurado (la app muestra entonces la
 * pantalla de mantenimiento). El admin sigue operando para poder desactivarlo.
 *
 * Se decodifica el token de forma best-effort (sin exigirlo) para conocer el rol
 * sin romper las rutas públicas. Se EXCEPTÚAN siempre las rutas que la app
 * necesita para recuperarse: estado del sistema, login/refresh/logout y el perfil
 * propio. La salud (/health) vive fuera de /v1 y no pasa por aquí.
 */
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AccessTokenPayload } from '../types/index.js';
import { getMaintenanceState } from '../utils/maintenance.js';

// Prefijos (relativos a /v1) que SIEMPRE se permiten, incluso en mantenimiento.
const ALLOWLIST = [
  '/system',           // estado del sistema (lo consulta la app para saber si hay mantenimiento)
  '/auth/login',
  '/auth/refresh',
  '/auth/logout',
  '/auth/me',          // permite resolver la sesión y el rol
];

function rolFromAuthHeader(req: Request): string | null {
  const header = req.headers['authorization'];
  const token = typeof header === 'string' ? header.replace('Bearer ', '') : null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    return decoded.role ?? null;
  } catch {
    return null;
  }
}

export async function maintenanceGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Rutas siempre permitidas.
  if (ALLOWLIST.some((p) => req.path === p || req.path.startsWith(p + '/'))) {
    return next();
  }

  const state = await getMaintenanceState();
  if (!state.enabled) return next();

  // El admin no se ve afectado por el mantenimiento.
  const role = rolFromAuthHeader(req);
  if (role === 'admin') return next();

  res.status(503).json({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: state.message,
      maintenance: true,
    },
  });
}
