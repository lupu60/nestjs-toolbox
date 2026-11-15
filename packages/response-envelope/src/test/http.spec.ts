import { BadRequestException, Controller, Get, type INestApplication, Module, NotFoundException, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ApiMessage, SkipEnvelope } from '../decorators';
import { ResponseEnvelopeModule } from '../response-envelope.module';
import type { ResponseEnvelopeOptions } from '../types';

// Runs the module through a real Nest HTTP pipeline (DI, global interceptor, global filter)

@Controller('users')
class UsersController {
  @Get()
  list() {
    return [{ id: 1, name: 'Alice' }];
  }

  @Post()
  @ApiMessage('User created')
  create() {
    return { id: 2 };
  }

  @Get('empty')
  empty() {
    return undefined;
  }

  @Get('raw')
  @SkipEnvelope()
  raw() {
    return { status: 'ok' };
  }

  @Get('missing')
  missing() {
    throw new NotFoundException('User not found');
  }

  @Get('invalid')
  invalid() {
    throw new BadRequestException({ message: ['email must be an email', 'required'] });
  }

  @Get('crash')
  crash() {
    throw new Error('database exploded');
  }
}

const OPTIONS_TOKEN = 'TEST_ENVELOPE_OPTIONS';

@Module({
  providers: [{ provide: OPTIONS_TOKEN, useValue: { defaultMessage: 'Done', includePath: false, includeTimestamp: false } }],
  exports: [OPTIONS_TOKEN],
})
class ConfigModule {}

const createApp = async (envelopeModule: ReturnType<typeof ResponseEnvelopeModule.forRoot>): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [envelopeModule],
    controllers: [UsersController],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
};

describe('ResponseEnvelopeModule (HTTP)', () => {
  describe('forRoot()', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(ResponseEnvelopeModule.forRoot());
    });

    afterAll(async () => {
      await app.close();
    });

    it('wraps a successful response', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toEqual({
        success: true,
        data: [{ id: 1, name: 'Alice' }],
        message: 'OK',
        meta: { timestamp: expect.any(String), path: '/users', statusCode: 200 },
      });
      expect(Number.isNaN(Date.parse(res.body.meta.timestamp))).toBe(false);
    });

    it('uses the @ApiMessage() text and the real status code', async () => {
      const res = await request(app.getHttpServer()).post('/users').expect(201);

      expect(res.body).toMatchObject({ success: true, data: { id: 2 }, message: 'User created', meta: { statusCode: 201 } });
    });

    it('wraps an empty result as null data', async () => {
      const res = await request(app.getHttpServer()).get('/users/empty').expect(200);

      expect(res.body).toMatchObject({ success: true, data: null });
    });

    it('leaves @SkipEnvelope() routes untouched', async () => {
      const res = await request(app.getHttpServer()).get('/users/raw').expect(200);

      expect(res.body).toEqual({ status: 'ok' });
    });

    it('formats an HttpException as an error envelope', async () => {
      const res = await request(app.getHttpServer()).get('/users/missing').expect(404);

      expect(res.body).toEqual({
        success: false,
        data: null,
        message: 'User not found',
        errors: [],
        meta: { timestamp: expect.any(String), path: '/users/missing', statusCode: 404 },
      });
    });

    it('extracts field errors from validation-style exceptions', async () => {
      const res = await request(app.getHttpServer()).get('/users/invalid').expect(400);

      expect(res.body).toMatchObject({
        success: false,
        message: 'Validation failed',
        errors: [
          { field: 'email', message: 'must be an email' },
          { field: 'unknown', message: 'required' },
        ],
      });
    });

    it('formats an unknown error as a 500 envelope', async () => {
      const res = await request(app.getHttpServer()).get('/users/crash').expect(500);

      expect(res.body).toMatchObject({ success: false, data: null, message: 'database exploded', meta: { statusCode: 500 } });
    });

    it('formats an unmatched route as a 404 envelope', async () => {
      const res = await request(app.getHttpServer()).get('/nope').expect(404);

      expect(res.body).toMatchObject({ success: false, data: null, meta: { path: '/nope', statusCode: 404 } });
    });
  });

  describe('forRootAsync()', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(
        ResponseEnvelopeModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (options: ResponseEnvelopeOptions) => options,
          inject: [OPTIONS_TOKEN],
        }),
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it('applies injected options to success responses', async () => {
      const res = await request(app.getHttpServer()).get('/users').expect(200);

      expect(res.body).toMatchObject({ message: 'Done', meta: { timestamp: '', path: '', statusCode: 200 } });
    });

    it('applies injected options to error responses', async () => {
      const res = await request(app.getHttpServer()).get('/users/missing').expect(404);

      expect(res.body.meta).toEqual({ timestamp: '', path: '', statusCode: 404 });
    });
  });
});
