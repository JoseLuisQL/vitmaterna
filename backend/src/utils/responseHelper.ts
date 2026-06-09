import type { ApiSuccessResponse, ApiErrorResponse, PaginationMeta } from '../types/index.js';

/**
 * Build a standard success response.
 */
export function successResponse<T>(data: T, meta?: PaginationMeta): ApiSuccessResponse<T> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
  };

  if (meta) {
    response.meta = meta;
  }

  return response;
}

/**
 * Build a standard error response.
 */
export function errorResponse(
  code: string,
  message: string,
  details?: unknown[],
): ApiErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
}

/**
 * Build pagination meta from total count, page, and limit.
 */
export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
