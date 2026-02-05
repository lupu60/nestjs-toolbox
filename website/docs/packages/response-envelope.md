---
sidebar_label: "response-envelope"
---

# @nest-toolbox/response-envelope

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fresponse-envelope.svg)](https://www.npmjs.com/package/@nest-toolbox/response-envelope)

Standard API response envelope with interceptor, exception filter, and helpers for NestJS. Zero-config consistent responses across your entire API.

## Installation

```bash
npm install @nest-toolbox/response-envelope
```

**Peer dependencies:** `@nestjs/common`, `@nestjs/core`

## Quick Start

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ResponseEnvelopeModule } from '@nest-toolbox/response-envelope';

@Module({
  imports: [ResponseEnvelopeModule.forRoot()],
})
export class AppModule {}
```

That's it. Every route now returns a consistent envelope — no interceptors to register, no filters to bind.

```typescript
// Before (raw)
@Get(':id')
findOne(@Param('id') id: string) {
  return { id: 1, name: 'Alice' };
}

// After (automatic envelope)
// → { success: true, data: { id: 1, name: "Alice" }, message: "OK", meta: { ... } }
```

## Features

- 🚀 **Zero-config** — Import the module, every route gets a consistent envelope
- 🎯 **Decorator-first** — `@SkipEnvelope()` and `@ApiMessage()` for per-route control
- 🛡️ **Consistent error formatting** — `class-validator` errors auto-parsed into structured field errors
- 🔄 **Idempotent** — Already-wrapped responses pass through untouched
- ⚙️ **Configurable** — `forRoot()` / `forRootAsync()` for custom defaults
- 📦 **Manual helpers** — `success()`, `error()`, `paginated()` for WebSockets, queues, etc.

## Response Format

### Success

```json
{
  "success": true,
  "data": { "id": 1, "name": "Alice" },
  "message": "OK",
  "meta": {
    "timestamp": "2025-02-05T07:32:00.000Z",
    "path": "/api/users/1",
    "statusCode": 200
  }
}
```

### Paginated Success

```json
{
  "success": true,
  "data": [{ "id": 1 }, { "id": 2 }],
  "message": "OK",
  "meta": {
    "timestamp": "2025-02-05T07:32:00.000Z",
    "path": "/api/users",
    "statusCode": 200,
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Error

```json
{
  "success": false,
  "data": null,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "must be a valid email" },
    { "field": "name", "message": "should not be empty" }
  ],
  "meta": {
    "timestamp": "2025-02-05T07:32:00.000Z",
    "path": "/api/users",
    "statusCode": 400
  }
}
```

## API Reference

### `ResponseEnvelopeModule`

#### `ResponseEnvelopeModule.forRoot(options?)`

Register the module globally with static options. Automatically registers the interceptor and exception filter via `APP_INTERCEPTOR` and `APP_FILTER`.

```typescript
ResponseEnvelopeModule.forRoot({
  defaultMessage: 'Success',
  includePath: true,
  includeTimestamp: true,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `defaultMessage` | `string` | `'OK'` | Default success message when `@ApiMessage()` is not used |
| `includePath` | `boolean` | `true` | Include the request path in `meta` |
| `includeTimestamp` | `boolean` | `true` | Include the ISO timestamp in `meta` |

#### `ResponseEnvelopeModule.forRootAsync(options)`

Register with async factory injection.

```typescript
ResponseEnvelopeModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    defaultMessage: config.get('API_DEFAULT_MESSAGE', 'OK'),
    includePath: config.get('API_INCLUDE_PATH') !== 'false',
  }),
  inject: [ConfigService],
});
```

---

### Decorators

#### `@SkipEnvelope()`

Skip the envelope for a specific route handler. The raw return value is sent as-is.

```typescript
import { SkipEnvelope } from '@nest-toolbox/response-envelope';

@Controller()
export class AppController {
  @Get('health')
  @SkipEnvelope()
  health() {
    return { status: 'ok' }; // Sent as-is, no envelope
  }
}
```

#### `@ApiMessage(message)`

Set a custom success message for a route handler.

```typescript
import { ApiMessage } from '@nest-toolbox/response-envelope';

@Controller('users')
export class UsersController {
  @Post()
  @ApiMessage('User created successfully')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }
  // → { success: true, data: { ... }, message: "User created successfully", meta: { ... } }

  @Delete(':id')
  @ApiMessage('User deleted')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

---

### Helper Functions

Manual envelope constructors for contexts outside the HTTP interceptor — WebSocket gateways, message queue handlers, CLI scripts, etc.

#### `success(data, options?)`

Create a success envelope.

```typescript
import { success } from '@nest-toolbox/response-envelope';

const response = success(user, {
  message: 'User found',
  path: '/api/users/1',
  statusCode: 200,
});
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `message` | `string` | `'OK'` | Success message |
| `path` | `string` | `''` | Request path |
| `statusCode` | `number` | `200` | HTTP status code |
| `pagination` | `PaginationMeta` | — | Pagination metadata |

**Returns:** `ApiResponse<T>`

#### `error(message, options?)`

Create an error envelope.

```typescript
import { error } from '@nest-toolbox/response-envelope';

const response = error('Validation failed', {
  statusCode: 400,
  errors: [{ field: 'email', message: 'must be a valid email' }],
  path: '/api/users',
});
```

**Options:**

| Option | Type | Default | Description |
|---|---|---|---|
| `errors` | `FieldError[]` | `[]` | Structured field-level errors |
| `path` | `string` | `''` | Request path |
| `statusCode` | `number` | `500` | HTTP status code |

**Returns:** `ApiErrorResponse`

#### `paginated(data, pagination, options?)`

Create a paginated success envelope. Automatically calculates `totalPages`.

```typescript
import { paginated } from '@nest-toolbox/response-envelope';

const response = paginated(users, { page: 1, limit: 20, total: 100 }, {
  message: 'Users retrieved',
  path: '/api/users',
});
// → meta.pagination = { page: 1, limit: 20, total: 100, totalPages: 5 }
```

**Pagination parameter:**

| Field | Type | Description |
|---|---|---|
| `page` | `number` | Current page number |
| `limit` | `number` | Items per page |
| `total` | `number` | Total items across all pages |

**Options:** Same as `success()` (without `pagination`).

**Returns:** `ApiResponse<T[]>`

---

### Exception Filter

The `EnvelopeExceptionFilter` is automatically registered when you import the module. It catches all exceptions and formats them as `ApiErrorResponse`.

**Handled exception types:**

| Exception | Status Code | Behavior |
|---|---|---|
| `BadRequestException` (class-validator) | 400 | Parses validation messages into `FieldError[]` |
| `NotFoundException` | 404 | Standard error envelope |
| Other `HttpException` | Varies | Uses exception status and message |
| Unknown errors | 500 | `"Internal server error"` |

**class-validator integration:** When using `ValidationPipe`, error messages like `"email must be a valid email"` are automatically parsed — the first word becomes the `field` and the rest becomes the `message`.

---

### Types

All types are exported from the package:

```typescript
import type {
  ApiResponse,                // { success: true, data: T, message: string, meta: ResponseMeta }
  ApiErrorResponse,           // { success: false, data: null, message: string, errors: FieldError[], meta: ResponseMeta }
  ResponseMeta,               // { timestamp: string, path: string, statusCode: number, pagination?: PaginationMeta }
  PaginationMeta,             // { page: number, limit: number, total: number, totalPages: number }
  FieldError,                 // { field: string, message: string }
  ResponseEnvelopeOptions,    // { defaultMessage?, includePath?, includeTimestamp? }
  ResponseEnvelopeAsyncOptions,
} from '@nest-toolbox/response-envelope';
```

## Examples

### Full CRUD controller

```typescript
import { Controller, Get, Post, Delete, Param, Body, Query } from '@nestjs/common';
import { ApiMessage, SkipEnvelope } from '@nest-toolbox/response-envelope';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @ApiMessage('Users retrieved')
  findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
    // → { success: true, data: { ... }, message: "OK", meta: { ... } }
  }

  @Post()
  @ApiMessage('User created successfully')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Delete(':id')
  @ApiMessage('User deleted')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
```

### WebSocket gateway with manual helpers

```typescript
import { WebSocketGateway, SubscribeMessage } from '@nestjs/websockets';
import { success, error } from '@nest-toolbox/response-envelope';

@WebSocketGateway()
export class ChatGateway {
  @SubscribeMessage('message')
  handleMessage(client: any, payload: any) {
    try {
      const result = this.chatService.processMessage(payload);
      return success(result, { message: 'Message sent' });
    } catch (e) {
      return error(e.message, { statusCode: 400 });
    }
  }
}
```

### Integration with @nest-toolbox/typeorm-paginate

The `paginated()` helper pairs naturally with typeorm-paginate:

```typescript
import { rows } from '@nest-toolbox/typeorm-paginate';
import { paginated } from '@nest-toolbox/response-envelope';

@Get()
async findAll(@Query('page') page = 1, @Query('limit') limit = 20) {
  const [items, total] = await this.userRepo.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
  });

  return paginated(items, { page, limit, total });
}
```

### Health check endpoint (skip envelope)

```typescript
@Get('health')
@SkipEnvelope()
health() {
  return {
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  };
}
```

### Already-wrapped responses pass through

If your code already returns an envelope-shaped object (with `success` boolean and `meta` object), the interceptor won't double-wrap it:

```typescript
@Get('custom')
custom() {
  return success({ id: 1 }, { message: 'Custom envelope' });
  // Passes through unchanged — no double-wrapping
}
```
