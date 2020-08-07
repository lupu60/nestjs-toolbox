
### Winston Logger Service

NestJS LoggerService that uses Winston.

### Installation
```
 npm i @lupu60/nest-toolbox-winston-logger
```

### Example

You can pass any custom transports supported by Winston

```js
import { NestFactory } from '@nestjs/core';
import { WinstonLoggerService } from ' @lupu60/nest-toolbox-winston-logger';
import { AppModule } from './app.module';
import * as winston from 'winston';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new WinstonLoggerService({
        projectName: 'project',
      }),
    },
  );

  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new WinstonLoggerService({
        projectName: 'project',
        transports: [
          new winston.transports.File({
            filename: 'combined.log',
            level: 'info',
          }),
        ],
      }),
    },
  );

  await app.listen(3000);
}
bootstrap();
```

### WinstonLoggerService constructor options

```js
options: {
  projectName: string,
  transports?: any[],
  timeFormatStr?: string,
  customFormatter?: any
}
```