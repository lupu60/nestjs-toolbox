import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import * as colors from 'colors';

export interface FormatterOptions {
  outputMode: string; // short|long|simple|json|bunyan
  color?: boolean;
  levelInString?: boolean;
  colorFromLevel?: any;
  src?: boolean;
}

export class BunyanLoggerService implements LoggerService {
  private readonly bunyanLogger: Bunyan;
  private isEmpty = (obj) => [Object, Array].includes((obj || {}).constructor) && !Object.entries(obj || {}).length;

  /**
   * Creates an instance of BunyanLoggerService.
   * @param {{
   *     projectId: string;
   *     formatterOptions: FormatterOptions;
   *     customStreams?: Bunyan.Stream[];
   *     extraFields?: {
   *       [key: string]: string;
   *     };
   *   }} options
   * @memberof BunyanLoggerService
   */
  constructor(options: {
    projectId: string;
    formatterOptions: FormatterOptions;
    customStreams?: Bunyan.Stream[];
    extraFields?: {
      [key: string]: string;
    };
  }) {
    const { projectId, formatterOptions, customStreams, extraFields } = options;
    if (projectId == null || this.isEmpty(projectId)) {
      throw new Error(`projectId is required`);
    }
    const defaultStream: Bunyan.Stream = { level: 'info', type: 'stream', stream: bunyanFormat(formatterOptions) };
    const streams: Bunyan.Stream[] = [defaultStream, ...(customStreams || [])];

    this.bunyanLogger = Bunyan.createLogger({
      level: Bunyan.INFO,
      name: projectId,
      streams: [...streams],
      ...extraFields,
    });
  }

  /**
   * Interpolates string placeholders with values from an object
   * @param message - String message with placeholders like {key}
   * @param params - Object with values to replace placeholders
   * @returns Interpolated string
   */
  private interpolateString(message: string, params: Record<string, any>): string {
    if (!params || typeof params !== 'object') {
      return message;
    }
    return message.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Processes message and optional params to extract context and perform string interpolation
   * @param message - The log message (can be any type or array for backward compatibility)
   * @param optionalParams - Additional parameters (may include interpolation object and/or context)
   * @returns Object with processed message and context
   */
  private processMessage(message: any, ...optionalParams: any[]): { processedMessage: any; context?: string } {
    // Handle backward compatibility: if message is an array, treat it as before
    if (Array.isArray(message)) {
      const lastParam = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const context = typeof lastParam === 'string' ? lastParam : undefined;
      return { processedMessage: message, context };
    }

    let processedMessage = message;
    let context: string | undefined;

    // Extract context (last string parameter)
    if (optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (typeof lastParam === 'string') {
        context = lastParam;
        optionalParams = optionalParams.slice(0, -1);
      }
    }

    // Handle string interpolation if message is a string and we have an object parameter
    if (typeof processedMessage === 'string' && optionalParams.length > 0) {
      const interpolationObject = optionalParams.find(
        (param) => param && typeof param === 'object' && !Array.isArray(param) && !(param instanceof Error),
      );
      if (interpolationObject) {
        processedMessage = this.interpolateString(processedMessage, interpolationObject);
      }
    }

    return { processedMessage, context };
  }

  public log(message: any, ...optionalParams: any[]): void {
    const { processedMessage, context } = this.processMessage(message, ...optionalParams);
    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    this.bunyanLogger.info({ context }, ...messages);
  }

  public error(message: any, ...optionalParams: any[]): void {
    // Handle backward compatibility: if message is an array, treat it as before
    if (Array.isArray(message)) {
      let trace: string | undefined;
      let context: string | undefined;

      if (optionalParams.length >= 1 && typeof optionalParams[0] === 'string') {
        trace = optionalParams[0];
        context = optionalParams[1] as string | undefined;
      } else if (optionalParams.length > 0 && typeof optionalParams[optionalParams.length - 1] === 'string') {
        context = optionalParams[optionalParams.length - 1];
      }

      this.bunyanLogger.error({ context, trace }, ...message.map((msg) => colors.red(msg)));
      return;
    }

    let trace: string | undefined;
    let context: string | undefined;
    let processedMessage = message;

    // Handle error signature: error(message, stack?, context?)
    if (optionalParams.length >= 1 && typeof optionalParams[0] === 'string') {
      // Check if it's a stack trace (contains 'at' pattern)
      if (/^\s+at\s/.test(optionalParams[0]) || optionalParams[0].includes('\n')) {
        trace = optionalParams[0];
        context = optionalParams[1] as string | undefined;
      } else {
        // Might be context
        context = optionalParams[0];
      }
    } else {
      // Extract context from last string parameter
      if (optionalParams.length > 0) {
        const lastParam = optionalParams[optionalParams.length - 1];
        if (typeof lastParam === 'string' && !trace) {
          context = lastParam;
        }
      }
    }

    // Handle string interpolation
    if (typeof processedMessage === 'string') {
      const interpolationObject = optionalParams.find(
        (param) => param && typeof param === 'object' && !Array.isArray(param) && !(param instanceof Error) && param !== trace && param !== context,
      );
      if (interpolationObject) {
        processedMessage = this.interpolateString(processedMessage, interpolationObject);
      }
    }

    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    this.bunyanLogger.error({ context, trace }, ...messages.map((msg) => colors.red(msg)));
  }

  public warn(message: any, ...optionalParams: any[]): void {
    // Handle backward compatibility: if message is an array, treat it as before
    if (Array.isArray(message)) {
      const lastParam = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const context = typeof lastParam === 'string' ? lastParam : undefined;
      this.bunyanLogger.warn({ context }, ...message.map((msg) => colors.yellow(msg)));
      return;
    }

    const { processedMessage, context } = this.processMessage(message, ...optionalParams);
    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    this.bunyanLogger.warn({ context }, ...messages.map((msg) => (typeof msg === 'string' ? colors.yellow(msg) : msg)));
  }
}
