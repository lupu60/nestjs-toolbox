/**
 * Types for @nest-toolbox/response-envelope
 */

/**
 * Pagination metadata included in paginated responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Response metadata attached to every envelope.
 */
export interface ResponseMeta {
  timestamp: string;
  path: string;
  statusCode: number;
  pagination?: PaginationMeta;
}

/**
 * Structured field-level error detail.
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Standard success response envelope.
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
  message: string;
  meta: ResponseMeta;
}

/**
 * Standard error response envelope.
 */
export interface ApiErrorResponse {
  success: false;
  data: null;
  message: string;
  errors: FieldError[];
  meta: ResponseMeta;
}

/**
 * Configuration options for the ResponseEnvelope module.
 */
export interface ResponseEnvelopeOptions {
  /**
   * Default success message when none is provided via @ApiMessage().
   * @default 'OK'
   */
  defaultMessage?: string;

  /**
   * Include the request path in response meta.
   * @default true
   */
  includePath?: boolean;

  /**
   * Include the timestamp in response meta.
   * @default true
   */
  includeTimestamp?: boolean;
}

/**
 * Async module options for forRootAsync.
 */
export interface ResponseEnvelopeAsyncOptions {
  // biome-ignore lint/suspicious/noExplicitAny: NestJS module imports accept any type
  imports?: any[];
  // biome-ignore lint/suspicious/noExplicitAny: NestJS factory pattern requires flexible signature
  useFactory?: (...args: any[]) => Promise<ResponseEnvelopeOptions> | ResponseEnvelopeOptions;
  // biome-ignore lint/suspicious/noExplicitAny: NestJS inject tokens can be any type
  inject?: any[];
}
