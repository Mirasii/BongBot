import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { setupMockCleanup } from '../utils/testSetup.js';

// Create mock functions for fs/promises with proper typing
const mockWriteFile = jest.fn<(path: string, data: string) => Promise<void>>().mockResolvedValue(undefined);
const mockAppendFile = jest.fn<(path: string, data: string) => Promise<void>>().mockResolvedValue(undefined);
const mockMkdir = jest.fn<(path: string) => Promise<void>>().mockResolvedValue(undefined);

// Mock fs/promises module
jest.unstable_mockModule('fs/promises', () => ({
    default: {
        writeFile: mockWriteFile,
        appendFile: mockAppendFile,
        mkdir: mockMkdir
    }
}));

// Import after mocks are set up
const logging = await import('../../src/helpers/logging.js');

// Setup standard mock cleanup
setupMockCleanup();

describe('logging helper', () => {
    let mockConsoleLog: jest.SpiedFunction<typeof console.log>;
    let mockConsoleError: jest.SpiedFunction<typeof console.error>;

    beforeEach(() => {
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
        mockWriteFile.mockClear();
        mockAppendFile.mockClear();
        mockMkdir.mockClear();
        process.env.DISCORD_CHANNEL_ID = 'test-channel';
    });

    describe('init', () => {
        test('initializes with session ID and creates log file', async () => {
            const sessionId = 'test-session';
            await logging.default.init(sessionId);
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
            expect(mockWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                'Logger Initialised\n\n'
            );
        });

        test('initializes without session ID', async () => {
            await logging.default.init('');
            expect(mockConsoleLog).toHaveBeenCalledWith('Logger Initialised');
        });

        test('throws error when writeFile fails', async () => {
            const mockError = new Error('writeFile failed');
            mockWriteFile.mockRejectedValueOnce(mockError);

            const sessionId = 'test-session';
            await expect(logging.default.init(sessionId)).rejects.toThrow('writeFile failed');
        });
    });

    describe('log', () => {
        beforeEach(async () => {
            mockWriteFile.mockResolvedValue(undefined);
            await logging.default.init('test-session'); // Initialize with test session before each test
        });

        test('logs error objects with stack traces', async () => {
            const error = new Error('Test Error');
            await logging.default.log(error);
            expect(mockAppendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining(error.stack || '')
            );
        });

        test('logs error strings', async () => {
            const message = 'Test message';
            await logging.default.log(message);
            expect(mockAppendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining(message)
            );
        });

        test('handles undefined/null errors', async () => {
            await logging.default.log('undefined error');
            expect(mockAppendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('undefined error')
            );
        });

        test('handles non-error objects', async () => {
            await logging.default.log('[object Object]');
            expect(mockAppendFile).toHaveBeenCalledWith(
                expect.stringContaining('test-session.log'),
                expect.stringContaining('[object Object]')
            );
        });

        test('handles logging when logFile not initialized', async () => {
            // Import a fresh instance to clear the logFile variable
            const freshLogging = await import('../../src/helpers/logging.js?t=' + Date.now());
            
            const message = 'Test without init';
            await freshLogging.default.log(message);
            
            expect(mockConsoleError).toHaveBeenCalledWith('Log file not initialized');
            expect(mockAppendFile).not.toHaveBeenCalled();
        });

        test('logs error to console when appendFile fails', async () => {
            const mockError = new Error('appendFile failed');
            mockAppendFile.mockRejectedValueOnce(mockError);

            const message = 'Test error';
            await logging.default.log(message);
            expect(mockConsoleError).toHaveBeenCalledWith('Failed to append to log file:', mockError);
        });
    });
});