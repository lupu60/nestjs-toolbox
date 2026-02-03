import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { BootstrapLog } from '@nest-toolbox/bootstrap-log';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  app.enableCors();

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('NestJS Toolbox Showcase')
    .setDescription('API documentation for NestJS Toolbox package demonstrations')
    .setVersion('1.0')
    .addTag('users', 'User management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // Bootstrap log from @nest-toolbox/bootstrap-log
  BootstrapLog({
    config: {
      environment: process.env.NODE_ENV || 'development',
      hostname: `http://localhost:${port}`,
      package_json_body: {
        name: 'NestJS Toolbox Showcase',
        version: '1.0.0',
      },
      swagger: true,
      database_url: process.env.DATABASE_HOST
        ? `postgresql://${process.env.DATABASE_USERNAME}@${process.env.DATABASE_HOST}:${process.env.DATABASE_PORT}/${process.env.DATABASE_NAME}`
        : undefined,
    },
  });

  const logger = new Logger('Main');
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`📚 Swagger documentation: http://localhost:${port}/api`);
}
bootstrap();
