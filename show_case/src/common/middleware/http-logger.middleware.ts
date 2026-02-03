import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { HttpLoggerMiddleware as ToolboxHttpLogger } from '@nest-toolbox/http-logger-middleware';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly httpLogger: ToolboxHttpLogger;

  constructor() {
    this.httpLogger = new ToolboxHttpLogger({
      enabled: true,
      logRequestBody: process.env.NODE_ENV === 'development',
      logResponseBody: process.env.NODE_ENV === 'development',
      excludePaths: ['/health', '/health/version'],
    });
  }

  use(req: Request, res: Response, next: NextFunction) {
    this.httpLogger.use(req, res, next);
  }
}
