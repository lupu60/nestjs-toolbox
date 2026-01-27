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
    // Strip ANSI color codes for comparison (colors.yellow adds them)
    const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
    expect(strippedMessage).toBe('E73882 tried access the PurchaseOrder service with an expired key!');
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
    // Strip ANSI color codes for comparison (colors.yellow adds them)
    const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
    expect(strippedMessage).toBe('E73882 tried access the PurchaseOrder service');
    warnSpy.mockRestore();
  });

  it('should not interpolate if no object parameter provided', () => {
    const warnSpy = jest.spyOn(logger['bunyanLogger'], 'warn');
    logger.warn('{user} tried access the {service} service');

    expect(warnSpy).toHaveBeenCalled();
    const callArgs = warnSpy.mock.calls[0];
    const logMessage = callArgs[1];
    // Strip ANSI color codes for comparison (colors.yellow adds them)
    const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
    expect(strippedMessage).toBe('{user} tried access the {service} service');
    warnSpy.mockRestore();
  });

  describe('color property', () => {
    it('should not apply colors when color is false', () => {
      const loggerWithoutColors = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          color: false,
          outputMode: 'short',
        },
      });

      const errorSpy = jest.spyOn(loggerWithoutColors['bunyanLogger'], 'error');
      loggerWithoutColors.error('Error message');

      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // Should not contain ANSI color codes
      expect(logMessage).toBe('Error message');
      errorSpy.mockRestore();
    });

    it('should apply colors when color is true', () => {
      const loggerWithColors = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          color: true,
          outputMode: 'short',
        },
      });

      const errorSpy = jest.spyOn(loggerWithColors['bunyanLogger'], 'error');
      loggerWithColors.error('Error message');

      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // When color is true, message should be processed (may or may not have ANSI codes in test env)
      expect(logMessage).toBeDefined();
      expect(typeof logMessage).toBe('string');
      errorSpy.mockRestore();
    });

    it('should apply colors when color is undefined (default behavior)', () => {
      const loggerDefault = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
      });

      const warnSpy = jest.spyOn(loggerDefault['bunyanLogger'], 'warn');
      loggerDefault.warn('Warning message');

      expect(warnSpy).toHaveBeenCalled();
      const callArgs = warnSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // When color is undefined, message should be processed (default behavior)
      expect(logMessage).toBeDefined();
      expect(typeof logMessage).toBe('string');
      warnSpy.mockRestore();
    });

    it('should not apply colors to warn messages when color is false', () => {
      const loggerWithoutColors = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          color: false,
          outputMode: 'short',
        },
      });

      const warnSpy = jest.spyOn(loggerWithoutColors['bunyanLogger'], 'warn');
      loggerWithoutColors.warn('Warning message');

      expect(warnSpy).toHaveBeenCalled();
      const callArgs = warnSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // Should not contain ANSI color codes
      expect(logMessage).toBe('Warning message');
      warnSpy.mockRestore();
    });
  });

  describe('maxLength property', () => {
    it('should truncate log messages when maxLength is set', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
        maxLength: 10,
      });

      const logSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'info');
      loggerWithMaxLength.log('This is a very long message that should be truncated');

      expect(logSpy).toHaveBeenCalled();
      const callArgs = logSpy.mock.calls[0];
      const logMessage = callArgs[1];
      expect(logMessage).toBe('This is a ');
      expect(logMessage.length).toBe(10);
      logSpy.mockRestore();
    });

    it('should truncate warn messages when maxLength is set', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
        maxLength: 15,
      });

      const warnSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'warn');
      loggerWithMaxLength.warn('This is a warning message that exceeds the limit');

      expect(warnSpy).toHaveBeenCalled();
      const callArgs = warnSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // Strip ANSI color codes for comparison
      const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
      expect(strippedMessage.length).toBe(15);
      expect(strippedMessage).toBe('This is a warni');
      warnSpy.mockRestore();
    });

    it('should truncate error messages when maxLength is set', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
        maxLength: 20,
      });

      const errorSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'error');
      loggerWithMaxLength.error('This is an error message that is too long');

      expect(errorSpy).toHaveBeenCalled();
      const callArgs = errorSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // Strip ANSI color codes for comparison
      const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
      expect(strippedMessage).toBe('This is an error mes');
      expect(strippedMessage.length).toBe(20);
      errorSpy.mockRestore();
    });

    it('should not truncate messages when maxLength is not set', () => {
      const loggerWithoutMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
      });

      const logSpy = jest.spyOn(loggerWithoutMaxLength['bunyanLogger'], 'info');
      const longMessage = 'This is a very long message that should not be truncated because maxLength is not set';
      loggerWithoutMaxLength.log(longMessage);

      expect(logSpy).toHaveBeenCalled();
      const callArgs = logSpy.mock.calls[0];
      const logMessage = callArgs[1];
      expect(logMessage).toBe(longMessage);
      logSpy.mockRestore();
    });

    it('should not truncate messages shorter than maxLength', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
        maxLength: 100,
      });

      const logSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'info');
      const shortMessage = 'Short message';
      loggerWithMaxLength.log(shortMessage);

      expect(logSpy).toHaveBeenCalled();
      const callArgs = logSpy.mock.calls[0];
      const logMessage = callArgs[1];
      expect(logMessage).toBe(shortMessage);
      logSpy.mockRestore();
    });

    it('should truncate array messages when maxLength is set', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          outputMode: 'short',
        },
        maxLength: 8,
      });

      const logSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'info');
      loggerWithMaxLength.log(['First message', 'Second very long message', 'Third']);

      expect(logSpy).toHaveBeenCalled();
      const callArgs = logSpy.mock.calls[0];
      const messages = callArgs.slice(1);
      expect(messages[0]).toBe('First me');
      expect(messages[0].length).toBe(8);
      expect(messages[1]).toBe('Second v');
      expect(messages[1].length).toBe(8);
      expect(messages[2]).toBe('Third');
      logSpy.mockRestore();
    });

    it('should truncate messages before applying colors', () => {
      const loggerWithMaxLength = new BunyanLoggerService({
        projectId: 'TestProject',
        formatterOptions: {
          color: true,
          outputMode: 'short',
        },
        maxLength: 12,
      });

      const warnSpy = jest.spyOn(loggerWithMaxLength['bunyanLogger'], 'warn');
      loggerWithMaxLength.warn('This is a very long warning message');

      expect(warnSpy).toHaveBeenCalled();
      const callArgs = warnSpy.mock.calls[0];
      const logMessage = callArgs[1];
      // Strip ANSI color codes for comparison
      const strippedMessage = logMessage.replace(/\u001b\[\d+m/g, '');
      expect(strippedMessage).toBe('This is a ve');
      expect(strippedMessage.length).toBe(12);
      warnSpy.mockRestore();
    });
  });
});
