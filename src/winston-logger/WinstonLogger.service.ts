import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class WinstonLoggerService implements LoggerService {
  private readonly winstonLogger: any;

  /**
   * Creates an instance of WinstonLoggerService.
   * @param {string} projectName
   * @param {any[]} [transports]
   * @param {string} [timeFormatStr]
   * @param {*} [customFormatter]
   * @memberof WinstonLoggerService
   */
  constructor(projectName: string,transports?: any[], timeFormatStr?: string, customFormatter?: any) {
    const timestamp = timeFormatStr
      ? winston.format.timestamp({ format: timeFormatStr })
      : winston.format.timestamp();
    const formatter = customFormatter
      ? customFormatter
      : this.getDefaultFormat();

    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        timestamp,
        winston.format.simple(),
        formatter,
      ),
      defaultMeta: { service: projectName },
      transports: [new winston.transports.Console(), ...(transports || [])],
    });
  }

  private getDefaultFormat() {
    const colorizer = winston.format.colorize();
    return winston.format.printf(
      ({ level, message, timestamp, context, trace }) => {
        return colorizer.colorize(
          level,
          `${timestamp} ${context || ''}: ${message} ${trace || ''}`,
        );
      },
    );
  }

  public log(message: any, context?: string | undefined) {
    this.winstonLogger.log({
      level: 'info',
      message,
      context,
    });
  }
  public error(message: any, trace?: string, context?: string) {
    this.winstonLogger.log({
      level: 'error',
      message,
      trace,
      context,
    });
  }
  public warn(message: any, context?: string) {
    this.winstonLogger.log({
      level: 'warn',
      message,
      context,
    });
  }
}
