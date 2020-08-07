import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import * as chalk from 'chalk';
import { isEmpty, isNil } from 'lodash';
export class BunyanLoggerService implements LoggerService {
  private readonly bunyanLogger: Bunyan;

  /**
   * Creates an instance of BunyanLoggerService.
   * @param {({
   *     projectName: string;
   *     formatterOptions: {
   *       outputMode: string; // short|long|simple|json|bunyan
   *       color?: boolean;
   *       levelInString?: boolean;
   *       colorFromLevel?: any;
   *     };
   *     customStreams?: any[];
   *   })} options
   * @memberof BunyanLoggerService
   */
  constructor(options: {
    projectName: string;
    formatterOptions: {
      outputMode: string;
      color?: boolean;
      levelInString?: boolean;
      colorFromLevel?: any;
    };
    customStreams?: any[];
  }) {
    const { projectName, formatterOptions, customStreams } = options;
    if (isNil(projectName) || isEmpty(projectName)) {
      throw new Error(`projectName is required`);
    }
    const formatOut = bunyanFormat(formatterOptions);
    const streams: Bunyan.Stream[] = [
      { level: 'info', type: 'stream', stream: formatOut },
      ...(customStreams || []),
    ];
    this.bunyanLogger = Bunyan.createLogger({
      level: Bunyan.INFO,
      name: projectName,
      streams: [...streams],
    });
  }

  public log(message: any, context?: string | undefined) {
    this.bunyanLogger.info({ context }, message);
  }

  public error(
    message: any,
    trace?: string | undefined,
    context?: string | undefined,
  ) {
    this.bunyanLogger.error({ context, trace }, chalk.red.bold(message));
  }

  public warn(message: any, context?: string | undefined) {
    this.bunyanLogger.warn({ context }, message);
  }
}
