import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import { API_MESSAGE_KEY, DEFAULT_MESSAGE, SKIP_ENVELOPE_KEY } from '../constants';
import { ResponseEnvelopeInterceptor } from '../response-envelope.interceptor';
import type { ApiResponse } from '../types';

function createMockReflector(overrides: Record<string, unknown> = {}): Reflector {
  return {
    getAllAndOverride: vi.fn((key: string) => overrides[key] ?? undefined),
  } as unknown as Reflector;
}

function createMockContext(options: { url?: string; statusCode?: number } = {}): ExecutionContext {
  const request = { url: options.url ?? '/api/test' };
  const response = { statusCode: options.statusCode ?? 200 };

  return {
    getHandler: vi.fn(() => function handler() {}),
    getClass: vi.fn(() => class TestClass {}),
    switchToHttp: vi.fn(() => ({
      getRequest: vi.fn(() => request),
      getResponse: vi.fn(() => response),
    })),
  } as unknown as ExecutionContext;
}

function createMockCallHandler(data: unknown): CallHandler {
  return {
    handle: vi.fn(() => of(data)),
  } as unknown as CallHandler;
}

describe('ResponseEnvelopeInterceptor', () => {
  it('wraps plain data in envelope format', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext({ url: '/api/users', statusCode: 200 });
    const callHandler = createMockCallHandler({ id: 1, name: 'Alice' });

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toMatchObject({
      success: true,
      data: { id: 1, name: 'Alice' },
      message: DEFAULT_MESSAGE,
      meta: {
        path: '/api/users',
        statusCode: 200,
      },
    });
    expect((result as ApiResponse<unknown>).meta.timestamp).toBeTruthy();
  });

  it('respects @SkipEnvelope() — passes data through unwrapped', async () => {
    const reflector = createMockReflector({ [SKIP_ENVELOPE_KEY]: true });
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const rawData = { custom: 'response' };
    const callHandler = createMockCallHandler(rawData);

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(rawData);
  });

  it('respects @ApiMessage() — uses custom message', async () => {
    const reflector = createMockReflector({ [API_MESSAGE_KEY]: 'User created' });
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const callHandler = createMockCallHandler({ id: 1 });

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).message).toBe('User created');
  });

  it('uses default message from options when no @ApiMessage', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector, {
      defaultMessage: 'Success!',
    });
    const context = createMockContext();
    const callHandler = createMockCallHandler('data');

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).message).toBe('Success!');
  });

  it('passes through already-wrapped responses', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const alreadyWrapped = {
      success: true,
      data: { id: 1 },
      message: 'Already wrapped',
      meta: { timestamp: '2025-01-01', path: '/foo', statusCode: 200 },
    };
    const callHandler = createMockCallHandler(alreadyWrapped);

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(alreadyWrapped);
  });

  it('passes through already-wrapped error responses', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const alreadyWrapped = {
      success: false,
      data: null,
      message: 'Error',
      errors: [],
      meta: { timestamp: '2025-01-01', path: '/foo', statusCode: 400 },
    };
    const callHandler = createMockCallHandler(alreadyWrapped);

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect(result).toEqual(alreadyWrapped);
  });

  it('handles null data by wrapping it as data: null', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const callHandler = createMockCallHandler(null);

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).success).toBe(true);
    expect((result as ApiResponse<unknown>).data).toBeNull();
  });

  it('handles undefined data by wrapping it as data: null', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext();
    const callHandler = createMockCallHandler(undefined);

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).success).toBe(true);
    expect((result as ApiResponse<unknown>).data).toBeNull();
  });

  it('includes path and statusCode from request/response', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector);
    const context = createMockContext({ url: '/api/items/42', statusCode: 201 });
    const callHandler = createMockCallHandler({ id: 42 });

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).meta.path).toBe('/api/items/42');
    expect((result as ApiResponse<unknown>).meta.statusCode).toBe(201);
  });

  it('respects includePath: false option', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector, {
      includePath: false,
    });
    const context = createMockContext({ url: '/api/secret' });
    const callHandler = createMockCallHandler('data');

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).meta.path).toBe('');
  });

  it('respects includeTimestamp: false option', async () => {
    const reflector = createMockReflector();
    const interceptor = new ResponseEnvelopeInterceptor(reflector, {
      includeTimestamp: false,
    });
    const context = createMockContext();
    const callHandler = createMockCallHandler('data');

    const result$ = interceptor.intercept(context, callHandler);
    const result = await lastValueFrom(result$);

    expect((result as ApiResponse<unknown>).meta.timestamp).toBe('');
  });
});
