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
          projectId: 'nestjs-toolbox-showcase',
          formatterOptions: {
            outputMode: 'short',
            color: true,
            levelInString: false,
          },
          maxLength: 5000,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['LOGGER'],
})
export class LoggerModule {}
