# @nest-toolbox/response-envelope

Standard API response envelope with interceptor, exception filter, and helpers for NestJS.

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fresponse-envelope.svg)](https://www.npmjs.com/package/@nest-toolbox/response-envelope)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Zero-config** — import the module and every route gets a consistent envelope
- 🎯 **Decorator-first** — `@SkipEnvelope()` and `@ApiMessage()` for per-route control
- 🛡️ **Consistent error formatting** — class-validator errors auto-parsed into structured field errors
- 🔄 **Idempotent** — already-wrapped responses pass through untouched
- ⚙️ **Configurable** — `forRoot()` / `forRootAsync()` for custom defaults
- 📦 **Manual helpers** — `success()`, `error()`, `paginated()` for WebSockets, queues, etc.

## Installation

```bash
npm install @nest-toolbox/response-envelope
```

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

That's it! Every route now returns a consistent envelope. No interceptors to register, no filters to bind.

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

### `ResponseEnvelopeModule.forRoot(options?)`

Register the module globally with static options.

```typescript
ResponseEnvelopeModule.forRoot({
  defaultMessage: 'Success',
  includePath: true,
  includeTimestamp: true,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `defaultMessage` | `string` | `'OK'` | Default success message when `@ApiMessage()` is not used |
| `includePath` | `boolean` | `true` | Include the request path in response meta |
| `includeTimestamp` | `boolean` | `true` | Include the ISO timestamp in response meta |

### `ResponseEnvelopeModule.forRootAsync(options)`

Register the module with async factory injection.

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

### `@SkipEnvelope()`

Skip the envelope for a specific route handler. The raw return value is sent as-is.

```typescript
import { SkipEnvelope } from '@nest-toolbox/response-envelope';

@Controller()
export class AppController {
  @Get('health')
  @SkipEnvelope()
  health() {
    return { status: 'ok' }; // sent as-is, no envelope
  }
}
```

### `@ApiMessage(message)`

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
}
```

### `success(data, options?)`

Manually create a success envelope. Useful outside the HTTP interceptor (WebSocket gateways, message queues, etc.).

```typescript
import { success } from '@nest-toolbox/response-envelope';

const response = success(user, {
  message: 'User found',
  path: '/api/users/1',
  statusCode: 200,
});
```

**Options:** `message?: string`, `path?: string`, `statusCode?: number`, `pagination?: PaginationMeta`

### `error(message, options?)`

Manually create an error envelope.

```typescript
import { error } from '@nest-toolbox/response-envelope';

const response = error('Validation failed', {
  statusCode: 400,
  errors: [{ field: 'email', message: 'must be a valid email' }],
  path: '/api/users',
});
```

**Options:** `errors?: FieldError[]`, `path?: string`, `statusCode?: number`

### `paginated(data, pagination, options?)`

Create a paginated success envelope with pagination metadata.

```typescript
import { paginated } from '@nest-toolbox/response-envelope';

const response = paginated(users, { page: 1, limit: 20, total: 100 }, {
  message: 'Users retrieved',
  path: '/api/users',
});
// → meta.pagination = { page: 1, limit: 20, total: 100, totalPages: 5 }
```

**Pagination:** `page: number`, `limit: number`, `total: number`
**Options:** `message?: string`, `path?: string`, `statusCode?: number`

## Types

All types are exported from the package. See [`src/types.ts`](./src/types.ts) for full definitions.

| Type | Description |
|------|-------------|
| `ApiResponse<T>` | Standard success response envelope |
| `ApiErrorResponse` | Standard error response envelope |
| `ResponseMeta` | Metadata attached to every response (timestamp, path, statusCode) |
| `PaginationMeta` | Pagination info (page, limit, total, totalPages) |
| `FieldError` | Structured field-level error (`{ field, message }`) |
| `ResponseEnvelopeOptions` | Static configuration options for `forRoot()` |
| `ResponseEnvelopeAsyncOptions` | Async configuration options for `forRootAsync()` |

## Integration with Other Toolbox Packages

### @nest-toolbox/typeorm-paginate

The `paginated()` helper pairs naturally with [`@nest-toolbox/typeorm-paginate`](../typeorm-paginate):

```typescript
import { paginate } from '@nest-toolbox/typeorm-paginate';
import { paginated } from '@nest-toolbox/response-envelope';

@Get()
async findAll(@Query() query: PaginationDto) {
  const result = await paginate(this.userRepository, {
    page: query.page,
    limit: query.limit,
  });

  return paginated(result.items, {
    page: result.meta.currentPage,
    limit: result.meta.itemsPerPage,
    total: result.meta.totalItems,
  });
}
```

## License

MIT © [Bogdan Lupu](https://github.com/lupu60)
