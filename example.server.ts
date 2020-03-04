import { NestFactory } from '@nestjs/core';

import { NestExpressApplication } from '@nestjs/platform-express';
import { BunyanLoggerService } from './src';
import { Module } from '@nestjs/common';

@Module({})
export class ApplicationModule {}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new BunyanLoggerService({
        projectName: 'project',
        formatterOptions: {
          outputMode: 'long',
        },
      }),
    },
  );

  await app.listen(3000);
}
bootstrap();
