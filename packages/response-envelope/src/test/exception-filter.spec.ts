import { HttpException, HttpStatus, BadRequestException, NotFoundException } from '@nestjs/common';
import { EnvelopeExceptionFilter } from '../envelope-exception.filter';

function createMockHost(url = '/api/test') {
  const jsonFn = vi.fn();
  const statusFn = vi.fn(() => ({ json: jsonFn }));
  const request = { url };
  const response = { status: statusFn, json: jsonFn };

  return {
    host: {
      switchToHttp: vi.fn(() => ({
        getRequest: vi.fn(() => request),
        getResponse: vi.fn(() => response),
      })),
    } as any,
    statusFn,
    jsonFn,
  };
}

describe('EnvelopeExceptionFilter', () => {
  it('formats HttpException into error envelope', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, statusFn, jsonFn } = createMockHost('/api/users');
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(403);
    expect(jsonFn).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        data: null,
        message: 'Forbidden',
        errors: [],
        meta: expect.objectContaining({
          path: '/api/users',
          statusCode: 403,
        }),
      }),
    );
  });

  it('formats BadRequestException with validation errors (message as string array)', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new BadRequestException({
      message: ['email must be a valid email', 'name should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(400);
    const body = jsonFn.mock.calls[0][0];
    expect(body.message).toBe('Validation failed');
    expect(body.errors).toEqual([
      { field: 'email', message: 'must be a valid email' },
      { field: 'name', message: 'should not be empty' },
    ]);
  });

  it('formats NotFoundException', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, statusFn, jsonFn } = createMockHost('/api/users/99');
    const exception = new NotFoundException('User not found');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(404);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe('User not found');
    expect(body.meta.statusCode).toBe(404);
    expect(body.meta.path).toBe('/api/users/99');
  });

  it('formats unknown Error objects', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, statusFn, jsonFn } = createMockHost();
    const exception = new Error('Something broke');

    filter.catch(exception, host);

    expect(statusFn).toHaveBeenCalledWith(500);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe('Something broke');
    expect(body.errors).toEqual([]);
    expect(body.meta.statusCode).toBe(500);
  });

  it('formats non-Error throws', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, statusFn, jsonFn } = createMockHost();

    filter.catch('a string was thrown', host);

    expect(statusFn).toHaveBeenCalledWith(500);
    const body = jsonFn.mock.calls[0][0];
    expect(body.success).toBe(false);
    expect(body.message).toBe('Internal server error');
    expect(body.meta.statusCode).toBe(500);
  });

  it('includes path and statusCode in meta', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, jsonFn } = createMockHost('/api/items/5');
    const exception = new HttpException('Gone', HttpStatus.GONE);

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.meta.path).toBe('/api/items/5');
    expect(body.meta.statusCode).toBe(410);
    expect(body.meta.timestamp).toBeTruthy();
  });

  it('parses class-validator messages into field errors with correct field names', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, jsonFn } = createMockHost();
    const exception = new BadRequestException({
      message: ['age must be a positive number'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.errors).toEqual([
      { field: 'age', message: 'must be a positive number' },
    ]);
  });

  it('handles HttpException with string response', () => {
    const filter = new EnvelopeExceptionFilter();
    const { host, jsonFn } = createMockHost();
    const exception = new HttpException('Plain string error', 422);

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.message).toBe('Plain string error');
  });

  it('respects includePath: false option', () => {
    const filter = new EnvelopeExceptionFilter({ includePath: false });
    const { host, jsonFn } = createMockHost('/api/secret');
    const exception = new HttpException('error', 400);

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.meta.path).toBe('');
  });

  it('respects includeTimestamp: false option', () => {
    const filter = new EnvelopeExceptionFilter({ includeTimestamp: false });
    const { host, jsonFn } = createMockHost();
    const exception = new HttpException('error', 400);

    filter.catch(exception, host);

    const body = jsonFn.mock.calls[0][0];
    expect(body.meta.timestamp).toBe('');
  });
});
