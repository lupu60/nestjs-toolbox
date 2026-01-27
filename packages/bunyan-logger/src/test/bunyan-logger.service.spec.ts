import { BunyanLoggerService } from '../bunyan-logger.service';

describe('BunyanLoggerService', () => {
  let logger: BunyanLoggerService;
  beforeEach(() => {
    logger = new BunyanLoggerService({
      projectId: 'ProjectName',
      formatterOptions: {
        color: true,
        levelInString: true,
        outputMode: 'short',
        src: true,
      },
    });
  });

  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should log', () => {
    logger.log('Hello From Bunyan');
  });

  it('should war', () => {
    logger.warn('Warning From Bunyan');
  });

  it('should err', () => {
    logger.error('Error from Bunyan');
  });

  it('should log object', () => {
    const key1Value = 'key1Value';
    const testObject = {
      key1: key1Value,
      key2: 'key2',
      key3: 'key3',
    };
    logger.log(testObject);
  });

  it('should log object', () => {
    const key1Value = 'key1Value';
    const testObject = {
      key1: key1Value,
      key2: 'key2',
      key3: 'key3',
    };
    logger.log(['test===', testObject]);
  });

  it('should log object', () => {
    const key1Value = 'key1Value';
    const testObject = {
      key1: key1Value,
      key2: 'key2',
      key3: 'key3',
    };
    logger.error(['error===', testObject]);
  });

  it('should throw project name is required', () => {
    expect(() => {
      const loggerWithErr = new BunyanLoggerService({
        projectId: '',
        formatterOptions: {
          outputMode: 'long',
        },
      });
      expect(loggerWithErr).toBeUndefined();
    }).toThrow('projectId is required');
  });

  it('should interpolate string placeholders in warn message', () => {
    const warnSpy = jest.spyOn(logger['bunyanLogger'], 'warn');
    logger.warn('{user} tried access the {service} service with an expired key!', { user: 'E73882', service: 'PurchaseOrder' });

    expect(warnSpy).toHaveBeenCalled();
    const callArgs = warnSpy.mock.calls[0];
    const logMessage = callArgs[1];
    expect(logMessage).toBe('E73882 tried access the PurchaseOrder service with an expired key!');
    warnSpy.mockRestore();
  });

  it('should interpolate string placeholders in log message', () => {
    const logSpy = jest.spyOn(logger['bunyanLogger'], 'info');
    logger.log('Hello {name}, welcome to {app}!', { name: 'John', app: 'MyApp' });

    expect(logSpy).toHaveBeenCalled();
    const callArgs = logSpy.mock.calls[0];
    const logMessage = callArgs[1];
    expect(logMessage).toBe('Hello John, welcome to MyApp!');
    logSpy.mockRestore();
  });

  it('should interpolate string placeholders in error message', () => {
    const errorSpy = jest.spyOn(logger['bunyanLogger'], 'error');
    logger.error('Error occurred for user {userId} in module {module}', { userId: '12345', module: 'Auth' });

    expect(errorSpy).toHaveBeenCalled();
    const callArgs = errorSpy.mock.calls[0];
    const logMessage = callArgs[1];
    expect(logMessage).toContain('Error occurred for user 12345 in module Auth');
    errorSpy.mockRestore();
  });

  it('should handle string interpolation with context', () => {
    const warnSpy = jest.spyOn(logger['bunyanLogger'], 'warn');
    logger.warn('{user} tried access the {service} service', { user: 'E73882', service: 'PurchaseOrder' }, 'AppController');

    expect(warnSpy).toHaveBeenCalled();
    const callArgs = warnSpy.mock.calls[0];
    expect(callArgs[0].context).toBe('AppController');
    const logMessage = callArgs[1];
    expect(logMessage).toBe('E73882 tried access the PurchaseOrder service');
    warnSpy.mockRestore();
  });

  it('should not interpolate if no object parameter provided', () => {
    const warnSpy = jest.spyOn(logger['bunyanLogger'], 'warn');
    logger.warn('{user} tried access the {service} service');

    expect(warnSpy).toHaveBeenCalled();
    const callArgs = warnSpy.mock.calls[0];
    const logMessage = callArgs[1];
    expect(logMessage).toBe('{user} tried access the {service} service');
    warnSpy.mockRestore();
  });
});
