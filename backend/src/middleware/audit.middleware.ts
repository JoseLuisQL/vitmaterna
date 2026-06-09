import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';

interface AuditOptions {
  action: string;
  entity: string;
  /** Function to extract the entity ID from the request */
  getEntityId?: (req: Request) => string | undefined;
  /** Function to fetch previous data for comparison */
  getPreviousData?: (req: Request) => Promise<Record<string, unknown> | null>;
}

/**
 * Audit logging middleware.
 * Records actions to the audit_logs table with user info, action details,
 * old/new data, IP address, and user agent.
 */
export function audit(options: AuditOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let previousData: Record<string, unknown> | null = null;

    // Capture previous data before the action is processed
    if (options.getPreviousData) {
      try {
        previousData = await options.getPreviousData(req);
      } catch {
        // Non-critical: proceed without previous data
      }
    }

    // Store the original json method to intercept the response
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      // Only log successful operations (2xx status)
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = options.getEntityId?.(req);
        const newData = (body as Record<string, unknown>)?.data ?? req.body;

        // Fire-and-forget audit log creation
        prisma.auditLog
          .create({
            data: {
              userId: req.user?.userId ?? null,
              accion: options.action,
              entidad: options.entity,
              entidadId: entityId ?? null,
              datosAnteriores: previousData as object ?? undefined,
              datosNuevos: newData as object ?? undefined,
              ipAddress: req.ip ?? null,
              userAgent: req.headers['user-agent'] ?? null,
            },
          })
          .catch((err: Error) => {
            console.error('Failed to write audit log:', err);
          });
      }

      return originalJson(body);
    } as typeof res.json;

    next();
  };
}
