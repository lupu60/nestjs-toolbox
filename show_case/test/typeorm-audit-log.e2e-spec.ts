import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { AuditLogService, AuditAction } from '@nest-toolbox/typeorm-audit-log';

describe('TypeORM Audit Log (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let auditLogService: AuditLogService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    dataSource = moduleFixture.get<DataSource>(DataSource);
    auditLogService = moduleFixture.get<AuditLogService>(AuditLogService);
    await app.init();
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users CASCADE');
    await dataSource.query('TRUNCATE TABLE audit_logs CASCADE');
  });

  async function createTestUser(email: string = 'test@example.com') {
    const user = {
      email,
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
    };
    const response = await request(app.getHttpServer()).post('/users').send(user);
    return response.body;
  }

  describe('Audit Logging - @nest-toolbox/typeorm-audit-log', () => {
    it('should create audit log entry when user is created', async () => {
      const user = await createTestUser('create-test@example.com');

      // Wait a moment for async audit log to be written
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query audit logs
      const auditLogs = await auditLogService.findByEntity('User', user.id);

      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe(AuditAction.CREATE);
      expect(auditLogs[0].entityName).toBe('User');
      expect(auditLogs[0].entityId).toBe(user.id);
    });

    it('should create audit log entry when user is updated', async () => {
      const user = await createTestUser('update-test@example.com');

      // Update the user
      await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .send({ firstName: 'Updated', lastName: 'Name' })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query audit logs
      const auditLogs = await auditLogService.findByEntity('User', user.id);

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);

      // Find the UPDATE action (most recent should be first)
      const updateLog = auditLogs.find((log) => log.action === AuditAction.UPDATE);
      expect(updateLog).toBeDefined();
      expect(updateLog?.diff).toBeDefined();
    });

    it('should create audit log entry when user is deleted', async () => {
      const user = await createTestUser('delete-test@example.com');

      // Soft delete the user
      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query audit logs
      const auditLogs = await auditLogService.findByEntity('User', user.id);

      expect(auditLogs.length).toBeGreaterThanOrEqual(2);

      // Should have CREATE and UPDATE (soft delete is an update of deletedAt)
      const actions = auditLogs.map((log) => log.action);
      expect(actions).toContain(AuditAction.CREATE);
    });

    it('should mask email field in audit logs', async () => {
      const user = await createTestUser('mask-test@example.com');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const auditLogs = await auditLogService.findByEntity('User', user.id);

      expect(auditLogs).toHaveLength(1);

      // Email should be masked (contains ***)
      const newValues = auditLogs[0].newValues as Record<string, unknown>;
      expect(newValues.email).toBeDefined();
      expect(String(newValues.email)).toContain('***');
      expect(String(newValues.email)).not.toBe('mask-test@example.com');
    });

    it('should track multiple users independently', async () => {
      const user1 = await createTestUser('user1@example.com');
      const user2 = await createTestUser('user2@example.com');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const logs1 = await auditLogService.findByEntity('User', user1.id);
      const logs2 = await auditLogService.findByEntity('User', user2.id);

      expect(logs1).toHaveLength(1);
      expect(logs2).toHaveLength(1);
      expect(logs1[0].entityId).toBe(user1.id);
      expect(logs2[0].entityId).toBe(user2.id);
    });

    it('should support paginated query of all audit logs', async () => {
      // Create multiple users to generate audit logs
      await createTestUser('page1@example.com');
      await createTestUser('page2@example.com');
      await createTestUser('page3@example.com');

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await auditLogService.findAll({
        entityName: 'User',
        page: 1,
        limit: 2,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('should filter audit logs by action', async () => {
      const user = await createTestUser('action-filter@example.com');

      // Update the user to create an UPDATE log
      await request(app.getHttpServer())
        .put(`/users/${user.id}`)
        .send({ firstName: 'Updated' })
        .expect(200);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await auditLogService.findAll({
        entityName: 'User',
        action: AuditAction.CREATE,
      });

      // All results should be CREATE actions
      for (const log of result.items) {
        expect(log.action).toBe(AuditAction.CREATE);
      }
    });
  });
});
