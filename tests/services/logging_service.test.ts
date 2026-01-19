import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Logger } from '../../src/helpers/interfaces.js';

const mockDefaultLoggerInstance: Logger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    close: jest.fn(),
};

const mockFileLoggerInstance: Logger = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    close: jest.fn(),
};

const MockDefaultLogger = jest.fn(() => mockDefaultLoggerInstance);
const MockFileLogger = jest.fn(() => mockFileLoggerInstance);

jest.unstable_mockModule('../../src/loggers/default_logger.js', () => ({
    default: MockDefaultLogger,
}));

jest.unstable_mockModule('../../src/loggers/file_logger.js', () => ({
    default: MockFileLogger,
}));

describe('LoggingService', () => {
    let LOGGER: typeof import('../../src/services/logging_service.js').default;
    let originalDefaultLogger: string | undefined;

    beforeEach(async () => {
        jest.clearAllMocks();
        originalDefaultLogger = process.env.DEFAULT_LOGGER;
        delete process.env.DEFAULT_LOGGER;

        jest.resetModules();

        const module = await import('../../src/services/logging_service.js');
        LOGGER = module.default;
    });

    afterEach(() => {
        if (originalDefaultLogger) {
            process.env.DEFAULT_LOGGER = originalDefaultLogger;
        } else {
            delete process.env.DEFAULT_LOGGER;
        }
    });

    describe('default getter', () => {
        it('should return the default logger when DEFAULT_LOGGER is not set', () => {
            const logger = LOGGER.default;
            expect(logger).toBe(mockDefaultLoggerInstance);
        });

        it('should return the file logger when DEFAULT_LOGGER is set to "file"', async () => {
            process.env.DEFAULT_LOGGER = 'file';
            jest.resetModules();
            const module = await import('../../src/services/logging_service.js');
            const logger = module.default.default;
            expect(logger).toBe(mockFileLoggerInstance);
        });

        it('should return the same logger instance on subsequent calls', () => {
            const logger1 = LOGGER.default;
            const logger2 = LOGGER.default;
            expect(logger1).toBe(logger2);
            expect(MockDefaultLogger).toHaveBeenCalledTimes(1);
        });
    });

    describe('log method', () => {
        it('should call error method when passed an Error instance', async () => {
            const testError = new Error('Test error message');
            await LOGGER.log(testError);
            expect(mockDefaultLoggerInstance.error).toHaveBeenCalledWith(testError);
        });

        it('should call debug method when passed a string', async () => {
            await LOGGER.log('Test debug message');
            expect(mockDefaultLoggerInstance.debug).toHaveBeenCalledWith('Test debug message');
        });

        it('should stringify and call debug method when passed an object', async () => {
            const testObj = { key: 'value', num: 123 };
            await LOGGER.log(testObj);
            expect(mockDefaultLoggerInstance.debug).toHaveBeenCalledWith(JSON.stringify(testObj));
        });

        it('should stringify and call debug method when passed an array', async () => {
            const testArray = [1, 2, 3];
            await LOGGER.log(testArray);
            expect(mockDefaultLoggerInstance.debug).toHaveBeenCalledWith(JSON.stringify(testArray));
        });

        it('should stringify and call debug method when passed a number', async () => {
            await LOGGER.log(42);
            expect(mockDefaultLoggerInstance.debug).toHaveBeenCalledWith('42');
        });
    });

    describe('LoggerService singleton', () => {
        it('should reuse existing file logger connection', async () => {
            process.env.DEFAULT_LOGGER = 'file';
            jest.resetModules();
            const module = await import('../../src/services/logging_service.js');
            const logger1 = module.default.default;
            const logger2 = module.default.default;
            expect(logger1).toBe(logger2);
        });

        it('should create separate instances for default and file loggers', async () => {
            jest.resetModules();
            const module = await import('../../src/services/logging_service.js');

            delete process.env.DEFAULT_LOGGER;
            const defaultLogger = module.default.default;

            process.env.DEFAULT_LOGGER = 'file';
            const fileLogger = module.default.default;

            expect(defaultLogger).not.toBe(fileLogger);
        });
    });
});
