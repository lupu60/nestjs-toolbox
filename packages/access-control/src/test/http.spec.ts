import {
  type CanActivate,
  Controller,
  Delete,
  type ExecutionContext,
  Get,
  type INestApplication,
  Injectable,
  type Type,
  UseGuards,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AccessControlModule } from '../access-control.module';
import { Action, getAction, getResource, InjectRulesBuilder, Resource } from '../decorators';
import { RulesBuilder } from '../rules-builder.class';

// Runs the module through a real Nest HTTP pipeline: grants endpoint, injected rules, decorator metadata in a guard

// A fresh list per builder: role-acl consumes the grant objects it is given
const createRules = () =>
  new RulesBuilder([
    { role: 'admin', resource: 'videos', action: 'read', attributes: ['*'] },
    { role: 'admin', resource: 'videos', action: 'delete', attributes: ['*'] },
    { role: 'viewer', resource: 'videos', action: 'read', attributes: ['*'] },
  ]);

// The kind of guard a consumer builds on top of the package: role from a header, action/resource from the decorators
@Injectable()
class RulesGuard implements CanActivate {
  constructor(@InjectRulesBuilder() private readonly rules: RulesBuilder) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const role = context.switchToHttp().getRequest().headers['x-role'];
    if (typeof role !== 'string') {
      return false;
    }
    const action = getAction(context.getHandler());
    const resource = getResource(context.getClass() as Type<unknown>);
    try {
      const permission = await this.rules.can(role).execute(action).on(resource);
      return permission.granted;
    } catch {
      // role-acl throws for roles it has never seen
      return false;
    }
  }
}

@Controller('videos')
@Resource('videos')
@UseGuards(RulesGuard)
class VideosController {
  @Get()
  @Action('read')
  list() {
    return ['intro.mp4'];
  }

  @Delete()
  @Action('delete')
  remove() {
    return { removed: true };
  }
}

const createApp = async (accessControlModule: ReturnType<typeof AccessControlModule.forRules>): Promise<INestApplication> => {
  const moduleRef = await Test.createTestingModule({
    imports: [accessControlModule],
    controllers: [VideosController],
    providers: [RulesGuard],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
};

describe('AccessControlModule (HTTP)', () => {
  describe('forRules() with a grants endpoint', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AccessControlModule.forRules(createRules(), { grantsEndpoint: 'grants' }));
    });

    afterAll(async () => {
      await app.close();
    });

    it('serves the grants on the configured endpoint', async () => {
      const res = await request(app.getHttpServer()).get('/grants').expect(200);

      expect(Object.keys(res.body).sort()).toEqual(['admin', 'viewer']);
      expect(res.body.viewer.grants).toEqual([{ resource: ['videos'], action: ['read'], attributes: ['*'] }]);
    });

    it('allows a role that holds the grant', async () => {
      await request(app.getHttpServer()).get('/videos').set('x-role', 'viewer').expect(200, ['intro.mp4']);
      await request(app.getHttpServer()).delete('/videos').set('x-role', 'admin').expect(200, { removed: true });
    });

    it('rejects a role without the grant', async () => {
      await request(app.getHttpServer()).delete('/videos').set('x-role', 'viewer').expect(403);
    });

    it('rejects unknown and missing roles', async () => {
      await request(app.getHttpServer()).get('/videos').set('x-role', 'stranger').expect(403);
      await request(app.getHttpServer()).get('/videos').expect(403);
    });
  });

  describe('forRules() without options', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AccessControlModule.forRules(createRules()));
    });

    afterAll(async () => {
      await app.close();
    });

    it('does not expose a grants endpoint', async () => {
      await request(app.getHttpServer()).get('/grants').expect(404);
    });

    it('still provides the rules to guards', async () => {
      await request(app.getHttpServer()).get('/videos').set('x-role', 'viewer').expect(200);
    });
  });

  describe('forRootAsync()', () => {
    let app: INestApplication;

    beforeAll(async () => {
      app = await createApp(AccessControlModule.forRootAsync({ useFactory: async () => createRules() }));
    });

    afterAll(async () => {
      await app.close();
    });

    it('provides factory-built rules to guards', async () => {
      await request(app.getHttpServer()).get('/videos').set('x-role', 'viewer').expect(200);
      await request(app.getHttpServer()).delete('/videos').set('x-role', 'viewer').expect(403);
    });
  });
});
