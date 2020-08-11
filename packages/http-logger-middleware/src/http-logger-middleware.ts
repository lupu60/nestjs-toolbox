import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import * as chalk from 'chalk';
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
        this.log('request body: ', JSON.stringify(body));
        this.log('request query: ', JSON.stringify(query));
        this.log('request params: ', JSON.stringify(params));
        this.log('---------------------------------------------------------------------------------');
        next();
    }
}
