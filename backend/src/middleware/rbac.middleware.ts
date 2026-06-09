import type { Request, Response, NextFunction } from 'express';
import { AppError, ErrorCodes } from '../types/index.js';
import type { UserRole } from '../types/index.js';

/**
 * Role-Based Access Control middleware.
 * Returns a middleware that checks if the authenticated user's role
 * is included in the list of allowed roles.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        403,
        ErrorCodes.FORBIDDEN,
        `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      );
    }

    next();
  };
}

export const rbac = requireRole;
