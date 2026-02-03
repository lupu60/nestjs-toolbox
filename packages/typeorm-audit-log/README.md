# @nest-toolbox/typeorm-audit-log

Automatic audit logging for TypeORM entities with user attribution, diff tracking, and queryable audit trails.

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Ftypeorm-audit-log.svg)](https://www.npmjs.com/package/@nest-toolbox/typeorm-audit-log)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔄 **Automatic tracking** - Entity changes logged via TypeORM subscribers
- 👤 **User attribution** - Captures who made each change via AsyncLocalStorage
- 📊 **Diff calculation** - Shows exactly what changed between old and new values
- 🔍 **Queryable history** - Find audit logs by entity, user, or time range
- 🛡️ **Field exclusions** - Skip sensitive fields like passwords
- ⚡ **Async mode** - Non-blocking audit writes for performance
- 🎯 **Selective auditing** - Only track entities you care about

## Installation

```bash
npm install @nest-toolbox/typeorm-audit-log
```

## Quick Start

### 1. Import the module

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule, AuditContextMiddleware } from '@nest-toolbox/typeorm-audit-log';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      // ... your database config
    }),
    AuditLogModule.forRoot({
      retentionDays: 90,
      excludeFields: ['password', 'refreshToken'],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Required: captures user context for audit logs
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
```

### 2. Mark entities as auditable

```typescript
// user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Auditable } from '@nest-toolbox/typeorm-audit-log';

@Entity()
@Auditable()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  role: string;
}
```

That's it! All INSERT, UPDATE, and DELETE operations on `User` will be automatically logged.

## Configuration

### Module Options

```typescript
AuditLogModule.forRoot({
  // Days to keep audit logs (0 = forever)
  retentionDays: 90,

  // Fields to exclude from all audit logs
  excludeFields: ['password', 'token', 'secret'],

  // Entity names to exclude from auditing
  excludeEntities: ['Session', 'Cache'],

  // Don't block on audit writes (fire-and-forget)
  async: false,
});
```

### Async Configuration

```typescript
AuditLogModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    retentionDays: config.get('AUDIT_RETENTION_DAYS'),
    async: config.get('AUDIT_ASYNC') === 'true',
    excludeFields: config.get('AUDIT_EXCLUDE_FIELDS')?.split(',') || [],
  }),
  inject: [ConfigService],
});
```

### Entity Options

```typescript
@Entity()
@Auditable({
  // Custom name in audit logs (default: class name)
  entityName: 'UserAccount',

  // Fields to exclude for this entity only
  excludeFields: ['lastLoginAt', 'sessionData'],
})
export class User {
  // ...
}
```

## Querying Audit Logs

Inject `AuditLogService` to query the audit trail:

```typescript
import { Injectable } from '@nestjs/common';
import { AuditLogService } from '@nest-toolbox/typeorm-audit-log';

@Injectable()
export class AuditService {
  constructor(private auditLogService: AuditLogService) {}

  // Get history for a specific entity
  async getEntityHistory(entityName: string, entityId: string) {
    return this.auditLogService.findByEntity(entityName, entityId);
  }

  // Get all changes by a user
  async getUserActivity(userId: string) {
    return this.auditLogService.findByUser(userId, {
      since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    });
  }

  // Search all audit logs with filters
  async searchAuditLogs() {
    return this.auditLogService.findAll({
      entityName: 'User',
      action: 'UPDATE',
      since: new Date('2024-01-01'),
      page: 1,
      limit: 50,
    });
  }
}
```

## Manual Context Setting

For non-HTTP contexts (queues, cron jobs, CLI), set the audit context manually:

```typescript
import { AuditContext } from '@nest-toolbox/typeorm-audit-log';

@Injectable()
export class OrderProcessor {
  @Process('process-order')
  async processOrder(job: Job) {
    await AuditContext.run(
      {
        userId: 'system',
        userName: 'Order Processor',
        metadata: { jobId: job.id },
      },
      async () => {
        // All entity changes here will be attributed to "system"
        await this.orderService.updateStatus(job.data.orderId, 'processed');
      },
    );
  }
}
```

## Custom Context Extraction

Customize how user info is extracted from requests:

```typescript
import { AuditContextMiddleware, createAuditContextMiddleware } from '@nest-toolbox/typeorm-audit-log';

// Custom extractor for JWT claims
const customMiddleware = createAuditContextMiddleware((req) => ({
  userId: req.user?.sub,
  userName: req.user?.preferred_username,
  ip: req.headers['x-forwarded-for'] as string || req.ip,
  userAgent: req.headers['user-agent'],
  metadata: {
    tenantId: req.headers['x-tenant-id'],
  },
}));

// In your module
consumer.apply(customMiddleware.use.bind(customMiddleware)).forRoutes('*');
```

## Audit Log Entry Structure

Each audit log entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Unique identifier |
| `entityName` | string | Name of the entity |
| `entityId` | string | Primary key of the entity |
| `action` | enum | CREATE, UPDATE, or DELETE |
| `userId` | string | ID of the user who made the change |
| `userName` | string | Name/email of the user |
| `oldValues` | JSON | Previous values (UPDATE/DELETE) |
| `newValues` | JSON | New values (CREATE/UPDATE) |
| `diff` | JSON | Array of changed fields |
| `ip` | string | IP address of the request |
| `userAgent` | string | Browser/client user agent |
| `metadata` | JSON | Custom metadata |
| `timestamp` | Date | When the change occurred |

## Database Migration

The module will create an `audit_logs` table. If you need to create it manually:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name VARCHAR(255) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(10) NOT NULL,
  user_id VARCHAR(255),
  user_name VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  diff JSONB,
  metadata JSONB,
  ip VARCHAR(45),
  user_agent VARCHAR(500),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
```

## API Reference

### Decorators

- `@Auditable(options?)` - Mark an entity for audit logging
- `@AuditIgnore()` - Exclude a field from audit logs (Phase 2)
- `@AuditMask()` - Mask a field value in audit logs (Phase 2)

### Services

- `AuditLogService.log(params)` - Manually log an audit entry
- `AuditLogService.findByEntity(name, id, options?)` - Query by entity
- `AuditLogService.findByUser(userId, options?)` - Query by user
- `AuditLogService.findAll(options?)` - Paginated search

### Context

- `AuditContext.run(data, fn)` - Run code with audit context
- `AuditContext.get()` - Get current audit context
- `AuditContext.set(data)` - Update current audit context

## License

MIT © [Bogdan Lupu](https://github.com/lupu60)
