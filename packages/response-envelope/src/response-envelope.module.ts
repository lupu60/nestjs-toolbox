/**
 * NestJS module for response-envelope.
 *
 * Registers the interceptor and exception filter globally.
 * Supports forRoot() with static options and forRootAsync() with factory injection.
 */

import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RESPONSE_ENVELOPE_OPTIONS } from './constants';
import { EnvelopeExceptionFilter } from './envelope-exception.filter';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';
import type { ResponseEnvelopeAsyncOptions, ResponseEnvelopeOptions } from './types';

@Module({})
export class ResponseEnvelopeModule {
  /**
   * Register the module with static options.
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     ResponseEnvelopeModule.forRoot({ defaultMessage: 'Success' }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRoot(options: ResponseEnvelopeOptions = {}): DynamicModule {
    return {
      module: ResponseEnvelopeModule,
      global: true,
      providers: [
        {
          provide: RESPONSE_ENVELOPE_OPTIONS,
          useValue: options,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseEnvelopeInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: EnvelopeExceptionFilter,
        },
      ],
    };
  }

  /**
   * Register the module with async options (factory, class, or existing provider).
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     ResponseEnvelopeModule.forRootAsync({
   *       imports: [ConfigModule],
   *       useFactory: (config: ConfigService) => ({
   *         defaultMessage: config.get('API_DEFAULT_MESSAGE'),
   *       }),
   *       inject: [ConfigService],
   *     }),
   *   ],
   * })
   * export class AppModule {}
   * ```
   */
  static forRootAsync(options: ResponseEnvelopeAsyncOptions): DynamicModule {
    return {
      module: ResponseEnvelopeModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: RESPONSE_ENVELOPE_OPTIONS,
          useFactory: options.useFactory ?? (() => ({})),
          inject: options.inject ?? [],
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseEnvelopeInterceptor,
        },
        {
          provide: APP_FILTER,
          useClass: EnvelopeExceptionFilter,
        },
      ],
    };
  }
}
