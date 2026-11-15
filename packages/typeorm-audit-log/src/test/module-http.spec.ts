import 'reflect-metadata';
import { Body, Controller, Delete, type INestApplication, type MiddlewareConsumer, Module, type NestModule, Param, Post, Put } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { Column, Entity, PrimaryGeneratedColumn, type Repository } from 'typeorm';
import { AuditContextMiddleware } from '../audit-context.middleware';
import { AuditLog } from '../audit-log.entity';
import { AuditLogModule } from '../audit-log.module';
import { AuditLogService } from '../audit-log.service';
import { AUDIT_CONTEXT_EXTRACTOR } from '../constants';
import { Auditable, AuditIgnore } from '../decorators';
import { AuditAction, type AuditContextData } from '../types';

// Runs the module through a real Nest app: DI wiring, subscriber registration, HTTP middleware context (sql.js)

@Entity('members')
@Auditable()
class Member {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'varchar' })
  @AuditIgnore()
  password!: string;
}

@Controller('members')
class MembersController {
  constructor(@InjectRepository(Member) private readonly members: Repository<Member>) {}

  @Post()
  create(@Body() body: Partial<Member>) {
    return this.members.save(this.members.create(body));
  }

  @Put(':id')
  async rename(@Param('id') id: string, @Body() body: { name: string }) {
    const member = await this.members.findOneByOrFail({ id: Number(id) });
    member.name = body.name;
    return this.members.save(member);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const member = await this.members.findOneByOrFail({ id: Number(id) });
    await this.members.remove(member);
  }
}

// Stands in for an auth layer that populates req.user before the audit middleware runs
const fakeAuth = (req: { headers: Record<string, string>; user?: unknown }, _res: unknown, next: () => void) => {
  if (req.headers['x-user-id']) {
    req.user = { id: req.headers['x-user-id'], email: 'alice@example.com' };
  }
  next();
};

const createApp = async (auditModule: ReturnType<typeof AuditLogModule.forRoot>, extraProviders: object[] = []): Promise<INestApplication> => {
  @Module({
    imports: [
      TypeOrmModule.forRoot({ type: 'sqljs', synchronize: true, entities: [AuditLog, Member] }),
      TypeOrmModule.forFeature([Member]),
      auditModule,
    ],
    controllers: [MembersController],
    providers: extraProviders as never[],
  })
  class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
      consumer.apply(fakeAuth, AuditContextMiddleware).forRoutes(MembersController);
    }
  }

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  await app.init();
  return app;
};

// The subscriber logs without blocking the entity write, so wait for the entries to land
const auditEntries = async (app: INestApplication, expected: number): Promise<AuditLog[]> => {
  const service = app.get(AuditLogService);
  await vi.waitFor(async () => {
    expect((await service.findAll()).total).toBe(expected);
  });
  const { items } = await service.findAll();
  return items;
};

describe('AuditLogModule (HTTP)', () => {
  describe('forRoot()', () => {
    let app: INestApplication;

    beforeEach(async () => {
      app = await createApp(AuditLogModule.forRoot({ excludeFields: ['name'] }));
    });

    afterEach(async () => {
      await app.close();
    });

    it('audits an entity created by a request, with the request user and client details', async () => {
      await request(app.getHttpServer())
        .post('/members')
        .set('x-user-id', 'user-1')
        .set('User-Agent', 'vitest-agent')
        .send({ name: 'Alice', password: 'secret' })
        .expect(201);

      const [entry] = await auditEntries(app, 1);
      expect(entry).toMatchObject({
        action: AuditAction.CREATE,
        entityName: 'Member',
        entityId: '1',
        userId: 'user-1',
        userName: 'alice@example.com',
        userAgent: 'vitest-agent',
      });
      expect(entry.ip).toEqual(expect.any(String));
    });

    it('applies module options and @AuditIgnore() to the stored values', async () => {
      await request(app.getHttpServer()).post('/members').send({ name: 'Alice', password: 'secret' }).expect(201);

      const [entry] = await auditEntries(app, 1);
      expect(entry.newValues).not.toHaveProperty('password');
      expect(entry.newValues).not.toHaveProperty('name');
      expect(entry.userId).toBeNull();
    });

    it('audits updates and deletes with the user of each request', async () => {
      await request(app.getHttpServer()).post('/members').set('x-user-id', 'creator').send({ name: 'Alice', password: 'secret' }).expect(201);
      await request(app.getHttpServer()).put('/members/1').set('x-user-id', 'editor').send({ name: 'Alicia' }).expect(200);
      await request(app.getHttpServer()).delete('/members/1').set('x-user-id', 'remover').expect(200);

      const entries = await auditEntries(app, 3);
      const userByAction = Object.fromEntries(entries.map((entry) => [entry.action, entry.userId]));
      expect(userByAction).toEqual({
        [AuditAction.CREATE]: 'creator',
        [AuditAction.UPDATE]: 'editor',
        [AuditAction.DELETE]: 'remover',
      });
    });
  });

  describe('forRootAsync()', () => {
    let app: INestApplication;

    afterEach(async () => {
      await app.close();
    });

    it('resolves options from a factory', async () => {
      app = await createApp(AuditLogModule.forRootAsync({ useFactory: async () => ({ excludeFields: ['name'] }) }));

      await request(app.getHttpServer()).post('/members').send({ name: 'Alice', password: 'secret' }).expect(201);

      const [entry] = await auditEntries(app, 1);
      expect(entry.newValues).not.toHaveProperty('name');
    });

    it('uses an injected custom context extractor', async () => {
      const extractor = (req: { headers: Record<string, string> }): AuditContextData => ({
        userId: `tenant:${req.headers['x-tenant']}`,
        metadata: { tenant: req.headers['x-tenant'] },
      });
      app = await createApp(AuditLogModule.forRootAsync({}), [{ provide: AUDIT_CONTEXT_EXTRACTOR, useValue: extractor }]);

      await request(app.getHttpServer()).post('/members').set('x-tenant', 'acme').send({ name: 'Alice', password: 'secret' }).expect(201);

      const [entry] = await auditEntries(app, 1);
      expect(entry).toMatchObject({ userId: 'tenant:acme', metadata: { tenant: 'acme' } });
    });
  });
});
