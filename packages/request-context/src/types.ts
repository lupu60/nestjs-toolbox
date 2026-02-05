/**
 * Types for @nest-toolbox/request-context
 */

/**
 * The context store held in AsyncLocalStorage for each request.
 * Contains the request ID and an arbitrary key-value map.
 */
export interface ContextStore {
  /** Auto-generated or header-extracted request/correlation ID */
  requestId: string;
  /** Arbitrary key-value pairs set during the request lifecycle */
  values: Map<string, unknown>;
}

/**
 * Configuration options for the RequestContext module.
 */
export interface RequestContextOptions {
  /**
   * HTTP header to read the request ID from.
   * If the header is present, its value is used; otherwise a UUID is generated.
   * @default 'x-request-id'
   */
  requestIdHeader?: string;

  /**
   * Custom function to generate request IDs.
   * Called when no request ID header is found on the incoming request.
   * @default crypto.randomUUID()
   */
  generateId?: () => string;

  /**
   * Whether to set the request ID on the response header.
   * @default true
   */
  setResponseHeader?: boolean;

  /**
   * Response header name for the request ID.
   * @default 'x-request-id'
   */
  responseIdHeader?: string;
}

/**
 * Async module options for forRootAsync.
 */
export interface RequestContextAsyncOptions {
  // biome-ignore lint/suspicious/noExplicitAny: NestJS module imports accept any type
  imports?: any[];
  // biome-ignore lint/suspicious/noExplicitAny: NestJS factory pattern requires flexible signature
  useFactory?: (...args: any[]) => Promise<RequestContextOptions> | RequestContextOptions;
  // biome-ignore lint/suspicious/noExplicitAny: NestJS inject tokens can be any type
  inject?: any[];
}
