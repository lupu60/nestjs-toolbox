import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { auditContextRun } from './audit-context';
import type { AuditContextData } from './types';

/**
 * Express request with optional user property.
 * Extend this interface if your user object has different properties.
 */
interface RequestWithUser extends Request {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    // biome-ignore lint/suspicious/noExplicitAny: user object can have additional properties
    [key: string]: any;
  };
}

/**
 * Type for custom context extractor function.
 * Allows customization of how audit context is extracted from requests.
 */
export type AuditContextExtractor = (req: RequestWithUser) => AuditContextData;

/**
 * Default context extractor.
 * Extracts userId, userName, IP, and userAgent from the request.
 */
export const defaultContextExtractor: AuditContextExtractor = (req: RequestWithUser): AuditContextData => ({
  userId: req.user?.id,
  userName: req.user?.name ?? req.user?.email,
  ip: req.ip ?? req.socket?.remoteAddress,
  userAgent: req.headers['user-agent'],
});

/**
 * NestJS middleware that initializes audit context from the HTTP request.
 * Automatically captures user information, IP address, and user agent
 * for all audit log entries created during the request lifecycle.
 *
 * @example
 * ```typescript
 * // app.module.ts
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(AuditContextMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 * ```
 *
 * @example
 * ```typescript
 * // With custom extractor
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     const middleware = new AuditContextMiddleware((req) => ({
 *       userId: req.user?.sub,
 *       userName: req.user?.preferred_username,
 *       ip: req.headers['x-forwarded-for'] as string || req.ip,
 *       userAgent: req.headers['user-agent'],
 *       metadata: { tenantId: req.headers['x-tenant-id'] },
 *     }));
 *     consumer.apply(middleware.use.bind(middleware)).forRoutes('*');
 *   }
 * }
 * ```
 */
@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  private extractor: AuditContextExtractor;

  constructor(extractor?: AuditContextExtractor) {
    this.extractor = extractor ?? defaultContextExtractor;
  }

  /**
   * Middleware handler that wraps the request in an audit context.
   */
  use(req: RequestWithUser, _res: Response, next: NextFunction): void {
    const contextData = this.extractor(req);
    auditContextRun(contextData, () => next());
  }
}

/**
 * Factory function to create a middleware with a custom extractor.
 * Useful when you need to inject dependencies into the extractor.
 *
 * @param extractor - Custom function to extract audit context from request
 * @returns A new middleware instance with the custom extractor
 */
export function createAuditContextMiddleware(extractor: AuditContextExtractor): AuditContextMiddleware {
  return new AuditContextMiddleware(extractor);
}
