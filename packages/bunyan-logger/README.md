### Bunyan Logger Service

NestJS LoggerService that uses Bunyan.

### Installation
```
npm i @lupu60/nest-toolbox-bunyan-logger
```

### Example

You can pass any custom stream supported by Bunyan

```js
import { NestFactory } from '@nestjs/core';
import { BunyanLoggerService } from "@lupu60/nestjs-toolbox";
import { AppModule } from './app.module';

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

  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new BunyanLoggerService({
        projectName: 'project',
        formatterOptions: {
          outputMode: 'long',
        },
        customStreams: [
          {
            path: 'foo.log',
          },
        ],
      }),
    },
  );

  await app.listen(3000);
}
bootstrap();
```

### BunyanLoggerService constructor options

```js
options: {
    projectName: string;
    formatterOptions: {
      outputMode: string;
      color?: boolean;
      levelInString?: boolean;
      colorFromLevel?: any;
    };
    customStreams?: any[];
}
```