import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import * as colors from 'colors';
export class BunyanLoggerService implements LoggerService {
    private readonly bunyanLogger: Bunyan;
    private isEmpty = (obj) => [Object, Array].includes((obj || {}).constructor) && !Object.entries(obj || {}).length;

    /**
     * Creates an instance of BunyanLoggerService.
     * @param {({
     *     projectId: string;
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
        projectId: string;
        formatterOptions: {
            [key: string]: any;
        };
        customStreams?: Bunyan.Stream[];
    }) {
        const { projectId, formatterOptions, customStreams } = options;
        if (projectId == null || this.isEmpty(projectId)) {
            throw new Error(`projectId is required`);
        }
        const defaultStream: Bunyan.Stream = { level: 'info', type: 'stream', stream: bunyanFormat(formatterOptions) };
        const streams: Bunyan.Stream[] = [defaultStream, ...(customStreams || [])];

        this.bunyanLogger = Bunyan.createLogger({
            level: Bunyan.INFO,
            name: projectId,
            streams: [...streams],
        });
    }

    public log(message: any | any[], context?: string | undefined) {
        message = Array.isArray(message) ? message : [message];
        this.bunyanLogger.info({ context }, ...message);
    }

    public error(message: any | any[], trace?: string | undefined, context?: string | undefined) {
        message = Array.isArray(message) ? message : [message];
        this.bunyanLogger.error({ context, trace },...message.map(msg => colors.red(msg)));
    }

    public warn(message: any | any[], context?: string | undefined) {
        message = Array.isArray(message) ? message : [message];
        this.bunyanLogger.warn({ context },...message.map(msg => colors.yellow(msg)));
    }
}
