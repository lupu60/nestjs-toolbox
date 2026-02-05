---
sidebar_label: "http-logger-middleware"
---

# @nest-toolbox/http-logger-middleware

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fhttp-logger-middleware.svg)](https://www.npmjs.com/package/@nest-toolbox/http-logger-middleware)

A NestJS middleware that logs incoming HTTP request details — method, URL, query parameters, route params, and body — using the built-in NestJS `Logger` with colorized (magenta) output.

## Installation

```bash
npm install @nest-toolbox/http-logger-middleware
```

## Quick Start

```typescript
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';

@Module({})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

Every incoming request will now produce a log block like:

```
[HTTP] ---------------------------------------------------------------------------------
[HTTP] request method: POST
[HTTP] request url:  http://localhost:3000/api/v1/users?page=1
[HTTP] request query:  {"page":"1"}
[HTTP] request params:  {"id":"42"}
[HTTP] request body:  {"name":"John","email":"john@example.com"}
[HTTP] ---------------------------------------------------------------------------------
```

## Features

- **Zero configuration** — just apply the middleware, no options needed
- **Smart logging** — only logs `query`, `params`, and `body` when they are non-empty
- **Colorized output** — uses magenta-colored text via [chalk](https://github.com/chalk/chalk) for visual distinction
- **NestJS Logger integration** — logs under the `HTTP` context, works with any custom `LoggerService` you've configured
- **Injectable** — decorated with `@Injectable()`, compatible with NestJS dependency injection

## API Reference

### `HttpLoggerMiddleware`

```typescript
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';
```

An `@Injectable()` NestJS middleware class that implements `NestMiddleware`.

#### Method

```typescript
use(req: Request, res: Response, next: NextFunction): void
```

Logs the following from each incoming Express `Request`:

| Field | Logged When | Example Output |
|---|---|---|
| **method** | Always | `request method: GET` |
| **url** | Always | `request url: http://localhost:3000/api/users` |
| **query** | Non-empty query string | `request query: {"page":"1","limit":"10"}` |
| **params** | Non-empty route params | `request params: {"id":"42"}` |
| **body** | Non-empty request body | `request body: {"name":"John"}` |

Each log block is wrapped in separator lines (`---`) for readability.

## Examples

### Log All Routes

```typescript
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';

@Module({
  imports: [UsersModule, OrdersModule],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```

### Log Specific Routes Only

```typescript
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';
import { UsersController } from './users/users.controller';

@Module({
  imports: [UsersModule],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes(
        { path: 'api/users', method: RequestMethod.ALL },
        { path: 'api/orders', method: RequestMethod.POST },
      );
  }
}
```

### Combine with a Controller

```typescript
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';
import { UsersController } from './users/users.controller';

@Module({})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .forRoutes(UsersController);
  }
}
```

### Pair with BunyanLoggerService or WinstonLoggerService

Since `HttpLoggerMiddleware` uses the NestJS built-in `Logger`, it automatically delegates to whichever `LoggerService` you've configured at bootstrap:

```typescript
import { NestFactory } from '@nestjs/core';
import { BunyanLoggerService } from '@nest-toolbox/bunyan-logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new BunyanLoggerService({
      projectId: 'my-app',
      formatterOptions: { outputMode: 'short', color: true },
    }),
  });

  await app.listen(3000);
  // HttpLoggerMiddleware output will now flow through Bunyan
}
bootstrap();
```

### Exclude Routes

```typescript
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { HttpLoggerMiddleware } from '@nest-toolbox/http-logger-middleware';

@Module({})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(HttpLoggerMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.GET },
        { path: 'metrics', method: RequestMethod.GET },
      )
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```
