import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Product } from '../entities/product.entity';

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
    username: process.env.DATABASE_USERNAME || 'showcase',
    password: process.env.DATABASE_PASSWORD || 'showcase123',
    database:
      process.env.NODE_ENV === 'test'
        ? process.env.TEST_DATABASE_NAME || 'nestjs_toolbox_showcase_test'
        : process.env.DATABASE_NAME || 'nestjs_toolbox_showcase',
    entities: [User, Product],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV === 'development',
  }),
);
