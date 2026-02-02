import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import chalk from 'chalk';
import { Request, Response, NextFunction } from 'express';

const isEmpty = (obj: unknown): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  return JSON.stringify(obj) === '{}';
};

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');
  private readonly log = (...args: unknown[]): void => {
    this.logger.log(process.stdout.isTTY ? chalk.magenta : (x => x)(...args.map(String)));
  };

  use(req: Request, _res: Response, next: NextFunction): void {
    const { body, params, query } = req;
    const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    this.log('---------------------------------------------------------------------------------');
    this.log('request method:', req.method);
    this.log('request url: ', requestUrl);
    if (query && !isEmpty(query)) {
      this.log('request query: ', JSON.stringify(query));
    }
    if (params && !isEmpty(params)) {
      this.log('request params: ', JSON.stringify(params));
    }
    if (body && !isEmpty(body)) {
      this.log('request body: ', JSON.stringify(body));
    }
    this.log('---------------------------------------------------------------------------------');
    next();
  }
}
