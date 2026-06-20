import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import type { Request } from 'express';

/**
 * Normaliza una IP para usarla como clave de rate-limit. Para IPv6 agrupa por
 * prefijo /64 (los primeros 4 grupos), evitando que un cliente evada el límite
 * rotando la parte baja de su dirección.
 */
function normalizeIp(ip: string): string {
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':') + '::/64';
  }
  return ip;
}

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
 *
 * Issue #15: la clave combina IP + DNI en vez de solo IP. En una posta rural con
 * una única conexión (NAT compartido) varias gestantes/obstetras comparten IP;
 * limitar solo por IP las bloqueaba entre sí. Con IP+DNI, el límite aplica por
 * persona. Se mantiene un tope de seguridad por IP a través del global limiter.
 * El umbral por (IP+DNI) se eleva a 15 intentos / 15 min.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // En el entorno de pruebas (y en pruebas de carga) se desactiva para no
  // provocar 429 falsos en suites que ejecutan muchos logins seguidos.
  skip: skipRateLimit,
  keyGenerator: (req: Request): string => {
    const ipKey = normalizeIp(req.ip || 'unknown');
    const dni = typeof req.body?.dni === 'string' ? req.body.dni.trim() : '';
    return dni ? `${ipKey}:${dni}` : ipKey;
  },
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
  },
});
