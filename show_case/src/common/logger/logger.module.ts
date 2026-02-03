import { Module, Global } from '@nestjs/common';
import { BunyanLoggerService } from '@nest-toolbox/bunyan-logger';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    {
      provide: 'LOGGER',
      useFactory: (configService: ConfigService) => {
        return new BunyanLoggerService({
          name: 'nestjs-toolbox-showcase',
          level: (configService.get('LOG_LEVEL') || 'info') as any,
          src: configService.get('NODE_ENV') === 'development',
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['LOGGER'],
})
export class LoggerModule {}
