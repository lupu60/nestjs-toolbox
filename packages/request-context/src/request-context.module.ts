/**
 * NestJS module for request-context.
 *
 * Registers the middleware globally for all routes.
 * Supports forRoot() with static options and forRootAsync() with factory injection.
 */

import { type DynamicModule, type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { REQUEST_CONTEXT_OPTIONS } from './constants';
import { RequestContextMiddleware } from './request-context.middleware';
import type { RequestContextAsyncOptions, RequestContextOptions } from './types';

@Module({})
export class RequestContextModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }

  /**
   * Register the module with static options.
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [RequestContextModule.forRoot()],
   * })
   * export class AppModule {}
   * ```
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     RequestContextModule.forRoot({
   *       requestIdHeader: 'x-correlation-id',
   *       generateId: () => nanoid(),
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: RequestContextOptions = {}): DynamicModule {
    return {
      module: RequestContextModule,
      global: true,
      providers: [
        {
          provide: REQUEST_CONTEXT_OPTIONS,
          useValue: options,
        },
        RequestContextMiddleware,
      ],
      exports: [RequestContextMiddleware],
    };
  }

  /**
   * Register the module with async options (factory injection).
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     RequestContextModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (config: ConfigService) => ({
   *         requestIdHeader: config.get('CORRELATION_HEADER'),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRootAsync(options: RequestContextAsyncOptions): DynamicModule {
    return {
      module: RequestContextModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: REQUEST_CONTEXT_OPTIONS,
          useFactory: options.useFactory ?? (() => ({})),
          inject: options.inject ?? [],
        },
        RequestContextMiddleware,
      ],
      exports: [RequestContextMiddleware],
    };
  }
}
