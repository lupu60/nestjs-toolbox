import { Controller, Get, type INestApplication, Inject, Injectable, Module, Param } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RequestContext } from '../request-context';
import { RequestContextModule } from '../request-context.module';
import type { RequestContextOptions } from '../types';

// Runs the module through a real Nest HTTP pipeline (DI, middleware registration, AsyncLocalStorage)

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Reads the context without receiving the request, as a service deep in the call stack would
@Injectable()
class TenantService {
  async describe(): Promise<{ requestId: string | undefined; tenant: string | undefined }> {
    // Yield so concurrent requests interleave before the context is read back
    await new Promise((resolve) => setImmediate(resolve));
    return { requestId: RequestContext.requestId, tenant: RequestContext.get<string>('tenant') };
  }
}

@Controller()
class ContextController {
  // Explicit token: the test transform emits no constructor type metadata
  constructor(@Inject(TenantService) private readonly tenants: TenantService) {}

  @Get('tenants/:tenant')
  tenant(@Param('tenant') tenant: string) {
    RequestContext.set('tenant', tenant);
    return this.tenants.describe();
  }
}

const OPTIONS_TOKEN = 'TEST_CONTEXT_OPTIONS';

@Module({
  providers: [
    {
      provide: OPTIONS_TOKEN,
      useValue: { requestIdHeader: 'x-correlation-id', responseIdHeader: 'x-trace-id', generateId: () => 'generated-id' },
    },
  ],
  exports: [OPTIONS_TOKEN],
})
class ConfigModule {}

const createApp = async (contextModule: ReturnType<typeof RequestContextModule.forRoot>): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [contextModule],
    controllers: [ContextController],
    providers: [TenantService],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
};

describe('RequestContextModule (HTTP)', () => {
  describe('forRoot()', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(RequestContextModule.forRoot());
    });

    afterAll(async () => {
      await app.close();
    });

    it('generates a request ID and exposes it to services and the response header', async () => {
      const res = await request(app.getHttpServer()).get('/tenants/acme').expect(200);

      expect(res.body.requestId).toMatch(UUID);
      expect(res.headers['x-request-id']).toBe(res.body.requestId);
      expect(res.body.tenant).toBe('acme');
    });

    it('reuses the incoming request ID header', async () => {
      const res = await request(app.getHttpServer()).get('/tenants/acme').set('x-request-id', 'upstream-42').expect(200);

      expect(res.body.requestId).toBe('upstream-42');
      expect(res.headers['x-request-id']).toBe('upstream-42');
    });

    it('keeps concurrent requests isolated', async () => {
      const tenants = Array.from({ length: 20 }, (_, i) => `tenant-${i}`);

      const responses = await Promise.all(
        tenants.map((tenant) => request(app.getHttpServer()).get(`/tenants/${tenant}`).set('x-request-id', tenant)),
      );

      expect(responses.map((res) => res.body)).toEqual(tenants.map((tenant) => ({ requestId: tenant, tenant })));
    });

    it('leaves no context behind once the request finishes', async () => {
      await request(app.getHttpServer()).get('/tenants/acme').expect(200);

      expect(RequestContext.requestId).toBeUndefined();
    });
  });

  describe('forRootAsync()', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(
        RequestContextModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (options: RequestContextOptions) => options,
          inject: [OPTIONS_TOKEN],
        }),
      );
    });

    afterAll(async () => {
      await app.close();
    });

    it('uses the injected generator and response header', async () => {
      const res = await request(app.getHttpServer()).get('/tenants/acme').expect(200);

      expect(res.body.requestId).toBe('generated-id');
      expect(res.headers['x-trace-id']).toBe('generated-id');
      expect(res.headers['x-request-id']).toBeUndefined();
    });

    it('reads the request ID from the injected header name', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenants/acme')
        .set('x-correlation-id', 'corr-7')
        .set('x-request-id', 'ignored')
        .expect(200);

      expect(res.body.requestId).toBe('corr-7');
    });
  });
});
