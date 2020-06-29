import { BunyanLoggerService } from '../BunyanLogger.service';

describe('BunyanLoggerService', () => {
  let logger: BunyanLoggerService;
  beforeEach(() => {
    logger = new BunyanLoggerService({
      projectName: 'ProjectName',
      formatterOptions: {
        outputMode: 'long',
      },
    });
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should log', () => {
    logger.log('Hello');
  });
  it('should war', () => {
    logger.warn('Hello Warning');
  });
  it('should err', () => {
    logger.error('Hello Error');
  });

  it('should throw project name is required', () => {
    expect(() => {
      const loggerWithErr = new BunyanLoggerService({
        projectName: '',
        formatterOptions: {
          outputMode: 'long',
        },
      });
      expect(loggerWithErr).toBeUndefined();
    }).toThrowError('projectName is required');
  });
});
