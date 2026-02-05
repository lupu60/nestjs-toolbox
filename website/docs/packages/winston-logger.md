---
sidebar_label: "winston-logger"
---

# @nest-toolbox/winston-logger

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fwinston-logger.svg)](https://www.npmjs.com/package/@nest-toolbox/winston-logger)

A NestJS `LoggerService` implementation powered by [Winston](https://github.com/winstonjs/winston) with colorized console output, custom transports, configurable timestamp formats, and custom formatters.

## Installation

```bash
npm install @nest-toolbox/winston-logger
```

## Quick Start

```typescript
import { NestFactory } from '@nestjs/core';
import { WinstonLoggerService } from '@nest-toolbox/winston-logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService({
      projectName: 'my-app',
    }),
  });

  await app.listen(3000);
}
bootstrap();
```

## Features

- **Drop-in NestJS LoggerService** — implements the `LoggerService` interface for seamless integration with `NestFactory.create`
- **Winston-powered** — leverages Winston's robust, battle-tested logging infrastructure
- **Colorized console output** — default formatter applies color coding per log level
- **Custom transports** — add file, HTTP, or any Winston-compatible transport alongside the default console
- **Configurable timestamps** — customize the timestamp format string (e.g., `YYYY-MM-DD HH:mm:ss`)
- **Custom formatters** — replace the default output format with any `winston.Logform.Format`
- **Context & trace support** — pass NestJS-style context labels and error stack traces

## API Reference

### `WinstonLoggerService`

```typescript
import { WinstonLoggerService } from '@nest-toolbox/winston-logger';
```

#### Constructor

```typescript
new WinstonLoggerService(options: WinstonLoggerOptions)
```

#### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `projectName` | `string` | ✅ | Service name used as `defaultMeta.service`. Throws if empty. |
| `transports` | `winston.transport[]` | ❌ | Additional Winston transports. A `Console` transport is always included by default. |
| `timeFormatStr` | `string` | ❌ | Timestamp format string (e.g., `'YYYY-MM-DD HH:mm:ss'`). Uses Winston's default if omitted. |
| `customFormatter` | `winston.Logform.Format` | ❌ | Custom Winston format to replace the default colorized formatter. |

#### Default Format

When no `customFormatter` is provided, the logger uses a colorized format that outputs:

```
<timestamp> <context>: <message> <trace>
```

For example:
```
2024-01-15T10:30:00.000Z UsersService: Fetching all users
```

#### Methods

All methods follow the NestJS `LoggerService` interface:

```typescript
log(message: unknown, context?: string): void
warn(message: unknown, context?: string): void
error(message: unknown, trace?: string, context?: string): void
```

**Parameters:**

| Method | Parameters | Description |
|---|---|---|
| `log` | `message`, `context?` | Log at `info` level |
| `warn` | `message`, `context?` | Log at `warn` level |
| `error` | `message`, `trace?`, `context?` | Log at `error` level with optional stack trace |

## Examples

### Basic Usage with Custom Timestamp

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new WinstonLoggerService({
    projectName: 'my-app',
    timeFormatStr: 'YYYY-MM-DD HH:mm:ss',
  }),
});
```

### Adding File Transport

```typescript
import * as winston from 'winston';
import { WinstonLoggerService } from '@nest-toolbox/winston-logger';

const app = await NestFactory.create(AppModule, {
  logger: new WinstonLoggerService({
    projectName: 'my-app',
    transports: [
      new winston.transports.File({
        filename: 'error.log',
        level: 'error',
      }),
      new winston.transports.File({
        filename: 'combined.log',
        level: 'info',
      }),
    ],
  }),
});
```

### Custom Formatter

```typescript
import * as winston from 'winston';
import { WinstonLoggerService } from '@nest-toolbox/winston-logger';

const jsonFormatter = winston.format.printf(({ level, message, timestamp, context }) => {
  return JSON.stringify({ level, message, timestamp, context });
});

const app = await NestFactory.create(AppModule, {
  logger: new WinstonLoggerService({
    projectName: 'my-app',
    customFormatter: jsonFormatter,
  }),
});
```

### Error Logging with Stack Traces

```typescript
try {
  await someRiskyOperation();
} catch (error) {
  logger.error('Database connection failed', error.stack, 'DatabaseService');
  // Output: <timestamp> DatabaseService: Database connection failed <stack trace>
}
```

### Using with NestJS Logger

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  async createOrder(dto: CreateOrderDto) {
    this.logger.log('Creating new order');
    // Delegates to WinstonLoggerService.log('Creating new order', 'OrdersService')

    try {
      const order = await this.ordersRepository.save(dto);
      this.logger.log(`Order ${order.id} created successfully`);
      return order;
    } catch (error) {
      this.logger.error('Failed to create order', error.stack);
      throw error;
    }
  }
}
```

### Multiple Transports for Production

```typescript
import * as winston from 'winston';
import { WinstonLoggerService } from '@nest-toolbox/winston-logger';

const app = await NestFactory.create(AppModule, {
  logger: new WinstonLoggerService({
    projectName: 'orders-service',
    timeFormatStr: 'YYYY-MM-DD HH:mm:ss.SSS',
    transports: [
      // Errors to separate file
      new winston.transports.File({
        filename: '/var/log/orders/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // All logs to combined file
      new winston.transports.File({
        filename: '/var/log/orders/combined.log',
        maxsize: 5242880,
        maxFiles: 10,
      }),
      // HTTP transport for log aggregation
      new winston.transports.Http({
        host: 'log-aggregator.internal',
        port: 8080,
        level: 'warn',
      }),
    ],
  }),
});
```
