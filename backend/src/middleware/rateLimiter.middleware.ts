import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import type { Request } from 'express';

/**
 * Permite saltar el rate limiting de forma controlada. Solo se desactiva cuando
 * se ejecutan pruebas (NODE_ENV=test) o explícitamente para pruebas de carga
 * (DISABLE_RATE_LIMIT=true). En producción NUNCA debe activarse esta bandera.
 */
const skipRateLimit = (): boolean =>
  process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

/**
 * Global rate limiter: limits total requests from any source.
 */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_GLOBAL_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  },
});

/**
 * Per-user rate limiter: limits requests per authenticated user or IP.
 * Uses the authenticated userId as key when available, otherwise falls back to IP.
 */
export const userRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req: Request): string => {
    return req.user?.userId || req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests from this user. Please try again later.',
    },
  },
});

/**
 * Strict rate limiter for auth endpoints (login, register, password reset).
 * 10 attempts per 15 minutes per IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  // En el entorno de pruebas (y en pruebas de carga) se desactiva para no
  // provocar 429 falsos en suites que ejecutan muchos logins seguidos.
  skip: skipRateLimit,
  keyGenerator: (req: Request): string => {
    return req.ip || 'unknown';
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});
