# @nest-toolbox/typeorm-audit-log - Design Document

**Author:** Kratos 🐺  
**Created:** 2026-02-03  
**Status:** Draft  
**Branch:** `feature/typeorm-audit-log`

---

## Executive Summary

A TypeORM-based audit logging package for NestJS that automatically tracks entity changes with user attribution, diff calculation, and queryable audit trails. Designed for compliance (SOC2, HIPAA, GDPR) and debugging.

---

## Problem Statement

### Pain Points
1. **Compliance requirements** - SOC2, HIPAA, GDPR require audit trails
2. **No NestJS-native solution** - Existing `nestjs-auditlog` is API-level only, not entity-level
3. **Manual implementation** - Everyone builds their own, fragmented approaches
4. **Missing user attribution** - Hard to track WHO made changes automatically
5. **No diff storage** - Hard to see WHAT changed

### Target Users
- Enterprise NestJS applications
- SaaS products with compliance requirements
- Any app needing change history/accountability

---

## Competitive Analysis

| Feature | nestjs-auditlog | Our Solution |
|---------|-----------------|--------------|
| API-level logging | ✅ Decorator-based | ✅ Support |
| Entity-level auto-tracking | ❌ Manual dataDiff | ✅ Automatic via TypeORM subscribers |
| Change diff storage | ✅ With callback | ✅ Automatic |
| User attribution | ✅ Manual | ✅ Auto from AsyncLocalStorage |
| Multiple exporters | ✅ OTEL, ClickHouse | ✅ + Database, File, Webhook |
| TypeORM integration | ❌ | ✅ Native subscribers |
| Query audit trail | ❌ | ✅ AuditLogService |
| Field exclusions | ❌ | ✅ @AuditIgnore decorator |
| Sensitive field masking | ❌ | ✅ @AuditMask decorator |

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     NestJS Application                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌───────────────┐  │
│  │ @Auditable  │    │ AuditContext │    │ AuditLogModule│  │
│  │  Decorator  │    │ Middleware   │    │   forRoot()   │  │
│  └──────┬──────┘    └──────┬───────┘    └───────┬───────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              AuditLogSubscriber (TypeORM)             │  │
│  │  - afterInsert()  - afterUpdate()  - afterRemove()   │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│                              ▼                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   AuditLogService                     │  │
│  │  - log()  - findByEntity()  - findByUser()           │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                              │                              │
│         ┌────────────────────┼────────────────────┐        │
│         ▼                    ▼                    ▼        │
│  ┌────────────┐      ┌────────────┐      ┌────────────┐   │
│  │  Database  │      │    File    │      │  Webhook   │   │
│  │  Storage   │      │   Export   │      │   Export   │   │
│  └────────────┘      └────────────┘      └────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Components

#### 1. Decorators (`decorators.ts`)

```typescript
// Mark entity as auditable
@Auditable(options?: AuditableOptions)

// Exclude field from audit logs
@AuditIgnore()

// Mask field value in audit logs (e.g., "john@***")
@AuditMask(maskFn?: (value: any) => string)
```

#### 2. AuditLog Entity (`audit-log.entity.ts`)

```typescript
@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entityName: string;

  @Column()
  entityId: string;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction; // CREATE | UPDATE | DELETE

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true })
  userName: string;

  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  diff: AuditDiff[];

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ nullable: true })
  ip: string;

  @Column({ nullable: true })
  userAgent: string;

  @CreateDateColumn()
  timestamp: Date;
}

export interface AuditDiff {
  field: string;
  oldValue: any;
  newValue: any;
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}
```

#### 3. AuditContext (`audit-context.ts`)

Uses AsyncLocalStorage to capture request context (user, IP, etc.) across async boundaries.

```typescript
export interface AuditContextData {
  userId?: string;
  userName?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export class AuditContext {
  private static storage = new AsyncLocalStorage<AuditContextData>();

  static run<T>(data: AuditContextData, fn: () => T): T {
    return this.storage.run(data, fn);
  }

  static get(): AuditContextData | undefined {
    return this.storage.getStore();
  }

  static set(data: Partial<AuditContextData>): void {
    const current = this.get() || {};
    Object.assign(current, data);
  }
}
```

#### 4. AuditContextMiddleware (`audit-context.middleware.ts`)

NestJS middleware that initializes audit context from request.

```typescript
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const contextData: AuditContextData = {
      userId: req.user?.id,
      userName: req.user?.name || req.user?.email,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    AuditContext.run(contextData, () => next());
  }
}
```

#### 5. AuditLogSubscriber (`audit-log.subscriber.ts`)

TypeORM subscriber that captures entity changes.

```typescript
@EventSubscriber()
export class AuditLogSubscriber implements EntitySubscriberInterface {
  constructor(
    private dataSource: DataSource,
    private auditLogService: AuditLogService,
  ) {
    dataSource.subscribers.push(this);
  }

  listenTo() {
    return undefined; // Listen to all entities
  }

  afterInsert(event: InsertEvent<any>) {
    if (!this.isAuditable(event.entity)) return;
    this.auditLogService.log({
      action: AuditAction.CREATE,
      entity: event.entity,
      entityName: event.metadata.name,
    });
  }

  afterUpdate(event: UpdateEvent<any>) {
    if (!this.isAuditable(event.entity)) return;
    this.auditLogService.log({
      action: AuditAction.UPDATE,
      entity: event.entity,
      entityName: event.metadata.name,
      oldValues: event.databaseEntity,
    });
  }

  afterRemove(event: RemoveEvent<any>) {
    if (!this.isAuditable(event.entity)) return;
    this.auditLogService.log({
      action: AuditAction.DELETE,
      entity: event.entity,
      entityName: event.metadata.name,
    });
  }

  private isAuditable(entity: any): boolean {
    return Reflect.getMetadata(AUDITABLE_KEY, entity.constructor) === true;
  }
}
```

#### 6. AuditLogService (`audit-log.service.ts`)

Service for logging and querying audit entries.

```typescript
@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private repo: Repository<AuditLog>,
    private options: AuditLogModuleOptions,
  ) {}

  async log(params: LogParams): Promise<AuditLog> {
    const context = AuditContext.get();
    const diff = this.calculateDiff(params.oldValues, params.entity);
    
    const entry = this.repo.create({
      entityName: params.entityName,
      entityId: this.getEntityId(params.entity),
      action: params.action,
      userId: context?.userId,
      userName: context?.userName,
      oldValues: this.maskFields(params.oldValues, params.entityName),
      newValues: this.maskFields(params.entity, params.entityName),
      diff,
      ip: context?.ip,
      userAgent: context?.userAgent,
      metadata: context?.metadata,
    });

    return this.repo.save(entry);
  }

  async findByEntity(
    entityName: string,
    entityId: string,
    options?: FindOptions,
  ): Promise<AuditLog[]> {
    return this.repo.find({
      where: { entityName, entityId },
      order: { timestamp: 'DESC' },
      ...options,
    });
  }

  async findByUser(
    userId: string,
    options?: FindByUserOptions,
  ): Promise<AuditLog[]> {
    const query = this.repo.createQueryBuilder('audit')
      .where('audit.userId = :userId', { userId });

    if (options?.since) {
      query.andWhere('audit.timestamp >= :since', { since: options.since });
    }

    if (options?.entityName) {
      query.andWhere('audit.entityName = :entityName', { 
        entityName: options.entityName 
      });
    }

    return query.orderBy('audit.timestamp', 'DESC').getMany();
  }

  async findAll(options?: FindAllOptions): Promise<PaginatedResult<AuditLog>> {
    // Paginated query with filters
  }

  private calculateDiff(
    oldValues: any,
    newValues: any,
  ): AuditDiff[] {
    // Use deep-diff or similar library
  }

  private maskFields(
    values: any,
    entityName: string,
  ): Record<string, any> {
    // Apply @AuditMask and @AuditIgnore
  }
}
```

#### 7. AuditLogModule (`audit-log.module.ts`)

```typescript
@Module({})
export class AuditLogModule {
  static forRoot(options: AuditLogModuleOptions): DynamicModule {
    return {
      module: AuditLogModule,
      imports: [
        TypeOrmModule.forFeature([AuditLog]),
      ],
      providers: [
        {
          provide: AUDIT_LOG_OPTIONS,
          useValue: options,
        },
        AuditLogService,
        AuditLogSubscriber,
      ],
      exports: [AuditLogService],
      global: true,
    };
  }

  static forRootAsync(options: AuditLogModuleAsyncOptions): DynamicModule {
    // Async configuration support
  }
}

export interface AuditLogModuleOptions {
  // Storage
  storage?: 'database' | 'file' | 'webhook';
  tableName?: string;
  
  // Retention
  retentionDays?: number;
  
  // Global exclusions
  excludeFields?: string[];
  excludeEntities?: string[];
  
  // Export options
  webhookUrl?: string;
  filePath?: string;
  
  // Performance
  async?: boolean; // Don't block on audit writes
  batchSize?: number; // Batch writes for performance
}
```

---

## File Structure

```
packages/typeorm-audit-log/
├── LICENSE
├── README.md
├── DESIGN.md (this file)
├── package.json
├── tsconfig.build.json
└── src/
    ├── index.ts
    ├── types.ts
    ├── constants.ts
    ├── decorators.ts
    ├── audit-log.entity.ts
    ├── audit-context.ts
    ├── audit-context.middleware.ts
    ├── audit-log.subscriber.ts
    ├── audit-log.service.ts
    ├── audit-log.module.ts
    ├── utils/
    │   ├── diff.ts
    │   └── mask.ts
    └── test/
        ├── decorators.spec.ts
        ├── audit-context.spec.ts
        ├── audit-log.subscriber.spec.ts
        ├── audit-log.service.spec.ts
        └── integration.spec.ts
```

---

## API Usage Examples

### Basic Setup

```typescript
// app.module.ts
import { AuditLogModule } from '@nest-toolbox/typeorm-audit-log';

@Module({
  imports: [
    TypeOrmModule.forRoot({...}),
    AuditLogModule.forRoot({
      retentionDays: 90,
      excludeFields: ['password', 'token', 'refreshToken'],
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuditContextMiddleware)
      .forRoutes('*');
  }
}
```

### Entity Configuration

```typescript
import { Auditable, AuditIgnore, AuditMask } from '@nest-toolbox/typeorm-audit-log';

@Entity()
@Auditable()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  @AuditMask() // Stored as "j***@email.com"
  email: string;

  @Column()
  @AuditIgnore() // Never logged
  password: string;

  @Column()
  role: string;
}
```

### Querying Audit Trail

```typescript
@Injectable()
export class UserService {
  constructor(
    private auditLogService: AuditLogService,
  ) {}

  async getUserHistory(userId: number): Promise<AuditLog[]> {
    return this.auditLogService.findByEntity('User', userId.toString());
  }

  async getRecentChanges(since: Date): Promise<AuditLog[]> {
    return this.auditLogService.findAll({
      since,
      entityNames: ['User', 'Order'],
      limit: 100,
    });
  }

  async getAdminActivity(adminId: string): Promise<AuditLog[]> {
    return this.auditLogService.findByUser(adminId, {
      since: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24h
    });
  }
}
```

### Manual Context Setting

```typescript
// For non-HTTP contexts (queues, cron jobs, etc.)
import { AuditContext } from '@nest-toolbox/typeorm-audit-log';

@Injectable()
export class OrderProcessor {
  @Process('process-order')
  async processOrder(job: Job<OrderData>) {
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

---

## Implementation Phases

### Phase 1: Core (Week 1-2)
- [ ] **1.1** Create package structure (package.json, tsconfig, LICENSE)
- [ ] **1.2** Define types and constants
- [ ] **1.3** Implement `@Auditable()` decorator
- [ ] **1.4** Implement `AuditLog` entity
- [ ] **1.5** Implement `AuditContext` with AsyncLocalStorage
- [ ] **1.6** Implement `AuditContextMiddleware`
- [ ] **1.7** Implement `AuditLogSubscriber`
- [ ] **1.8** Implement `AuditLogService` (basic log + query)
- [ ] **1.9** Implement `AuditLogModule`
- [ ] **1.10** Write unit tests for all components
- [ ] **1.11** Write integration tests
- [ ] **1.12** Write README with examples

### Phase 2: Enhanced Features (Week 3)
- [ ] **2.1** Implement `@AuditIgnore()` decorator
- [ ] **2.2** Implement `@AuditMask()` decorator
- [ ] **2.3** Implement diff calculation with deep-diff
- [ ] **2.4** Implement global field exclusions
- [ ] **2.5** Implement async logging option
- [ ] **2.6** Add to show_case demo app
- [ ] **2.7** Add E2E tests in show_case

### Phase 3: Advanced Features (Week 4+)
- [ ] **3.1** File export option
- [ ] **3.2** Webhook export option
- [ ] **3.3** Retention policy (auto-cleanup old logs)
- [ ] **3.4** Batch writes for performance
- [ ] **3.5** Query API pagination
- [ ] **3.6** OpenTelemetry integration (optional)

---

## Testing Strategy

### Unit Tests
- Decorators correctly set metadata
- AuditContext stores and retrieves data
- Diff calculation handles all types (primitives, objects, arrays)
- Mask function correctly masks values
- Service correctly filters ignored/masked fields

### Integration Tests
- Full flow: entity change → subscriber → service → database
- User context propagation through middleware
- Query methods return correct results
- Multiple entity types work together

### E2E Tests (in show_case)
- REST API triggers audit logs
- Audit trail queryable via API
- Performance under load

---

## Performance Considerations

1. **Async writes** - Option to not block on audit log writes
2. **Batch inserts** - Collect multiple logs and insert in batch
3. **Indexes** - Ensure proper indexes on entityName, entityId, userId, timestamp
4. **Retention cleanup** - Background job to delete old logs
5. **Selective auditing** - Only audit what's needed, use @AuditIgnore liberally

---

## Security Considerations

1. **Sensitive data** - Use @AuditMask for PII, never log passwords
2. **Global exclusions** - Configure excludeFields for tokens, secrets
3. **Access control** - Audit logs should have restricted access
4. **Immutability** - Audit logs should never be editable
5. **Tamper evidence** - Consider adding checksums/signatures

---

## Dependencies

```json
{
  "dependencies": {
    "reflect-metadata": "^0.2.0",
    "typeorm": "^0.3.0",
    "deep-diff": "^1.0.2"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "typeorm": "^0.3.0"
  }
}
```

---

## Success Metrics

- [ ] 100% test coverage
- [ ] < 5ms overhead per audited operation
- [ ] Working show_case integration
- [ ] Complete README with all use cases
- [ ] Published to npm
- [ ] Listed on awesome-nestjs
- [ ] 50+ GitHub stars within first month

---

## Open Questions

1. Should we support custom audit log entity (user provides their own)?
2. Should we integrate with NestJS EventEmitter for audit events?
3. Should we provide a REST controller for querying audit logs?
4. Should we support multiple storage backends simultaneously?

---

## References

- [nestjs-auditlog](https://github.com/thanhlcm90/nestjs-auditlog) - Existing solution
- [TypeORM Subscribers](https://typeorm.io/listeners-and-subscribers) - Core mechanism
- [AsyncLocalStorage](https://nodejs.org/api/async_context.html) - Context propagation
- [deep-diff](https://www.npmjs.com/package/deep-diff) - Diff calculation

---

*Document created: 2026-02-03*  
*Last updated: 2026-02-03*  
*Next review: Before implementation start*
