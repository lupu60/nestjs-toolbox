---
sidebar_label: "bootstrap-log"
---

# @nest-toolbox/bootstrap-log

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Fbootstrap-log.svg)](https://www.npmjs.com/package/@nest-toolbox/bootstrap-log)

A colorful, informative bootstrap log for NestJS applications — displays your app's name, version, environment, hostname, database, Swagger, health check, Redis, and Sentry status at startup.

## Installation

```bash
npm install @nest-toolbox/bootstrap-log
```

## Quick Start

```typescript
import { NestFactory } from '@nestjs/core';
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';
import { AppModule } from './app.module';
import * as packageJson from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = 3000;

  await app.listen(port, () => {
    BootstrapLog({
      config: {
        environment: 'development',
        hostname: `http://localhost:${port}`,
        package_json_body: packageJson,
      },
    });
  });
}
bootstrap();
```

Output:

```
[Bootstrap] 🎉 Bootstrapping my-app:1.0.0
[Bootstrap] 🚀 Server is using development environment
[Bootstrap] ✅ Server running on 👉 http://localhost:3000
```

## Features

- **At-a-glance startup info** — see app name, version, environment, and hostname immediately
- **Colorized output** — each line is color-coded (green, red, blue, magenta) for quick visual scanning
- **Conditional sections** — only logs database, Swagger, health check, Redis, and Sentry when configured
- **Uses NestJS Logger** — logs under the `Bootstrap` context, integrates with any custom `LoggerService`
- **Zero dependencies** (beyond NestJS and `colors`)

## API Reference

### `BootstrapLog`

```typescript
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';
```

#### Signature

```typescript
function BootstrapLog(options: { config: AppConfig }): void
```

#### `AppConfig`

| Property | Type | Required | Description |
|---|---|---|---|
| `environment` | `string` | ✅ | Current environment (e.g., `'development'`, `'production'`, `'staging'`). |
| `hostname` | `string` | ✅ | The full hostname/URL the server is running on (e.g., `'http://localhost:3000'`). |
| `package_json_body` | `{ name: string; version: string }` | ✅ | Object with `name` and `version` — typically your `package.json`. |
| `database_url` | `string` | ❌ | Database connection URL. Logged if provided. |
| `redis_url` | `string` | ❌ | Redis connection URL. Logged if provided. |
| `swagger` | `boolean` | ❌ | If `true`, logs the Swagger UI URL (`<hostname>/swagger/`). |
| `health_check` | `boolean` | ❌ | If `true`, logs the health check URL (`<hostname>/health`). |
| `sentry` | `boolean` | ❌ | If `true`, logs that Sentry is configured for the current environment. |

#### Output Lines

| Condition | Emoji | Output |
|---|---|---|
| Always | 🎉 | `Bootstrapping <name>:<version>` |
| Always | 🚀 | `Server is using <environment> environment` |
| Always | ✅ | `Server running on 👉 <hostname>` |
| `database_url` set | 💾 | `Database <database_url>` |
| `swagger` is `true` | 📄 | `Swagger 👉 <hostname>/swagger/` |
| `health_check` is `true` | 🩺 | `Check Health 👉 <hostname>/health` |
| `redis_url` set | 📮 | `Connected to <redis_url>` |
| `sentry` is `true` | 📶 | `Setting up Sentry for <environment> environment` |

## Examples

### Minimal Configuration

```typescript
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';

BootstrapLog({
  config: {
    environment: 'development',
    hostname: 'http://localhost:3000',
    package_json_body: { name: 'my-api', version: '1.0.0' },
  },
});
```

### Full Configuration

```typescript
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';
import * as packageJson from '../package.json';

await app.listen(3000, () => {
  BootstrapLog({
    config: {
      environment: process.env.NODE_ENV || 'development',
      hostname: process.env.HOSTNAME || 'http://localhost:3000',
      package_json_body: packageJson,
      database_url: process.env.DATABASE_URL,
      redis_url: process.env.REDIS_URL,
      swagger: true,
      health_check: true,
      sentry: !!process.env.SENTRY_DSN,
    },
  });
});
```

Output with all options enabled:

```
[Bootstrap] 🎉 Bootstrapping my-api:2.1.0
[Bootstrap] 🚀 Server is using production environment
[Bootstrap] ✅ Server running on 👉 https://api.example.com
[Bootstrap] 💾 Database postgres://db.example.com:5432/mydb
[Bootstrap] 📄 Swagger 👉 https://api.example.com/swagger/
[Bootstrap] 🩺 Check Health 👉 https://api.example.com/health
[Bootstrap] 📮 Connected to redis://redis.example.com:6379
[Bootstrap] 📶 Setting up Sentry for production environment
```

### Using with ConfigService

```typescript
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';
import { AppModule } from './app.module';
import * as packageJson from '../package.json';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 3000);
  const hostname = configService.get<string>('HOSTNAME', `http://localhost:${port}`);

  await app.listen(port, () => {
    BootstrapLog({
      config: {
        environment: configService.get('NODE_ENV', 'development'),
        hostname,
        package_json_body: packageJson,
        database_url: configService.get('DATABASE_URL'),
        redis_url: configService.get('REDIS_URL'),
        swagger: configService.get('SWAGGER_ENABLED') === 'true',
        health_check: true,
        sentry: !!configService.get('SENTRY_DSN'),
      },
    });
  });
}
bootstrap();
```
