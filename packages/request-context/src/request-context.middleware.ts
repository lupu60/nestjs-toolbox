/**
 * NestJS middleware that initializes the request context for each HTTP request.
 *
 * Extracts or generates a request ID and wraps the request lifecycle
 * in AsyncLocalStorage so context is available everywhere.
 */

import { randomUUID } from 'node:crypto';
import { Inject, Injectable, type NestMiddleware, Optional } from '@nestjs/common';
import { DEFAULT_REQUEST_ID_HEADER, REQUEST_CONTEXT_OPTIONS } from './constants';
import { runWithContext } from './request-context';
import type { ContextStore, RequestContextOptions } from './types';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly requestIdHeader: string;
  private readonly generateId: () => string;
  private readonly setResponseHeader: boolean;
  private readonly responseIdHeader: string;

  constructor(
    @Optional()
    @Inject(REQUEST_CONTEXT_OPTIONS)
    options?: RequestContextOptions,
  ) {
    this.requestIdHeader = options?.requestIdHeader ?? DEFAULT_REQUEST_ID_HEADER;
    this.generateId = options?.generateId ?? randomUUID;
    this.setResponseHeader = options?.setResponseHeader ?? true;
    this.responseIdHeader = options?.responseIdHeader ?? DEFAULT_REQUEST_ID_HEADER;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Express/Fastify request/response types vary
  use(req: any, res: any, next: () => void): void {
    const headerValue = req.headers?.[this.requestIdHeader];
    const requestId = typeof headerValue === 'string' && headerValue.length > 0 ? headerValue : this.generateId();

    if (this.setResponseHeader && typeof res.setHeader === 'function') {
      res.setHeader(this.responseIdHeader, requestId);
    }

    const store: ContextStore = { requestId, values: new Map() };
    runWithContext(store, () => next());
  }
}
