---
sidebar_label: "bunyan-logger"
---

# @nest-toolbox/bunyan-logger

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fbunyan-logger.svg)](https://www.npmjs.com/package/@nest-toolbox/bunyan-logger)

A NestJS `LoggerService` implementation powered by [Bunyan](https://github.com/trentm/node-bunyan) with colorized output, string interpolation, message truncation, and custom stream support.

## Installation

```bash
npm install @nest-toolbox/bunyan-logger
```

## Quick Start

```typescript
import { NestFactory } from '@nestjs/core';
import { BunyanLoggerService } from '@nest-toolbox/bunyan-logger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new BunyanLoggerService({
      projectId: 'my-app',
      formatterOptions: {
        outputMode: 'short',
        color: true,
      },
    }),
  });

  await app.listen(3000);
}
bootstrap();
```

## Features

- **Drop-in NestJS LoggerService** — implements the `LoggerService` interface, works seamlessly with `NestFactory.create`
- **Bunyan-powered** — leverages Bunyan's structured JSON logging under the hood
- **Configurable output formats** — `short`, `long`, `simple`, `json`, `bunyan`, and `inspect` via [bunyan-format](https://github.com/thlorenz/bunyan-format)
- **Colorized output** — automatic color coding for `error` (red) and `warn` (yellow) messages, with toggle support
- **String interpolation** — use `{placeholder}` syntax in log messages with automatic value substitution
- **Message truncation** — optional `maxLength` to cap log message size in production
- **Custom streams** — add Elasticsearch, file, or any Bunyan-compatible stream
- **Extra fields** — attach global metadata (environment, microservice name) to every log entry
- **Context support** — pass NestJS-style context strings to all log methods

## API Reference

### `BunyanLoggerService`

```typescript
import { BunyanLoggerService } from '@nest-toolbox/bunyan-logger';
```

#### Constructor

```typescript
new BunyanLoggerService(options: BunyanLoggerOptions)
```

#### Options

| Option | Type | Required | Description |
|---|---|---|---|
| `projectId` | `string` | ✅ | Logger name / project identifier. Throws if empty. |
| `formatterOptions` | `FormatterOptions` | ✅ | Configuration for [bunyan-format](https://github.com/thlorenz/bunyan-format) output. |
| `customStreams` | `Bunyan.Stream[]` | ❌ | Additional Bunyan streams (file, Elasticsearch, etc.). |
| `extraFields` | `Record<string, string>` | ❌ | Key-value pairs added to every log entry. |
| `maxLength` | `number` | ❌ | Maximum character length for log messages. Messages exceeding this are truncated. |

#### `FormatterOptions`

| Option | Type | Default | Description |
|---|---|---|---|
| `outputMode` | `'short' \| 'long' \| 'simple' \| 'json' \| 'bunyan' \| 'inspect'` | — | Output format mode (required). |
| `color` | `boolean` | `true` | Enable/disable colorized output. |
| `levelInString` | `boolean` | `false` | Display log level as string instead of number. |
| `colorFromLevel` | `Record<string, string>` | — | Custom color mapping for log levels. |
| `src` | `boolean` | `false` | Include source file/line information in log output. |

#### Methods

All methods follow the NestJS `LoggerService` interface:

```typescript
log(message: unknown, ...optionalParams: unknown[]): void
warn(message: unknown, ...optionalParams: unknown[]): void
error(message: unknown, ...optionalParams: unknown[]): void
```

**Parameters:**

- `message` — The log message. Can be a `string`, object, or array (for backward compatibility).
- `...optionalParams` — Optional parameters:
  - An object with key-value pairs for **string interpolation** (e.g., `{ user: 'John' }`)
  - A trailing `string` is treated as the NestJS **context** label
  - For `error()`: a stack trace string can be passed as the first optional param

## Examples

### Basic Usage with Context

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  findAll() {
    this.logger.log('Fetching all users');
    // With NestJS's built-in Logger delegating to BunyanLoggerService,
    // the context "UsersService" is automatically included
  }
}
```

### String Interpolation

Use `{placeholder}` syntax to inject values into log messages:

```typescript
// Simple interpolation
logger.log('Hello {name}, welcome to {app}!', { name: 'John', app: 'MyApp' });
// Output: Hello John, welcome to MyApp!

// With context
logger.warn(
  '{user} tried to access the {service} service with an expired key!',
  { user: 'E73882', service: 'PurchaseOrder' },
  'AuthGuard',
);
// Output: [AuthGuard] E73882 tried to access the PurchaseOrder service with an expired key!

// Works with error() too
logger.error(
  'Error occurred for user {userId} in module {module}',
  { userId: '12345', module: 'Auth' },
);
```

### Message Truncation

Limit log message size — useful for production environments to prevent oversized log entries:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new BunyanLoggerService({
    projectId: 'my-app',
    formatterOptions: { outputMode: 'short' },
    maxLength: 200, // Truncate messages longer than 200 characters
  }),
});
```

### Custom Streams (Elasticsearch)

```typescript
import { BunyanLoggerService } from '@nest-toolbox/bunyan-logger';
const Elasticsearch = require('bunyan-elasticsearch');

const esStream = new Elasticsearch({
  type: 'logs',
  host: 'localhost:9300',
});

const app = await NestFactory.create(AppModule, {
  logger: new BunyanLoggerService({
    projectId: 'my-app',
    formatterOptions: { outputMode: 'long' },
    customStreams: [
      { stream: esStream },
      { path: '/var/log/my-app.log' }, // Also write to file
    ],
  }),
});
```

### Extra Fields

Attach metadata to every log entry — handy for filtering in centralized logging:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new BunyanLoggerService({
    projectId: 'my-app',
    formatterOptions: { outputMode: 'json' },
    extraFields: {
      environment: 'production',
      microservice: 'users-service',
      region: 'eu-west-1',
    },
  }),
});
```

### Disabling Colors

For CI/CD pipelines or log aggregators that don't support ANSI codes:

```typescript
const app = await NestFactory.create(AppModule, {
  logger: new BunyanLoggerService({
    projectId: 'my-app',
    formatterOptions: {
      outputMode: 'short',
      color: false,
    },
  }),
});
```

### Error Logging with Stack Traces

```typescript
try {
  await someOperation();
} catch (error) {
  logger.error('Operation failed', error.stack, 'MyService');
  // Bunyan will log with { context: 'MyService', trace: '<stack trace>' }
}
```
