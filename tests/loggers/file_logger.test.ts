import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const mockFormattedDateTime = '1/15/2024 10:30:00 AM';

jest.unstable_mockModule('../../src/helpers/utilities.js', () => ({
    default: {
        getCurrentDateISO: jest.fn(() => '2024-01-15'),
        formatLocalDateTime: jest.fn(() => mockFormattedDateTime),
    },
}));

const mockAccessSync = jest.fn();
const mockWriteFileSync = jest.fn();
const mockAppendFileSync = jest.fn();

jest.unstable_mockModule('fs', () => ({
    default: {
        accessSync: mockAccessSync,
        writeFileSync: mockWriteFileSync,
        appendFileSync: mockAppendFileSync,
    },
    accessSync: mockAccessSync,
    writeFileSync: mockWriteFileSync,
    appendFileSync: mockAppendFileSync,
}));

describe('FileLogger', () => {
    let FileLogger: typeof import('../../src/loggers/file_logger.js').default;
    let originalSessionId: string | undefined;
    let consoleInfoSpy: jest.SpiedFunction<typeof console.info>;
    let consoleDebugSpy: jest.SpiedFunction<typeof console.debug>;
    let consoleErrorSpy: jest.SpiedFunction<typeof console.error>;

    beforeEach(async () => {
        jest.clearAllMocks();
        originalSessionId = process.env.SESSION_ID;
        process.env.SESSION_ID = 'test-session-id-456';

        mockAccessSync.mockReset();
        mockWriteFileSync.mockReset();
        mockAppendFileSync.mockReset();

        consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
        consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        jest.resetModules();
        const module = await import('../../src/loggers/file_logger.js');
        FileLogger = module.default;
    });

    afterEach(() => {
        if (originalSessionId) {
            process.env.SESSION_ID = originalSessionId;
        } else {
            delete process.env.SESSION_ID;
        }
        jest.restoreAllMocks();
    });

    describe('constructor', () => {
        it('should create log file if it does not exist', () => {
            mockAccessSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            new FileLogger();

            expect(mockWriteFileSync).toHaveBeenCalledWith(
                expect.stringContaining('test-session-id-456.log'),
                'Logger Initialised\n\n'
            );
        });

        it('should not create log file if it already exists', () => {
            mockAccessSync.mockReturnValue(undefined);

            new FileLogger();

            expect(mockWriteFileSync).not.toHaveBeenCalled();
        });
    });

    describe('info', () => {
        it('should append log entry with INFO level and print to console', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            logger.info('Test info message');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.stringContaining('test-session-id-456.log'),
                expect.stringContaining('[INFO] Test info message')
            );
            expect(consoleInfoSpy).toHaveBeenCalledWith(`${mockFormattedDateTime} | Test info message`);
        });

        it('should include stack trace when provided', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            logger.info('Test info message', 'Stack trace here');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.stringContaining('.log'),
                expect.stringContaining('Stack Trace: Stack trace here')
            );
        });

        it('should include formatted datetime in log entry', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            logger.info('Test message');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining(`[${mockFormattedDateTime}]`)
            );
        });
    });

    describe('debug', () => {
        it('should append log entry with DEBUG level and print to console', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            logger.debug('Test debug message');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.stringContaining('test-session-id-456.log'),
                expect.stringContaining('[DEBUG] Test debug message')
            );
            expect(consoleDebugSpy).toHaveBeenCalledWith(`${mockFormattedDateTime} | Test debug message`);
        });

        it('should include stack trace when provided', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            logger.debug('Debug message', 'Debug stack trace');

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('Stack Trace: Debug stack trace')
            );
        });
    });

    describe('error', () => {
        it('should append log entry with ERROR level and print to console', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            const testError = new Error('Test error message');
            testError.stack = 'Error stack trace';

            logger.error(testError);

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.stringContaining('test-session-id-456.log'),
                expect.stringContaining('[ERROR] Test error message')
            );
            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('Stack Trace: Error stack trace')
            );
            expect(consoleErrorSpy).toHaveBeenCalledWith(`${mockFormattedDateTime} | An Error Occurred - check logs for details.`);
        });

        it('should handle error without stack', () => {
            mockAccessSync.mockReturnValue(undefined);

            const logger = new FileLogger();
            const testError = new Error('Test error message');
            delete testError.stack;

            logger.error(testError);

            expect(mockAppendFileSync).toHaveBeenCalledWith(
                expect.any(String),
                expect.not.stringContaining('Stack Trace:')
            );
        });
    });

    describe('log failure handling', () => {
        it('should handle appendFileSync failure gracefully', () => {
            mockAccessSync.mockReturnValue(undefined);
            mockAppendFileSync.mockImplementation(() => {
                throw new Error('Write failed');
            });

            const logger = new FileLogger();
            logger.info('Test message');

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to append to log file:', expect.any(Error));
        });
    });
});
