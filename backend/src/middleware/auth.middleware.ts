import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError, ErrorCodes } from '../types/index.js';
import type { AccessTokenPayload } from '../types/index.js';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Access token is required');
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

    req.user = {
      userId: decoded.userId,
      dni: decoded.dni,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError(401, ErrorCodes.TOKEN_EXPIRED, 'Access token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError(401, ErrorCodes.INVALID_TOKEN, 'Invalid access token');
    }
    throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Authentication failed');
  }
}

/** Optional authentication – sets req.user if a valid token is present, but does not reject the request otherwise. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next();
    return;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    req.user = {
      userId: decoded.userId,
      dni: decoded.dni,
      role: decoded.role,
    };
  } catch {
    // Token invalid/expired – continue without user
  }

  next();
}
