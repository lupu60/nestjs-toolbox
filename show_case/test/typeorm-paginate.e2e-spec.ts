import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('TypeORM Paginate (e2e)', () => {
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

  async function createTestUsers(count: number) {
    const users = [];
    for (let i = 1; i <= count; i++) {
      const user = {
        email: `user${i}@example.com`,
        firstName: `User${i}`,
        lastName: `Test${i}`,
        role: i % 3 === 0 ? 'admin' : 'user',
      };
      const response = await request(app.getHttpServer()).post('/users').send(user);
      users.push(response.body);
    }
    return users;
  }

  describe('GET /users - @nest-toolbox/typeorm-paginate', () => {
    it('should return paginated users with default settings', async () => {
      await createTestUsers(25);

      const response = await request(app.getHttpServer()).get('/users').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.data).toHaveLength(10); // default limit
      expect(response.body.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: 10,
        pageCount: 3,
        hasPreviousPage: false,
        hasNextPage: true,
      });
    });

    it('should paginate correctly with custom page and limit', async () => {
      await createTestUsers(25);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 2, limit: 5 })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta).toMatchObject({
        page: 2,
        take: 5,
        itemCount: 5,
        pageCount: 5,
        hasPreviousPage: true,
        hasNextPage: true,
      });
    });

    it('should handle the last page correctly', async () => {
      await createTestUsers(25);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 3, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(5); // only 5 users left
      expect(response.body.meta).toMatchObject({
        page: 3,
        take: 10,
        itemCount: 5,
        pageCount: 3,
        hasPreviousPage: true,
        hasNextPage: false,
      });
    });

    it('should return empty array when page exceeds available data', async () => {
      await createTestUsers(10);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 5, limit: 10 })
        .expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta.page).toBe(5);
      expect(response.body.meta.hasNextPage).toBe(false);
    });

    it('should sort users correctly by email ASC', async () => {
      await createTestUsers(5);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ sortBy: 'email', sortOrder: 'ASC', limit: 5 })
        .expect(200);

      const emails = response.body.data.map((u: any) => u.email);
      expect(emails).toEqual([...emails].sort());
    });

    it('should sort users correctly by email DESC', async () => {
      await createTestUsers(5);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ sortBy: 'email', sortOrder: 'DESC', limit: 5 })
        .expect(200);

      const emails = response.body.data.map((u: any) => u.email);
      expect(emails).toEqual([...emails].sort().reverse());
    });

    it('should handle pagination with only 1 user', async () => {
      await createTestUsers(1);

      const response = await request(app.getHttpServer()).get('/users').expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: 1,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should handle pagination with no users', async () => {
      const response = await request(app.getHttpServer()).get('/users').expect(200);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.meta).toMatchObject({
        page: 1,
        take: 10,
        itemCount: 0,
        pageCount: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should handle large limit values', async () => {
      await createTestUsers(5);

      const response = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 100 })
        .expect(200);

      expect(response.body.data).toHaveLength(5);
      expect(response.body.meta.pageCount).toBe(1);
    });
  });
});
