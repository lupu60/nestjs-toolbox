import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('TypeORM Soft Delete (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

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
    await app.init();
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE TABLE users CASCADE');
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

  describe('DELETE /users/:id/soft - @nest-toolbox/typeorm-soft-delete', () => {
    it('should soft delete a user with admin role', async () => {
      const user = await createTestUser();

      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      // User should not appear in normal query
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(404);

      // But should appear in deleted users query
      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);

      expect(deletedUsers.body).toHaveLength(1);
      expect(deletedUsers.body[0].id).toBe(user.id);
      expect(deletedUsers.body[0].deletedAt).toBeTruthy();
    });

    it('should fail to soft delete without admin role', async () => {
      const user = await createTestUser();

      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .set('x-user-role', 'user')
        .expect(403);

      // User should still be accessible
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(200);
    });

    it('should fail to soft delete without role header', async () => {
      const user = await createTestUser();

      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .expect(403);
    });

    it('should return 404 when soft deleting non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .delete(`/users/${fakeId}/soft`)
        .set('x-user-role', 'admin')
        .expect(404);
    });
  });

  describe('POST /users/:id/restore - @nest-toolbox/typeorm-soft-delete', () => {
    it('should restore a soft-deleted user', async () => {
      const user = await createTestUser();

      // Soft delete the user
      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      // Verify user is deleted
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(404);

      // Restore the user
      const restoreResponse = await request(app.getHttpServer())
        .post(`/users/${user.id}/restore`)
        .expect(201);

      expect(restoreResponse.body.id).toBe(user.id);
      expect(restoreResponse.body.email).toBe(user.email);
      expect(restoreResponse.body.deletedAt).toBeNull();

      // Verify user is accessible again
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(200);
    });

    it('should handle restoring already active user', async () => {
      const user = await createTestUser();

      // Try to restore without deleting first
      await request(app.getHttpServer())
        .post(`/users/${user.id}/restore`)
        .expect(201);

      // User should still be accessible
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(200);
    });

    it('should fail to restore non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer()).post(`/users/${fakeId}/restore`).expect(404);
    });
  });

  describe('DELETE /users/:id/force - @nest-toolbox/typeorm-soft-delete', () => {
    it('should permanently delete a user', async () => {
      const user = await createTestUser();

      await request(app.getHttpServer())
        .delete(`/users/${user.id}/force`)
        .expect(204);

      // User should not be found anywhere
      await request(app.getHttpServer()).get(`/users/${user.id}`).expect(404);

      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);

      expect(deletedUsers.body).toHaveLength(0);
    });

    it('should permanently delete a soft-deleted user', async () => {
      const user = await createTestUser();

      // First soft delete
      await request(app.getHttpServer())
        .delete(`/users/${user.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      // Then force delete
      await request(app.getHttpServer())
        .delete(`/users/${user.id}/force`)
        .expect(204);

      // User should not be found anywhere
      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);

      expect(deletedUsers.body).toHaveLength(0);
    });

    it('should fail to force delete non-existent user', async () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174000';

      await request(app.getHttpServer())
        .delete(`/users/${fakeId}/force`)
        .expect(404);
    });
  });

  describe('GET /users/deleted - @nest-toolbox/typeorm-soft-delete', () => {
    it('should return only soft-deleted users', async () => {
      const user1 = await createTestUser('user1@example.com');
      const user2 = await createTestUser('user2@example.com');
      const user3 = await createTestUser('user3@example.com');

      // Soft delete user1 and user2
      await request(app.getHttpServer())
        .delete(`/users/${user1.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/users/${user2.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      // Get deleted users
      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);

      expect(deletedUsers.body).toHaveLength(2);
      const deletedEmails = deletedUsers.body.map((u: any) => u.email);
      expect(deletedEmails).toContain(user1.email);
      expect(deletedEmails).toContain(user2.email);
      expect(deletedEmails).not.toContain(user3.email);
    });

    it('should return empty array when no users are deleted', async () => {
      await createTestUser('user1@example.com');
      await createTestUser('user2@example.com');

      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);

      expect(deletedUsers.body).toHaveLength(0);
    });
  });

  describe('Soft delete integration with pagination', () => {
    it('should exclude soft-deleted users from paginated results', async () => {
      // Create 5 users
      for (let i = 1; i <= 5; i++) {
        await createTestUser(`user${i}@example.com`);
      }

      // Get all users
      const allUsers = await request(app.getHttpServer()).get('/users').expect(200);
      expect(allUsers.body.data).toHaveLength(5);

      // Soft delete 2 users
      const userToDelete1 = allUsers.body.data[0];
      const userToDelete2 = allUsers.body.data[1];

      await request(app.getHttpServer())
        .delete(`/users/${userToDelete1.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      await request(app.getHttpServer())
        .delete(`/users/${userToDelete2.id}/soft`)
        .set('x-user-role', 'admin')
        .expect(204);

      // Get users again - should only show 3 active users
      const activeUsers = await request(app.getHttpServer()).get('/users').expect(200);
      expect(activeUsers.body.data).toHaveLength(3);

      // Verify deleted users endpoint shows 2 users
      const deletedUsers = await request(app.getHttpServer())
        .get('/users/deleted')
        .expect(200);
      expect(deletedUsers.body).toHaveLength(2);
    });
  });
});
