### Bunyan Logger Service

NestJS LoggerService that uses Bunyan.

### Installation

```
npm i @nest-toolbox/bunyan-logger
```

### Example

You can pass any custom stream supported by Bunyan

```js
import { NestFactory } from '@nestjs/core';
import { BunyanLoggerService } from "@nest-toolbox/bunyan-logger";
import { AppModule } from './app.module';
const Elasticsearch = require('bunyan-elasticsearch');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new BunyanLoggerService({
        projectId: 'project',
        formatterOptions: {
          outputMode: 'long',
        },
      }),
    },
  );

  const esStream = new Elasticsearch({
    type: 'logs',
    host: 'localhost:9300',
  });

  const app = await NestFactory.create<NestExpressApplication>(
    ApplicationModule,
    {
      logger: new BunyanLoggerService({
        projectId: 'project',
        formatterOptions: {
          outputMode: 'long',
        },
        extraFields?: {
          environment:'production',
          microservice: 'users',
        };
        customStreams: [
          { stream: esStream },
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

check https://github.com/thlorenz/bunyan-format

```js
options: {
    projectId: string;
    formatterOptions: {
      outputMode: string;
      color?: boolean;
      levelInString?: boolean;
      colorFromLevel?: any;
      src?: boolean;
    };
    customStreams?: Bunyan.Stream[];
    extraFields?: {
      [key: string]: string;
    };
    maxLength?: number; // Optional: Maximum length for log messages. Messages exceeding this length will be truncated.
}
```

#### Options

- **projectId** (required): The project identifier used as the logger name
- **formatterOptions** (required): Configuration for bunyan-format. See [bunyan-format documentation](https://github.com/thlorenz/bunyan-format) for details
  - **outputMode**: Output format (`short`, `long`, `simple`, `json`, `bunyan`)
  - **color**: Enable/disable colors in output (default: `true` if not specified)
  - **levelInString**: Display log level as string
  - **colorFromLevel**: Custom color mapping for log levels
  - **src**: Include source file information
- **customStreams** (optional): Additional Bunyan streams (e.g., file streams, Elasticsearch streams)
- **extraFields** (optional): Additional fields to include in all log entries
- **maxLength** (optional): Maximum character length for log messages. Messages longer than this value will be truncated. Useful for limiting log size in production environments.

#### Example with maxLength

```js
import { NestFactory } from '@nestjs/core';
import { BunyanLoggerService } from "@nest-toolbox/bunyan-logger";
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new BunyanLoggerService({
      projectId: 'MyApp',
      formatterOptions: {
        outputMode: 'short',
        color: true,
      },
      maxLength: 100, // Limit log messages to 100 characters
    }),
  });

  await app.listen(3000);
}
bootstrap();
```
