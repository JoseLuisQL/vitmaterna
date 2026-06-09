import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.js';
import { env } from '../config/env.js';
import { logger } from './requestLogger.middleware.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // AppError (operational, expected)
  if (err instanceof AppError) {
    logger.warn(
      {
        requestId: req.requestId,
        statusCode: err.statusCode,
        code: err.code,
        message: err.message,
        path: req.path,
        method: req.method,
      },
      'Operational error',
    );

    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Unexpected errors
  logger.error(
    {
      requestId: req.requestId,
      error: err.message,
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
    },
    'Unhandled error',
  );

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
    },
  });
}
