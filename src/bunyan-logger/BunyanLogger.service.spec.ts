import { BunyanLoggerService } from './BunyanLogger.service';

describe('BunyanLoggerService', () => {
  let logger: BunyanLoggerService;
  beforeEach(() => {
    logger = new BunyanLoggerService('ProjectName', {
      outputMode: 'long',
    });
  });
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });
  it('should log', () => {
    logger.log('Hello')
  });
  it('should war', () => {
    logger.warn('Hello Warning')
  });
  it('should err', () => {
    logger.error('Hello Error')
  });
});
