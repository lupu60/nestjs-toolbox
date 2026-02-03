import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('TypeORM Upsert (e2e)', () => {
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

  describe('POST /users/upsert - @nest-toolbox/typeorm-upsert', () => {
    it('should insert a new user when email does not exist', async () => {
      const createUserDto = {
        email: 'john.doe@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'user',
      };

      const response = await request(app.getHttpServer())
        .post('/users/upsert')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toMatchObject({
        email: createUserDto.email,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        role: createUserDto.role,
      });
      expect(response.body.id).toBeDefined();
      expect(response.body.createdAt).toBeDefined();
    });

    it('should update existing user when email already exists', async () => {
      const createUserDto = {
        email: 'jane.smith@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'user',
      };

      // First insert
      const firstResponse = await request(app.getHttpServer())
        .post('/users/upsert')
        .send(createUserDto)
        .expect(201);

      const userId = firstResponse.body.id;

      // Upsert with same email but different data
      const updatedDto = {
        ...createUserDto,
        firstName: 'Janet',
        lastName: 'Smithson',
        role: 'admin',
      };

      const secondResponse = await request(app.getHttpServer())
        .post('/users/upsert')
        .send(updatedDto)
        .expect(201);

      expect(secondResponse.body.id).toBe(userId);
      expect(secondResponse.body.firstName).toBe('Janet');
      expect(secondResponse.body.lastName).toBe('Smithson');
      expect(secondResponse.body.role).toBe('admin');
    });

    it('should handle multiple upserts correctly', async () => {
      const users = [
        { email: 'user1@example.com', firstName: 'User', lastName: 'One', role: 'user' },
        { email: 'user2@example.com', firstName: 'User', lastName: 'Two', role: 'user' },
        { email: 'user3@example.com', firstName: 'User', lastName: 'Three', role: 'admin' },
      ];

      // Insert all users
      for (const user of users) {
        await request(app.getHttpServer()).post('/users/upsert').send(user).expect(201);
      }

      // Update user1
      await request(app.getHttpServer())
        .post('/users/upsert')
        .send({ ...users[0], firstName: 'Updated' })
        .expect(201);

      // Verify total count is still 3
      const allUsers = await request(app.getHttpServer()).get('/users').expect(200);

      expect(allUsers.body.data).toHaveLength(3);
      const updatedUser = allUsers.body.data.find((u: any) => u.email === 'user1@example.com');
      expect(updatedUser.firstName).toBe('Updated');
    });

    it('should fail with invalid email format', async () => {
      const invalidDto = {
        email: 'invalid-email',
        firstName: 'Test',
        lastName: 'User',
      };

      await request(app.getHttpServer()).post('/users/upsert').send(invalidDto).expect(400);
    });

    it('should fail with missing required fields', async () => {
      const invalidDto = {
        email: 'test@example.com',
        // missing firstName and lastName
      };

      await request(app.getHttpServer()).post('/users/upsert').send(invalidDto).expect(400);
    });
  });
});
