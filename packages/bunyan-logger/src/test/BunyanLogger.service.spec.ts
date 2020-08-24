import { BunyanLoggerService } from '../BunyanLogger.service';

describe('BunyanLoggerService', () => {
    let logger: BunyanLoggerService;
    beforeEach(() => {
        logger = new BunyanLoggerService({
            projectId: 'ProjectName',
            formatterOptions: {
                color: true,
                levelInString:true,
                outputMode: 'short',
                src:true,
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
        const key1Value = 'key1Value'
        const testObject = {
            key1: key1Value,
            key2: 'key2',
            key3:'key3',
        }
        logger.log(testObject);
    });

    it('should log object', () => {
        const key1Value = 'key1Value'
        const testObject = {
            key1: key1Value,
            key2: 'key2',
            key3:'key3',
        }
        logger.log(['test===',testObject]);
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
        }).toThrowError('projectId is required');
    });
});
