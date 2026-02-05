---
sidebar_label: "request-context"
---

# @nest-toolbox/request-context

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Frequest-context.svg)](https://www.npmjs.com/package/@nest-toolbox/request-context)

Lightweight AsyncLocalStorage-based request context for NestJS with auto-generated request IDs.

## Installation

```bash
npm install @nest-toolbox/request-context
```

**Peer dependencies:** `@nestjs/common` and `@nestjs/core` (^10.0.0)

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { RequestContextModule } from '@nest-toolbox/request-context';

@Module({
  imports: [RequestContextModule.forRoot()],
})
export class AppModule {}
```

That's it — every HTTP request now has a unique context. Access it from anywhere:

```typescript
import { RequestContext } from '@nest-toolbox/request-context';

// In any service, repository, pipe, or helper — no injection needed
const requestId = RequestContext.requestId;
const userId = RequestContext.get<string>('userId');
```

## Features

- 🪶 **Zero dependencies** — uses Node.js built-in `AsyncLocalStorage`, nothing else
- 🚀 **Zero config** — import the module and every request gets a unique ID
- 🆔 **Auto-generated request IDs** — UUIDv4 by default, or reads from an incoming header
- 📤 **Response header** — sets `x-request-id` on every response automatically
- 🎯 **Static API** — no DI needed, read context from anywhere with `RequestContext.get()`
- 🔀 **Express & Fastify** — works with both adapters out of the box
- 🔒 **Type-safe** — generic `get<T>(key)` for typed access

## API Reference

### `RequestContextModule.forRoot(options?)`

Register the module globally with static options.

```typescript
RequestContextModule.forRoot({
  requestIdHeader: 'x-correlation-id',
  generateId: () => nanoid(),
  setResponseHeader: true,
  responseIdHeader: 'x-correlation-id',
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requestIdHeader` | `string` | `'x-request-id'` | Header to read the incoming request ID from |
| `generateId` | `() => string` | `crypto.randomUUID` | Custom ID generator when no header is present |
| `setResponseHeader` | `boolean` | `true` | Whether to set the request ID on the response |
| `responseIdHeader` | `string` | `'x-request-id'` | Response header name for the request ID |

### `RequestContextModule.forRootAsync(options)`

Register the module with async factory injection. Useful when options depend on configuration services.

```typescript
RequestContextModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    requestIdHeader: config.get('CORRELATION_HEADER', 'x-request-id'),
    setResponseHeader: config.get('SET_RESPONSE_HEADER') !== 'false',
  }),
  inject: [ConfigService],
});
```

#### Async Options

| Option | Type | Description |
|--------|------|-------------|
| `imports` | `any[]` | Modules to import for dependency injection |
| `useFactory` | `(...args) => RequestContextOptions` | Factory function returning options |
| `inject` | `any[]` | Providers to inject into the factory |

### `RequestContext` (Static Class)

The core static API — no injection required. Call from any service, guard, interceptor, pipe, or utility function.

#### `RequestContext.requestId`

Get the current request ID. Returns `undefined` if called outside a request context.

```typescript
import { RequestContext } from '@nest-toolbox/request-context';

const id = RequestContext.requestId;
// → "550e8400-e29b-41d4-a716-446655440000"
```

#### `RequestContext.get<T>(key)`

Get a typed value from the context store.

```typescript
const userId = RequestContext.get<number>('userId');
// → 42 (typed as number | undefined)
```

#### `RequestContext.set(key, value)`

Set a value in the context store. No-op if called outside a context.

```typescript
RequestContext.set('userId', 42);
RequestContext.set('tenantId', 'acme-corp');
```

#### `RequestContext.has(key)`

Check whether a key exists in the context store.

```typescript
if (RequestContext.has('userId')) {
  // user is authenticated
}
```

#### `RequestContext.delete(key)`

Remove a key from the context store. Returns `true` if the key existed.

```typescript
RequestContext.delete('tempToken');
```

#### `RequestContext.getAll()`

Get all key-value pairs as a `ReadonlyMap<string, unknown>`.

```typescript
const entries = RequestContext.getAll();
// → Map { 'userId' => 42, 'tenantId' => 'acme-corp' }
```

#### `RequestContext.run(requestId, fn)`

Run a function within a manually created request context. Useful for testing, WebSocket handlers, message queue consumers, and CRON jobs.

```typescript
const result = await RequestContext.run('test-request-1', async () => {
  RequestContext.set('userId', 1);
  return await myService.doSomething();
});
```

### Exported Types

| Type | Description |
|------|-------------|
| `ContextStore` | Internal store shape (`requestId` + `values` map) |
| `RequestContextOptions` | Static options for `forRoot()` |
| `RequestContextAsyncOptions` | Async options for `forRootAsync()` |

## Examples

### Setting user info in a guard

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { RequestContext } from '@nest-toolbox/request-context';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = await this.authService.validate(request.headers.authorization);

    // Store user info — available everywhere downstream
    RequestContext.set('userId', user.id);
    RequestContext.set('userRole', user.role);

    return true;
  }
}
```

### Multi-tenant service using context

```typescript
import { Injectable } from '@nestjs/common';
import { RequestContext } from '@nest-toolbox/request-context';

@Injectable()
export class InvoiceService {
  constructor(private readonly invoiceRepo: InvoiceRepository) {}

  async findAll() {
    const tenantId = RequestContext.get<string>('tenantId');
    return this.invoiceRepo.find({ where: { tenantId } });
  }
}
```

### Structured logging with request IDs

```typescript
import { LoggerService } from '@nestjs/common';
import { RequestContext } from '@nest-toolbox/request-context';

export class AppLogger implements LoggerService {
  log(message: string) {
    const requestId = RequestContext.requestId ?? 'no-context';
    console.log(`[${requestId}] ${message}`);
  }

  error(message: string, trace?: string) {
    const requestId = RequestContext.requestId ?? 'no-context';
    console.error(`[${requestId}] ${message}`, trace);
  }

  warn(message: string) {
    const requestId = RequestContext.requestId ?? 'no-context';
    console.warn(`[${requestId}] ${message}`);
  }
}
```

### Testing with `RequestContext.run()`

```typescript
import { RequestContext } from '@nest-toolbox/request-context';

describe('InvoiceService', () => {
  it('should filter by tenant', async () => {
    const result = await RequestContext.run('test-req-1', async () => {
      RequestContext.set('tenantId', 'acme-corp');
      return invoiceService.findAll();
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ tenantId: 'acme-corp' }),
      ]),
    );
  });
});
```

### Using a custom ID generator

```typescript
import { nanoid } from 'nanoid';

@Module({
  imports: [
    RequestContextModule.forRoot({
      requestIdHeader: 'x-correlation-id',
      generateId: () => nanoid(),
      responseIdHeader: 'x-correlation-id',
    }),
  ],
})
export class AppModule {}
```
