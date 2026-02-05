/**
 * Exception filter that formats errors in the standard envelope shape.
 *
 * Handles HttpException (and subclasses like BadRequestException, NotFoundException)
 * as well as unknown errors, formatting them into a consistent ApiErrorResponse.
 */

import { type ArgumentsHost, Catch, type ExceptionFilter, HttpException, HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import { RESPONSE_ENVELOPE_OPTIONS } from './constants';
import type { ApiErrorResponse, FieldError, ResponseEnvelopeOptions } from './types';

@Catch()
@Injectable()
export class EnvelopeExceptionFilter implements ExceptionFilter {
  constructor(
    @Optional()
    @Inject(RESPONSE_ENVELOPE_OPTIONS)
    private readonly options?: ResponseEnvelopeOptions,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = extractMessage(exception);
    const errors = extractFieldErrors(exception);

    const includePath = this.options?.includePath ?? true;
    const includeTimestamp = this.options?.includeTimestamp ?? true;

    const body: ApiErrorResponse = {
      success: false,
      data: null,
      message,
      errors,
      meta: {
        timestamp: includeTimestamp ? new Date().toISOString() : '',
        path: includePath ? (request.url ?? '') : '',
        statusCode,
      },
    };

    response.status(statusCode).json(body);
  }
}

/**
 * Extract a human-readable message from the exception.
 */
function extractMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if (typeof obj.message === 'string') {
        return obj.message;
      }
      // class-validator returns message as an array
      if (Array.isArray(obj.message) && obj.message.length > 0) {
        return 'Validation failed';
      }
    }
  }

  if (exception instanceof Error) {
    return exception.message;
  }

  return 'Internal server error';
}

/**
 * Extract structured field errors from class-validator ValidationPipe responses.
 */
function extractFieldErrors(exception: unknown): FieldError[] {
  if (!(exception instanceof HttpException)) {
    return [];
  }

  const response = exception.getResponse();

  if (typeof response !== 'object' || response === null) {
    return [];
  }

  const obj = response as Record<string, unknown>;

  // class-validator via ValidationPipe returns { message: string[] }
  if (Array.isArray(obj.message)) {
    return obj.message.filter((msg): msg is string => typeof msg === 'string').map(parseValidationMessage);
  }

  return [];
}

/**
 * Parse a class-validator message like "email must be a valid email" into a FieldError.
 * The first word is typically the field name.
 */
function parseValidationMessage(message: string): FieldError {
  const spaceIndex = message.indexOf(' ');

  if (spaceIndex === -1) {
    return { field: 'unknown', message };
  }

  return {
    field: message.substring(0, spaceIndex),
    message: message.substring(spaceIndex + 1),
  };
}
