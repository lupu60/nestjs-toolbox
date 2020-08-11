# `http-logger-middleware`

## Installation

```
npm i @nest-toolbox/http-logger-middleware
```

## Usage

```
export class AppModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(HttpLoggerMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        });
    }
}
```
