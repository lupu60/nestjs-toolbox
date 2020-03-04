<div align="center">
  <h1>Nestjs Toolbox 🧰</h1>
</div>
<div align="center">
  <strong>The repository contains a suite of components and modules for Nest.js</strong>
</div>
<br />
<div align="center">
  <a href="https://travis-ci.org/lupu60/nestjs-toolbox">
    <img src="https://travis-ci.org/lupu60/nestjs-toolbox.svg?branch=master" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/npm/l/@lupu60/nestjs-toolbox"  />
  </a>
   <a href="https://david-dm.org/lupu60/nestjs-toolbox">
    <img src="https://david-dm.org/lupu60/nestjs-toolbox.svg"  />
  </a>
  <br />
  <a href="https://nodei.co/npm/@lupu60/nestjs-toolbox/"><img src="https://nodei.co/npm/@lupu60/nestjs-toolbox.png?compact=true"></a>
</div>

### Install

```
npm i @lupu60/nestjs-toolbox -save
```

### List of packages

- [BunyanLoggerService](#bunyan-logger-service)
- [WinstonLoggerService](#winston-logger-service)

### Bunyan Logger Service

NestJS LoggerService that uses Bunyan.

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

### Winston Logger Service

NestJS LoggerService that uses Winston.

### Example

You can pass any custom transports supported by Winston

```js
import { NestFactory } from '@nestjs/core';
import { WinstonLoggerService } from '@lupu60/nestjs-toolbox';
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

## Support on Beerpay

Hey dude! Help me out for a couple of :beers:!

[![Beerpay](https://beerpay.io/lupu60/nestjs-toolbox/badge.svg?style=beer-square)](https://beerpay.io/lupu60/nestjs-toolbox) [![Beerpay](https://beerpay.io/lupu60/nestjs-toolbox/make-wish.svg?style=flat-square)](https://beerpay.io/lupu60/nestjs-toolbox?focus=wish)
