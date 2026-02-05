---
sidebar_label: "typeorm-audit-log"
---

# @nest-toolbox/typeorm-audit-log

[![npm version](https://badge.fury.io/js/%40nest-toolbox%2Ftypeorm-audit-log.svg)](https://www.npmjs.com/package/@nest-toolbox/typeorm-audit-log)

Automatic audit logging for TypeORM entities with user attribution, diff tracking, and queryable audit trails.

## Installation

```bash
npm install @nest-toolbox/typeorm-audit-log
```

**Peer dependencies:** `typeorm`, `@nestjs/typeorm`, `@nestjs/common`, `reflect-metadata`

## Quick Start

```typescript
// app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule, AuditContextMiddleware } from '@nest-toolbox/typeorm-audit-log';

@Module({
  imports: [
    TypeOrmModule.forRoot({ /* your database config */ }),
    AuditLogModule.forRoot({
      retentionDays: 90,
      excludeFields: ['password', 'refreshToken'],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditContextMiddleware).forRoutes('*');
  }
}
```

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

That's it — all INSERT, UPDATE, and DELETE operations on `User` are automatically logged with full user attribution and diffs.

## Features

- 🔄 **Automatic tracking** — Entity changes logged via TypeORM subscribers
- 👤 **User attribution** — Captures who made each change via `AsyncLocalStorage`
- 📊 **Diff calculation** — Shows exactly what changed between old and new values
- 🔍 **Queryable history** — Find audit logs by entity, user, or time range
- 🛡️ **Field exclusions** — Skip sensitive fields like passwords with `@AuditIgnore()`
- 🎭 **Field masking** — Partially mask sensitive values with `@AuditMask()`
- ⚡ **Async mode** — Non-blocking audit writes for performance
- 🎯 **Selective auditing** — Only track entities decorated with `@Auditable()`

## API Reference

### `AuditLogModule`

#### `AuditLogModule.forRoot(options?)`

Register the module globally with static configuration.

```typescript
AuditLogModule.forRoot({
  retentionDays: 90,
  excludeFields: ['password', 'token', 'secret'],
  excludeEntities: ['Session', 'Cache'],
  async: false,
});
```

| Option | Type | Default | Description |
|---|---|---|---|
| `storage` | `'database' \| 'file' \| 'webhook'` | `'database'` | Where to store audit logs |
| `tableName` | `string` | `'audit_logs'` | Custom table name for the audit log table |
| `retentionDays` | `number` | `0` | Days to keep logs (0 = forever) |
| `excludeFields` | `string[]` | `[]` | Fields to globally exclude from all audit logs |
| `excludeEntities` | `string[]` | `[]` | Entity names to skip entirely |
| `async` | `boolean` | `false` | Fire-and-forget writes (non-blocking) |
| `batchSize` | `number` | `1` | Batch size for bulk writes |
| `webhookUrl` | `string` | — | Webhook URL (when `storage: 'webhook'`) |
| `filePath` | `string` | — | File path (when `storage: 'file'`) |

#### `AuditLogModule.forRootAsync(options)`

Register with async factory injection.

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

### Decorators

#### `@Auditable(options?)`

Mark an entity class for automatic audit logging.

```typescript
@Entity()
@Auditable({
  entityName: 'UserAccount',        // Custom name in audit logs (default: class name)
  excludeFields: ['lastLoginAt'],    // Fields to exclude for this entity
})
export class User { /* ... */ }
```

| Option | Type | Default | Description |
|---|---|---|---|
| `entityName` | `string` | Class name | Custom entity name in audit logs |
| `excludeFields` | `string[]` | `[]` | Fields to exclude for this entity only |

#### `@AuditIgnore()`

Exclude a property from audit logs entirely. Use for sensitive data that should never appear in audit trails.

```typescript
@Entity()
@Auditable()
export class User {
  @Column()
  @AuditIgnore()
  password: string;

  @Column()
  @AuditIgnore()
  refreshToken: string;
}
```

#### `@AuditMask(options?)`

Partially mask a property value in audit logs (e.g., `"john@email.com"` → `"jo***l.com"`).

```typescript
@Entity()
@Auditable()
export class User {
  @Column()
  @AuditMask()
  email: string;

  @Column()
  @AuditMask({ maskFn: (v) => v ? '****' : null })
  ssn: string;
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `maskFn` | `(value: any) => string` | Built-in partial masker | Custom mask function |

The default mask function hides middle characters — e.g., `"john@email.com"` becomes `"jo***l.com"`.

### `AuditLogService`

Inject `AuditLogService` to query the audit trail or log manual entries.

#### `log(params: LogParams)`

Manually create an audit log entry.

```typescript
await auditLogService.log({
  action: AuditAction.UPDATE,
  entity: updatedUser,
  entityName: 'User',
  entityId: '123',
  oldValues: previousUser,
});
```

**`LogParams`:**

| Field | Type | Description |
|---|---|---|
| `action` | `AuditAction` | `CREATE`, `UPDATE`, or `DELETE` |
| `entity` | `any` | The current entity (new values) |
| `entityName` | `string` | Name of the entity |
| `entityId` | `string` | Primary key of the entity |
| `oldValues` | `any` | Previous entity values (for UPDATE/DELETE) |

#### `findByEntity(entityName, entityId, options?)`

Get audit history for a specific entity.

```typescript
const history = await auditLogService.findByEntity('User', '123', {
  since: new Date('2024-01-01'),
  action: AuditAction.UPDATE,
  limit: 20,
});
```

**`FindByEntityOptions`:**

| Option | Type | Description |
|---|---|---|
| `since` | `Date` | Only entries after this date |
| `until` | `Date` | Only entries before this date |
| `action` | `AuditAction` | Filter by action type |
| `limit` | `number` | Max number of results |

#### `findByUser(userId, options?)`

Get all changes made by a specific user.

```typescript
const activity = await auditLogService.findByUser('user-456', {
  since: new Date(Date.now() - 24 * 60 * 60 * 1000),
  entityName: 'Order',
});
```

**`FindByUserOptions`:**

| Option | Type | Description |
|---|---|---|
| `since` | `Date` | Only entries after this date |
| `until` | `Date` | Only entries before this date |
| `entityName` | `string` | Filter by entity type |
| `action` | `AuditAction` | Filter by action type |
| `limit` | `number` | Max number of results |

#### `findAll(options?)`

Paginated search across all audit logs.

```typescript
const result = await auditLogService.findAll({
  entityName: 'User',
  action: AuditAction.UPDATE,
  since: new Date('2024-01-01'),
  page: 1,
  limit: 50,
});

console.log(result.items);       // AuditLog[]
console.log(result.total);       // Total matching entries
console.log(result.totalPages);  // Total pages
```

**`FindAllOptions`:**

| Option | Type | Default | Description |
|---|---|---|---|
| `since` | `Date` | — | Only entries after this date |
| `until` | `Date` | — | Only entries before this date |
| `entityName` | `string` | — | Filter by entity type |
| `entityId` | `string` | — | Filter by entity ID |
| `userId` | `string` | — | Filter by user |
| `action` | `AuditAction` | — | Filter by action type |
| `page` | `number` | `1` | Page number |
| `limit` | `number` | `50` | Items per page |

**Returns `PaginatedResult<AuditLog>`:**

| Field | Type | Description |
|---|---|---|
| `items` | `AuditLog[]` | Audit log entries for the current page |
| `total` | `number` | Total matching entries |
| `page` | `number` | Current page |
| `limit` | `number` | Items per page |
| `totalPages` | `number` | Total number of pages |

### `AuditContextMiddleware`

NestJS middleware that captures user context from HTTP requests via `AsyncLocalStorage`.

```typescript
// Default: extracts user.id, user.name/email, req.ip, user-agent
consumer.apply(AuditContextMiddleware).forRoutes('*');
```

### `createAuditContextMiddleware(extractor)`

Factory function to create a middleware with custom context extraction.

```typescript
import { createAuditContextMiddleware } from '@nest-toolbox/typeorm-audit-log';

const customMiddleware = createAuditContextMiddleware((req) => ({
  userId: req.user?.sub,
  userName: req.user?.preferred_username,
  ip: req.headers['x-forwarded-for'] as string || req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { tenantId: req.headers['x-tenant-id'] },
}));

consumer.apply(customMiddleware.use.bind(customMiddleware)).forRoutes('*');
```

### `AuditContext`

Static class for manual context management — use in non-HTTP contexts like queues, cron jobs, or CLI scripts.

#### `AuditContext.run(data, fn)`

Run a function with the given audit context.

```typescript
await AuditContext.run(
  { userId: 'system', userName: 'Order Processor', metadata: { jobId: job.id } },
  async () => {
    await orderService.updateStatus(orderId, 'processed');
  },
);
```

#### `AuditContext.get()`

Get the current audit context (returns `undefined` outside a `run()` scope).

#### `AuditContext.set(data)`

Merge additional data into the current audit context.

**`AuditContextData`:**

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | User ID for attribution |
| `userName` | `string` | User name/email |
| `ip` | `string` | IP address |
| `userAgent` | `string` | Browser/client user agent |
| `metadata` | `Record<string, any>` | Custom metadata (tenant ID, etc.) |

### Audit Log Entry Structure

Each `AuditLog` entity stored in the database:

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Unique identifier |
| `entityName` | `string` | Name of the audited entity |
| `entityId` | `string` | Primary key of the entity |
| `action` | `AuditAction` | `CREATE`, `UPDATE`, or `DELETE` |
| `userId` | `string \| null` | ID of the user who made the change |
| `userName` | `string \| null` | Name/email of the user |
| `oldValues` | `JSON \| null` | Previous values (UPDATE/DELETE) |
| `newValues` | `JSON \| null` | New values (CREATE/UPDATE) |
| `diff` | `AuditDiff[] \| null` | Array of changed fields with old/new values |
| `metadata` | `JSON \| null` | Custom metadata from context |
| `ip` | `string \| null` | IP address of the request |
| `userAgent` | `string \| null` | User agent string |
| `timestamp` | `Date` | When the change occurred |

### Types

```typescript
enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

interface AuditDiff {
  field: string;
  oldValue: any;
  newValue: any;
}
```

## Examples

### Full entity with field-level control

```typescript
@Entity()
@Auditable({ entityName: 'UserAccount' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  @AuditMask()  // Logged as "jo***l.com"
  email: string;

  @Column()
  @AuditIgnore()  // Never logged
  password: string;

  @Column()
  role: string;
}
```

### Non-HTTP context (queue worker)

```typescript
@Injectable()
export class OrderProcessor {
  @Process('process-order')
  async processOrder(job: Job) {
    await AuditContext.run(
      { userId: 'system', userName: 'Order Processor', metadata: { jobId: job.id } },
      async () => {
        await this.orderService.updateStatus(job.data.orderId, 'processed');
      },
    );
  }
}
```

### Audit log REST endpoint

```typescript
@Controller('audit')
export class AuditController {
  constructor(private auditLogService: AuditLogService) {}

  @Get(':entityName/:entityId')
  async getEntityHistory(
    @Param('entityName') entityName: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityName, entityId);
  }

  @Get('user/:userId')
  async getUserActivity(@Param('userId') userId: string) {
    return this.auditLogService.findByUser(userId, {
      since: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    });
  }
}
```

### Database migration (manual)

If you need to create the table manually instead of relying on TypeORM `synchronize`:

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
CREATE INDEX idx_audit_entity_timestamp ON audit_logs(entity_name, timestamp);
```
