import { WinstonLoggerService } from '../WinstonLogger.service';
describe('WinstonLoggerService', () => {
  let logger: WinstonLoggerService;
  beforeEach(() => {
    logger = new WinstonLoggerService({ projectName: 'ProjectName' });
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
    logger.error('Hello Error', 'trace');
  });

  it('should throw project name is required', () => {
    expect(() => {
      const loggerWithErr = new WinstonLoggerService({
        projectName: '',
      });
      expect(loggerWithErr).toBeUndefined();
    }).toThrowError('projectName is required');
  });
});
