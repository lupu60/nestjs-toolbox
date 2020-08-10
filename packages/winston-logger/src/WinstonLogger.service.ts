import { LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { isEmpty, isNil } from 'lodash';

export class WinstonLoggerService implements LoggerService {
    private readonly winstonLogger: any;

    /**
     * Creates an instance of WinstonLoggerService.
     * @param {{ projectName: string, transports?: any[], timeFormatStr?: string, customFormatter?: any }} options
     * @memberof WinstonLoggerService
     */
    constructor(options: { projectName: string; transports?: any[]; timeFormatStr?: string; customFormatter?: any }) {
        const { projectName, transports, timeFormatStr, customFormatter } = options;
        if (isNil(projectName) || isEmpty(projectName)) {
            throw new Error(`projectName is required`);
        }
        const timestamp = timeFormatStr ? winston.format.timestamp({ format: timeFormatStr }) : winston.format.timestamp();
        const formatter = customFormatter ? customFormatter : this.getDefaultFormat();

        this.winstonLogger = winston.createLogger({
            level: 'info',
            format: winston.format.combine(timestamp, winston.format.simple(), formatter),
            defaultMeta: { service: projectName },
            transports: [new winston.transports.Console(), ...(transports || [])],
        });
    }

    private getDefaultFormat() {
        const colorizer = winston.format.colorize();
        return winston.format.printf(({ level, message, timestamp, context, trace }) => {
            return colorizer.colorize(level, `${timestamp} ${context || ''}: ${message} ${trace || ''}`);
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
