import type { Request, Response, NextFunction } from 'express';
import { type ZodSchema, ZodError } from 'zod';
import { AppError, ErrorCodes } from '../types/index.js';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Zod validation middleware.
 * Validates req.body, req.params, and/or req.query against the provided schemas.
 * On success, the parsed (and transformed) values replace the originals.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        // Si no llega cuerpo (POST sin body), se valida como objeto vacío para
        // que los esquemas con todos sus campos opcionales/por-defecto pasen.
        const bodyToValidate = req.body === undefined || req.body === null ? {} : req.body;
        req.body = schemas.body.parse(bodyToValidate);
      }
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as typeof req.params;
      }
      if (schemas.query) {
        const parsedQuery = schemas.query.parse(req.query);
        Object.keys(req.query).forEach(key => delete req.query[key]);
        Object.assign(req.query, parsedQuery);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
          code: e.code,
        }));
        throw new AppError(
          400,
          ErrorCodes.VALIDATION_ERROR,
          'Validation failed',
          details,
        );
      }
      throw error;
    }
  };
}
