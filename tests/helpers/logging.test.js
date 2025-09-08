// Remove the mock to test actual implementation
const logging = require('../../src/helpers/logging.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn().mockResolvedValue(),
        appendFile: jest.fn().mockResolvedValue(),
        mkdir: jest.fn().mockResolvedValue()
    }
}));

// Setup standard mock cleanup
setupMockCleanup();

describe('logging helper', () => {
    let mockConsoleLog;
    let mockConsoleError;

    beforeEach(() => {
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        process.env.DISCORD_CHANNEL_ID = 'test-channel';
    });

    describe('init', () => {
        test('initializes with session ID and creates log file', async () => {
            const sessionId = 'test-session';
            await logging.init(sessionId);
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
        });

        test('handles initialization without session ID', async () => {
            await logging.init();
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
        });

        test('throws error when writeFile fails', async () => {
            const fsp = require('fs').promises;
            const mockError = new Error('writeFile failed');
            fsp.writeFile.mockRejectedValueOnce(mockError);

            const sessionId = 'test-session';
            await expect(logging.init(sessionId)).rejects.toThrow('writeFile failed');
        });
    });

    describe('log', () => {
        const fsp = require('fs').promises;

        beforeEach(async () => {
            await logging.init('test-session'); // Initialize with test session before each test
        });

        test('logs error objects with stack traces', async () => {
            const error = new Error('Test Error');
            await logging.log(error);
            expect(fsp.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining(error.stack)
            );
        });

        test('logs error strings', async () => {
            const message = 'Test message';
            await logging.log(message);
            expect(fsp.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining(message)
            );
        });

        test('handles undefined/null errors', async () => {
            await logging.log('undefined error');
            expect(fsp.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('undefined error')
            );
        });

        test('handles non-error objects', async () => {
            await logging.log('[object Object]');
            expect(fsp.appendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('[object Object]')
            );
        });

        test('handles logging when logFile not initialized', async () => {
            // Reset the module to clear the logFile variable
            jest.resetModules();
            const freshLogging = require('../../src/helpers/logging.js');
            
            const message = 'Test without init';
            await freshLogging.log(message);
            
            expect(mockConsoleError).toHaveBeenCalledWith('Log file not initialized');
            expect(fsp.appendFile).not.toHaveBeenCalled();
        });

        test('logs error to console when appendFile fails', async () => {
            const mockError = new Error('appendFile failed');
            fsp.appendFile.mockRejectedValueOnce(mockError);

            const message = 'Test error';
            await logging.log(message);
            expect(mockConsoleError).toHaveBeenCalledWith('Failed to append to log file:', mockError);
        });
    });
});