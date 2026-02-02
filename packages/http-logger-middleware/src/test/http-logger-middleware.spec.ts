import type { Request, Response } from 'express';
import { HttpLoggerMiddleware } from '../http-logger-middleware';

describe('HttpLoggerMiddleware', () => {
  it('should log', () => {
    const req = {
      protocol: 'http',
      get: () => 'localhost',
      originalUrl: '/api/v1/users',
      method: 'GET',
      body: {
        name: 'John',
      },
      params: {
        id: '1',
      },
      query: {
        page: 1,
      },
    } as any as Request;
    const res = {} as Response;
    const http = new HttpLoggerMiddleware();
    http.use(req, res, () => {});
  });

  it('should log', () => {
    const req = {
      protocol: 'http',
      get: () => 'localhost',
      originalUrl: '/api/v1/users',
      method: 'GET',
    } as any as Request;
    const res = {} as Response;
    const http = new HttpLoggerMiddleware();
    http.use(req, res, () => {});
  });
});
