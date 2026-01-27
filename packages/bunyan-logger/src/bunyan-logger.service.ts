import { LoggerService } from '@nestjs/common';
import * as Bunyan from 'bunyan';
import * as bunyanFormat from 'bunyan-format';
import * as colors from 'colors';

export interface FormatterOptions {
  outputMode: 'short' | 'long' | 'simple' | 'json' | 'bunyan' | 'inspect';
  color?: boolean;
  levelInString?: boolean;
  colorFromLevel?: Record<string, string>;
  src?: boolean;
}

export class BunyanLoggerService implements LoggerService {
  private readonly bunyanLogger: Bunyan;
  private readonly formatterOptions: FormatterOptions;
  private readonly maxLength?: number;
  private isEmpty = (obj: unknown): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    const constructorName = (obj as object).constructor?.name;
    return (constructorName === 'Object' || constructorName === 'Array') && !Object.entries(obj).length;
  };

  /**
   * Creates an instance of BunyanLoggerService.
   * @param {{
   *     projectId: string;
   *     formatterOptions: FormatterOptions;
   *     customStreams?: Bunyan.Stream[];
   *     extraFields?: {
   *       [key: string]: string;
   *     };
   *     maxLength?: number;
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
    maxLength?: number;
  }) {
    const { projectId, formatterOptions, customStreams, extraFields, maxLength } = options;
    if (projectId == null || this.isEmpty(projectId)) {
      throw new Error(`projectId is required`);
    }
    this.formatterOptions = formatterOptions;
    this.maxLength = maxLength;
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
   * Truncates a string message if it exceeds maxLength
   * @param message - The message to truncate
   * @returns Truncated message if maxLength is set and message exceeds it
   */
  private truncateMessage(message: unknown): unknown {
    if (this.maxLength != null && typeof message === 'string' && message.length > this.maxLength) {
      return message.slice(0, this.maxLength);
    }
    return message;
  }

  /**
   * Applies color to a message if colors are enabled
   * @param message - The message to colorize
   * @param colorFn - The color function to apply (e.g., colors.red, colors.yellow)
   * @returns Colored or plain message based on formatterOptions.color
   */
  private applyColor(message: unknown, colorFn: (msg: string) => string): unknown {
    // Check if colors are disabled
    if (this.formatterOptions.color === false) {
      return message;
    }
    // Apply color only to strings
    if (typeof message === 'string') {
      return colorFn(message);
    }
    return message;
  }

  /**
   * Interpolates string placeholders with values from an object
   * @param message - String message with placeholders like {key}
   * @param params - Object with values to replace placeholders
   * @returns Interpolated string
   */
  private interpolateString(message: string, params: Record<string, unknown>): string {
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
  private processMessage(message: unknown, ...optionalParams: unknown[]): { processedMessage: unknown; context?: string } {
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
        (param): param is Record<string, unknown> => param !== null && typeof param === 'object' && !Array.isArray(param) && !(param instanceof Error),
      );
      if (interpolationObject) {
        processedMessage = this.interpolateString(processedMessage, interpolationObject);
      }
    }

    return { processedMessage, context };
  }

  public log(message: unknown, ...optionalParams: unknown[]): void {
    const { processedMessage, context } = this.processMessage(message, ...optionalParams);
    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    const truncatedMessages = messages.map((msg) => this.truncateMessage(msg));
    this.bunyanLogger.info({ context }, ...truncatedMessages);
  }

  public error(message: unknown, ...optionalParams: unknown[]): void {
    // Handle backward compatibility: if message is an array, treat it as before
    if (Array.isArray(message)) {
      let trace: string | undefined;
      let context: string | undefined;

      if (optionalParams.length >= 1 && typeof optionalParams[0] === 'string') {
        trace = optionalParams[0];
        const secondParam = optionalParams[1];
        context = typeof secondParam === 'string' ? secondParam : undefined;
      } else if (optionalParams.length > 0) {
        const lastParam = optionalParams[optionalParams.length - 1];
        if (typeof lastParam === 'string') {
          context = lastParam;
        }
      }

      this.bunyanLogger.error({ context, trace }, ...message.map((msg) => this.applyColor(this.truncateMessage(msg), colors.red)));
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
        const firstParam = optionalParams[0];
        if (typeof firstParam === 'string') {
          context = firstParam;
        }
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
      // Filter out trace and context (strings) before finding interpolation object
      const nonStringParams = optionalParams.filter(
        (param) => param !== trace && param !== context,
      );
      const interpolationObject = nonStringParams.find(
        (param): param is Record<string, unknown> => 
          param !== null && 
          typeof param === 'object' && 
          !Array.isArray(param) && 
          !(param instanceof Error),
      );
      if (interpolationObject) {
        processedMessage = this.interpolateString(processedMessage, interpolationObject);
      }
    }

    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    this.bunyanLogger.error({ context, trace }, ...messages.map((msg) => this.applyColor(this.truncateMessage(msg), colors.red)));
  }

  public warn(message: unknown, ...optionalParams: unknown[]): void {
    // Handle backward compatibility: if message is an array, treat it as before
    if (Array.isArray(message)) {
      const lastParam = optionalParams.length > 0 ? optionalParams[optionalParams.length - 1] : undefined;
      const context = typeof lastParam === 'string' ? lastParam : undefined;
      this.bunyanLogger.warn({ context }, ...message.map((msg) => this.applyColor(this.truncateMessage(msg), colors.yellow)));
      return;
    }

    const { processedMessage, context } = this.processMessage(message, ...optionalParams);
    const messages = Array.isArray(processedMessage) ? processedMessage : [processedMessage];
    this.bunyanLogger.warn({ context }, ...messages.map((msg) => this.applyColor(this.truncateMessage(msg), colors.yellow)));
  }
}
