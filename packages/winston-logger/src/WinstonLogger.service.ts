import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';

export class WinstonLoggerService implements LoggerService {
  private readonly winstonLogger: any;

  constructor(projectName: string, transports?: any[]) {
    const colorizer = winston.format.colorize();
    this.winstonLogger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple(),
        winston.format.printf(msg =>
          colorizer.colorize(msg.level, `${msg.service} - ${msg.timestamp} - ${msg.level}: ${msg.message} ${msg.context||''} ${msg.trace||''}`)
        )
      ),
      defaultMeta: { service: projectName },
      transports: [new winston.transports.Console(), ...(transports || [])],
    });
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
