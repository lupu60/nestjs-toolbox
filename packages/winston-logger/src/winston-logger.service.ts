import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class WinstonLoggerService implements LoggerService {
  private readonly winstonLogger: winston.Logger;
  private isEmpty = (obj: unknown): boolean => {
    if (!obj || typeof obj !== 'object') {return false;}
    const constructorName = (obj as object).constructor?.name;
    return (constructorName === 'Object' || constructorName === 'Array') && !Object.entries(obj).length;
  };

  /**
   * Creates an instance of WinstonLoggerService.
   * @param {{ projectName: string, transports?: winston.transport[], timeFormatStr?: string, customFormatter?: winston.Logform.Format }} options
   * @memberof WinstonLoggerService
   */
  constructor(options: { projectName: string; transports?: winston.transport[]; timeFormatStr?: string; customFormatter?: winston.Logform.Format }) {
    const { projectName, transports, timeFormatStr, customFormatter } = options;
    if (projectName === null || projectName === undefined || (typeof projectName === 'string' && projectName.trim() === '') || this.isEmpty(projectName)) {
      throw new Error('projectName is required');
    }
    const timestamp = timeFormatStr ? winston.format.timestamp({ format: timeFormatStr }) : winston.format.timestamp();
    const formatter = customFormatter ? customFormatter : this.getDefaultFormat();

    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(timestamp, winston.format.simple(), formatter),
      defaultMeta: { service: projectName },
      transports: [new winston.transports.Console(), ...(transports || [])]
    });
  }

  private getDefaultFormat() {
    const colorizer = winston.format.colorize();
    return winston.format.printf(({ level, message, timestamp, context, trace }) => {
      return colorizer.colorize(level, `${timestamp} ${context || ''}: ${message} ${trace || ''}`);
    });
  }

  public log(message: unknown, context?: string | undefined): void {
    this.winstonLogger.log({
      level: 'info',
      message: String(message),
      context
    });
  }

  public error(message: unknown, trace?: string, context?: string): void {
    this.winstonLogger.log({
      level: 'error',
      message: String(message),
      trace,
      context
    });
  }

  public warn(message: unknown, context?: string): void {
    this.winstonLogger.log({
      level: 'warn',
      message: String(message),
      context
    });
  }
}
