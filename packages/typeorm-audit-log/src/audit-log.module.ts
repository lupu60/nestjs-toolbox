import { type DynamicModule, Module, type OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditLogService } from './audit-log.service';
import { AuditLogSubscriber } from './audit-log.subscriber';
import { AUDIT_LOG_OPTIONS } from './constants';
import type { AuditLogModuleAsyncOptions, AuditLogModuleOptions } from './types';

/**
 * Default module options.
 */
const DEFAULT_OPTIONS: AuditLogModuleOptions = {
  storage: 'database',
  retentionDays: 0,
  excludeFields: [],
  excludeEntities: [],
  async: false,
  batchSize: 1,
};

/**
 * AuditLogModule provides automatic audit logging for TypeORM entities.
 *
 * @example Basic usage
 * ```typescript
 * @Module({
 *   imports: [
 *     TypeOrmModule.forRoot({...}),
 *     AuditLogModule.forRoot({
 *       retentionDays: 90,
 *       excludeFields: ['password', 'token'],
 *     }),
 *   ],
 * })
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer.apply(AuditContextMiddleware).forRoutes('*');
 *   }
 * }
 * ```
 *
 * @example Async configuration
 * ```typescript
 * AuditLogModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (config: ConfigService) => ({
 *     retentionDays: config.get('AUDIT_RETENTION_DAYS'),
 *     async: config.get('AUDIT_ASYNC') === 'true',
 *   }),
 *   inject: [ConfigService],
 * })
 * ```
 */
@Module({})
export class AuditLogModule implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    private readonly subscriber: AuditLogSubscriber,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Initialize the module: register subscriber with DataSource and inject service.
   */
  onModuleInit(): void {
    // Register the subscriber with TypeORM DataSource
    this.subscriber.registerWithDataSource(this.dataSource);
    // Inject the service into the subscriber
    this.subscriber.setAuditLogService(this.auditLogService);
  }

  /**
   * Configure the module with static options.
   */
  static forRoot(options: AuditLogModuleOptions = {}): DynamicModule {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

    return {
      module: AuditLogModule,
      imports: [TypeOrmModule.forFeature([AuditLog])],
      providers: [
        {
          provide: AUDIT_LOG_OPTIONS,
          useValue: mergedOptions,
        },
        AuditLogService,
        AuditLogSubscriber,
      ],
      exports: [AuditLogService, AuditLogSubscriber],
      global: true,
    };
  }

  /**
   * Configure the module with async options (factory, useClass, useExisting).
   */
  static forRootAsync(options: AuditLogModuleAsyncOptions): DynamicModule {
    return {
      module: AuditLogModule,
      imports: [...(options.imports ?? []), TypeOrmModule.forFeature([AuditLog])],
      providers: [
        {
          provide: AUDIT_LOG_OPTIONS,
          useFactory: async (...args: unknown[]) => {
            const config = options.useFactory ? await options.useFactory(...args) : {};
            return { ...DEFAULT_OPTIONS, ...config };
          },
          inject: options.inject ?? [],
        },
        AuditLogService,
        AuditLogSubscriber,
      ],
      exports: [AuditLogService, AuditLogSubscriber],
      global: true,
    };
  }
}
