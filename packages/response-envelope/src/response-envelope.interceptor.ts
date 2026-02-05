/**
 * Interceptor that auto-wraps controller responses in the standard envelope.
 *
 * Respects @SkipEnvelope() and @ApiMessage() decorators.
 * Already-wrapped responses (objects with a `success` boolean property) are passed through.
 */

import { type CallHandler, type ExecutionContext, Inject, Injectable, type NestInterceptor, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Observable, map } from 'rxjs';
import { API_MESSAGE_KEY, DEFAULT_MESSAGE, RESPONSE_ENVELOPE_OPTIONS, SKIP_ENVELOPE_KEY } from './constants';
import type { ResponseEnvelopeOptions, ResponseMeta } from './types';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(RESPONSE_ENVELOPE_OPTIONS)
    private readonly options?: ResponseEnvelopeOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const shouldSkip = this.reflector.getAllAndOverride<boolean>(SKIP_ENVELOPE_KEY, [context.getHandler(), context.getClass()]);

    if (shouldSkip) {
      return next.handle();
    }

    const customMessage = this.reflector.getAllAndOverride<string>(API_MESSAGE_KEY, [context.getHandler(), context.getClass()]);

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data: unknown) => {
        // Pass through if already wrapped
        if (isAlreadyWrapped(data)) {
          return data;
        }

        const defaultMsg = this.options?.defaultMessage ?? DEFAULT_MESSAGE;
        const includePath = this.options?.includePath ?? true;
        const includeTimestamp = this.options?.includeTimestamp ?? true;

        const meta: ResponseMeta = {
          timestamp: includeTimestamp ? new Date().toISOString() : '',
          path: includePath ? (request.url ?? '') : '',
          statusCode: response.statusCode ?? 200,
        };

        return {
          success: true as const,
          data: data ?? null,
          message: customMessage ?? defaultMsg,
          meta,
        };
      }),
    );
  }
}

/**
 * Check if the response is already wrapped in our envelope format.
 * A wrapped response has a boolean `success` field and a `meta` object.
 */
function isAlreadyWrapped(data: unknown): boolean {
  if (data === null || data === undefined || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  return typeof obj.success === 'boolean' && typeof obj.meta === 'object' && obj.meta !== null;
}
