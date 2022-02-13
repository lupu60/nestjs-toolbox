import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import * as chalk from 'chalk';
const isEmpty = (obj) => JSON.stringify(obj) === '{}';

@Injectable()
export class HttpLoggerMiddleware implements NestMiddleware {
  logger = new Logger('HTTP');
  log = (...args) => this.logger.log(chalk.magenta(...args));

  use(req: any, _res: any, next: () => void) {
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
