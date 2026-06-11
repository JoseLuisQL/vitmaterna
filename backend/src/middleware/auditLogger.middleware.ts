import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

/**
 * Auditoría automática de acciones (RF-10.04 / RNF-3.05).
 *
 * Registra en audit_logs toda solicitud mutante (POST/PUT/PATCH/DELETE) que
 * resulte exitosa (2xx), con usuario, acción, entidad, IP y user-agent.
 * Es complementaria al middleware `audit()` por-ruta (que captura datos
 * anteriores); este captura TODO de forma transversal sin tocar cada ruta.
 *
 * No registra:
 *  - métodos de solo lectura (GET/HEAD/OPTIONS)
 *  - autenticación sensible (login/refresh) para no guardar intentos masivos
 */
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

/** Deriva la entidad a partir del primer segmento del path (sin el prefijo). */
function deriveEntity(path: string): string {
  const clean = path.replace(/^\/v1/, '').split('?')[0];
  const seg = clean.split('/').filter(Boolean);
  return seg[0] ?? 'desconocido';
}

/** Toma el primer segmento que parezca UUID como id de entidad. */
function deriveEntityId(path: string): string | undefined {
  const parts = path.split('/');
  return parts.find((p) => UUID_RE.test(p));
}

export function auditLogger(req: Request, res: Response, next: NextFunction): void {
  if (!MUTATING.has(req.method)) return next();
  const relPath = req.originalUrl.replace(/^\/v1/, '');
  if (SKIP_PATHS.some((p) => relPath.startsWith(p))) return next();

  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const entidadId = deriveEntityId(req.originalUrl);
      // No guardamos contraseñas ni datos sensibles del cuerpo.
      const safeBody = { ...(req.body ?? {}) } as Record<string, unknown>;
      delete safeBody.password;
      delete safeBody.passwordHash;
      delete safeBody.currentPassword;
      delete safeBody.newPassword;

      prisma.auditLog
        .create({
          data: {
            userId: req.user?.userId ?? null,
            accion: req.method,
            entidad: deriveEntity(req.originalUrl),
            entidadId: entidadId ?? null,
            datosNuevos: safeBody as object,
            ipAddress: req.ip ?? null,
            userAgent: req.headers['user-agent'] ?? null,
          },
        })
        .catch((err: Error) => console.error('Audit log error:', err.message));
    }
    return originalJson(body);
  } as typeof res.json;

  next();
}
