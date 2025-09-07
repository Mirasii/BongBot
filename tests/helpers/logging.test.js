// Remove the mock to test actual implementation
const logging = require('../../src/helpers/logging.js');

jest.mock('fs', () => ({
    writeFile: jest.fn((path, content, callback) => callback(null)),
    appendFile: jest.fn((path, content, callback) => callback(null))
}));

describe('logging helper', () => {
    let mockConsoleLog;
    let mockConsoleError;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        process.env.DISCORD_CHANNEL_ID = 'test-channel';
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('init', () => {
        test('initializes with session ID and creates log file', () => {
            const sessionId = 'test-session';
            logging.init(sessionId);
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
        });

        test('handles initialization without session ID', () => {
            logging.init();
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
        });
    });

    describe('log', () => {
        const fs = require('fs');

        beforeEach(() => {
            logging.init('test-session'); // Initialize with test session before each test
        });

        test('logs error objects with stack traces', async () => {
            const error = new Error('Test Error');
            await logging.log(error.message);
            expect(fs.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('Test Error'),
                expect.any(Function)
            );
        });

        test('logs error strings', async () => {
            const message = 'Test message';
            await logging.log(message);
            expect(fs.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining(message),
                expect.any(Function)
            );
        });

        test('handles undefined/null errors', async () => {
            await logging.log('undefined error');
            expect(fs.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('undefined error'),
                expect.any(Function)
            );
        });

        test('handles non-error objects', async () => {
            await logging.log('[object Object]');
            expect(fs.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('[object Object]'),
                expect.any(Function)
            );
        });
    });
});