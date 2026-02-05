/**
 * Helper functions for manually creating envelope responses.
 *
 * Use these when you need to construct responses outside of the interceptor,
 * for example in WebSocket gateways or message queues.
 */

import { DEFAULT_MESSAGE } from './constants';
import type { ApiErrorResponse, ApiResponse, FieldError, PaginationMeta, ResponseMeta } from './types';

/**
 * Create a success envelope.
 *
 * @param data - The response payload
 * @param options - Optional message, path, statusCode, and pagination
 * @returns A typed ApiResponse envelope
 *
 * @example
 * ```typescript
 * return success(user, { message: 'User found', path: '/api/users/1' });
 * ```
 */
export function success<T>(
  data: T,
  options: {
    message?: string;
    path?: string;
    statusCode?: number;
    pagination?: PaginationMeta;
  } = {},
): ApiResponse<T> {
  const meta: ResponseMeta = {
    timestamp: new Date().toISOString(),
    path: options.path ?? '',
    statusCode: options.statusCode ?? 200,
  };

  if (options.pagination) {
    meta.pagination = options.pagination;
  }

  return {
    success: true,
    data,
    message: options.message ?? DEFAULT_MESSAGE,
    meta,
  };
}

/**
 * Create an error envelope.
 *
 * @param message - The error message
 * @param options - Optional errors array, path, and statusCode
 * @returns A typed ApiErrorResponse envelope
 *
 * @example
 * ```typescript
 * return error('Validation failed', {
 *   statusCode: 400,
 *   errors: [{ field: 'email', message: 'must be a valid email' }],
 * });
 * ```
 */
export function error(
  message: string,
  options: {
    errors?: FieldError[];
    path?: string;
    statusCode?: number;
  } = {},
): ApiErrorResponse {
  return {
    success: false,
    data: null,
    message,
    errors: options.errors ?? [],
    meta: {
      timestamp: new Date().toISOString(),
      path: options.path ?? '',
      statusCode: options.statusCode ?? 500,
    },
  };
}

/**
 * Create a paginated success envelope.
 *
 * @param data - The array of items for the current page
 * @param pagination - Pagination metadata (page, limit, total)
 * @param options - Optional message, path, and statusCode
 * @returns A typed ApiResponse envelope with pagination meta
 *
 * @example
 * ```typescript
 * return paginated(users, { page: 1, limit: 20, total: 100 }, {
 *   path: '/api/users',
 * });
 * ```
 */
export function paginated<T>(
  data: T[],
  pagination: { page: number; limit: number; total: number },
  options: {
    message?: string;
    path?: string;
    statusCode?: number;
  } = {},
): ApiResponse<T[]> {
  const totalPages = pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 0;

  return success(data, {
    ...options,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
    },
  });
}
