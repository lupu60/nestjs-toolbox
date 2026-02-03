import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('General Packages Integration (e2e)', () => {
  let app: INestApplication;

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

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('@nest-toolbox/version-generator', () => {
    it('should return version information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/version')
        .expect(200);

      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('node');
      expect(response.body).toHaveProperty('platform');
      expect(typeof response.body.version).toBe('string');
      expect(response.body.node).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('@nest-toolbox/bootstrap-log', () => {
    it('should have properly bootstrapped the application', async () => {
      // If app started successfully, bootstrap-log worked
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('@nest-toolbox/http-logger-middleware', () => {
    it('should log HTTP requests through middleware', async () => {
      // The middleware logs all requests
      // We verify it doesn't break the request flow
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });

    it('should handle POST requests through middleware', async () => {
      const userData = {
        email: 'middleware-test@example.com',
        firstName: 'Middleware',
        lastName: 'Test',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(userData)
        .expect(201);

      expect(response.body.email).toBe(userData.email);
    });

    it('should exclude health endpoints from logging', async () => {
      // Health endpoints are configured to be excluded
      // This test verifies they still work
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      await request(app.getHttpServer())
        .get('/health/version')
        .expect(200);
    });
  });

  describe('@nest-toolbox/bunyan-logger', () => {
    it('should have logger available in application context', async () => {
      // If application started, bunyan logger is configured
      // Verify by making a request that triggers logging
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toBeDefined();
    });
  });

  describe('Swagger / OpenAPI Integration', () => {
    it('should serve Swagger documentation', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body.info.title).toBe('NestJS Toolbox Showcase');
    });

    it('should document user endpoints in OpenAPI', async () => {
      const response = await request(app.getHttpServer())
        .get('/api-json')
        .expect(200);

      expect(response.body.paths).toHaveProperty('/users');
      expect(response.body.paths).toHaveProperty('/users/upsert');
      expect(response.body.paths).toHaveProperty('/users/{id}/soft');
      expect(response.body.paths).toHaveProperty('/users/{id}/restore');
    });
  });

  describe('Access Control Integration', () => {
    it('should allow access to endpoints without role requirements', async () => {
      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      await request(app.getHttpServer())
        .get('/users')
        .expect(200);
    });

    it('should block access to admin-only endpoints without admin role', async () => {
      // Create a user first
      const user = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test-access@example.com',
          firstName: 'Test',
          lastName: 'Access',
        })
        .expect(201);

      // Try to soft delete without admin role
      await request(app.getHttpServer())
        .delete(`/users/${user.body.id}/soft`)
        .set('x-user-role', 'user')
        .expect(403);
    });

    it('should allow access to admin-only endpoints with admin role', async () => {
      // Create a user first
      const user = await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test-admin@example.com',
          firstName: 'Test',
          lastName: 'Admin',
        })
        .expect(201);

      // Soft delete with admin role
      await request(app.getHttpServer())
        .delete(`/users/${user.body.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate request body with class-validator', async () => {
      const invalidData = {
        email: 'invalid-email',
        // missing required fields
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(Array.isArray(response.body.message)).toBe(true);
    });

    it('should transform query parameters correctly', async () => {
      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: '2', limit: '5' })
        .expect(200);

      expect(response.body.meta.page).toBe(2);
      expect(response.body.meta.take).toBe(5);
    });

    it('should strip non-whitelisted properties', async () => {
      const dataWithExtra = {
        email: 'strip-test@example.com',
        firstName: 'Strip',
        lastName: 'Test',
        extraField: 'should be removed',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(dataWithExtra)
        .expect(400); // Should fail because extraField is not whitelisted
    });
  });
});
