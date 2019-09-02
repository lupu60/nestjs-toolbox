import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import chalk from 'chalk';
import { LoggerFormatterOptions } from './LoggerFormatterOptions.interface';

export class BunyanLoggerService implements LoggerService {
  private readonly bunyanLogger: Bunyan;

  /**
   * Creates an instance of BunyanLoggerService.
   * @param {string} projectName
   * @param {LoggerFormatterOptions} formatterOptions
   * @param {any []} streams any supported Bunyan stream
   * @memberof BunyanLoggerService
   */
  constructor(projectName: string, formatterOptions: LoggerFormatterOptions, customStreams?: any []) {
    const formatOut = bunyanFormat(formatterOptions);
    const streams:Bunyan.Stream [] = [
      { level: 'info', type: 'stream', stream: formatOut },
      ...customStreams||[]
    ]
    this.bunyanLogger = Bunyan.createLogger({
      level: Bunyan.INFO,
      name: projectName,
      streams:[...streams],
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
