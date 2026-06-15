import type { JwtPayload } from 'jsonwebtoken';

// ---- Roles ----
export type UserRole = 'gestante' | 'obstetra' | 'admin';

// ---- JWT ----
export interface AccessTokenPayload extends JwtPayload {
  userId: string;
  dni: string;
  role: UserRole;
}

export interface RefreshTokenPayload extends JwtPayload {
  userId: string;
  sessionId: string;
}

// ---- Request User ----
export interface RequestUser {
  userId: string;
  dni: string;
  role: UserRole;
}

// ---- API Response ----
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---- Custom Error ----
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown[],
    isOperational = true,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

// ---- Common Error Codes ----
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
} as const;

// ---- Express augmentation ----
declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
      requestId?: string;
    }
  }
}
