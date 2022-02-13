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
    } as any;
    const http = new HttpLoggerMiddleware();
    http.use(req, null, () => {});
  });

  it('should log', () => {
    const req = {
      protocol: 'http',
      get: () => 'localhost',
      originalUrl: '/api/v1/users',
      method: 'GET',
    } as any;
    const http = new HttpLoggerMiddleware();
    http.use(req, null, () => {});
  });
});
