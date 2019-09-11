import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class WinstonLoggerService implements LoggerService {
  private readonly winstonLogger: any;

  /**
   * Creates an instance of WinstonLoggerService.
   * @param {string} projectName
   * @param {*} [customFormatter]
   * @param {any[]} [transports]
   * @memberof WinstonLoggerService
   */
  constructor(projectName: string, customFormatter?: any, transports?: any[]) {
    const formatter = customFormatter
      ? customFormatter
      : this.getDefaultFormat();

    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
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
