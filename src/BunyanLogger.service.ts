import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import chalk from 'chalk';

export class BunyanLoggerService implements LoggerService {
  private readonly bunyanLogger: Bunyan;

  /**
   *    Creates an instance of BunyanLoggerService.
   * @param {*} formatterOptions { outputMode: 'short' }
   * @param {string} [projectName]
   * @memberof BunyanLoggerService
   */
  constructor(formatterOptions: any, projectName?: string, streams?: any []) {
    const formatOut = bunyanFormat(formatterOptions);
    this.bunyanLogger = Bunyan.createLogger({
      level: Bunyan.INFO,
      name: projectName,
      streams: [
        { level: 'info', type: 'stream', stream: formatOut },
        ...streams
      ]
    });
  }

  public log(message: any, context?: string | undefined) {
    this.bunyanLogger.info({ context }, message);
  }
  public error(
    message: any,
    trace?: string | undefined,
    context?: string | undefined
  ) {
    this.bunyanLogger.error({ context, trace }, chalk.red.bold(message));
  }
  public warn(message: any, context?: string | undefined) {
    this.bunyanLogger.warn({ context }, message);
  }
}
