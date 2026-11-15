import { Body, Controller, Get, type INestApplication, Logger, type MiddlewareConsumer, Module, type NestModule, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HttpLoggerMiddleware } from '../http-logger-middleware';

// Runs the middleware through a real Nest HTTP pipeline instead of hand-built request objects

@Controller('users')
class UsersController {
  @Get()
  list() {
    return [];
  }

  @Post()
  create(@Body() body: unknown) {
    return body;
  }
}

@Module({ controllers: [UsersController] })
class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(HttpLoggerMiddleware).forRoutes(UsersController);
  }
}

// biome-ignore lint/complexity/useRegexLiterals: avoid control characters in a regex literal
const ANSI = new RegExp('\u001b\\[\\d+m', 'g');

describe('HttpLoggerMiddleware (HTTP)', () => {
  let app: INestApplication;
  let logSpy: ReturnType<typeof vi.spyOn>;

  const loggedLines = (): string[] => logSpy.mock.calls.map(([message]: unknown[]) => String(message).replace(ANSI, ''));

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    await app.init();
  });

  beforeEach(() => {
    logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  afterAll(async () => {
    await app.close();
  });

  it('logs method, full URL and query, then lets the request through', async () => {
    await request(app.getHttpServer()).get('/users?page=2').set('Host', 'api.example.com').expect(200, []);

    const lines = loggedLines();
    expect(lines).toContain('request method: GET');
    expect(lines).toContain('request url:  http://api.example.com/users?page=2');
    expect(lines).toContain('request query:  {"page":"2"}');
    expect(lines.some((line) => line.startsWith('request body'))).toBe(false);
  });

  it('logs the parsed JSON body', async () => {
    await request(app.getHttpServer()).post('/users').send({ name: 'John' }).expect(201, { name: 'John' });

    const lines = loggedLines();
    expect(lines).toContain('request method: POST');
    expect(lines).toContain('request body:  {"name":"John"}');
    expect(lines.some((line) => line.startsWith('request query'))).toBe(false);
  });
});
