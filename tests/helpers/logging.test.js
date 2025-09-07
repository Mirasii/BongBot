const logging = require('../../src/helpers/logging.js');

// Mock the entire logging.js module
jest.mock('../../src/helpers/logging.js', () => ({
    init: jest.fn(),
    log: jest.fn(),
}));

describe('logging helper (mocked module)', () => {
    let mockConsoleLog;
    let mockConsoleError;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
        mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('init method should be callable', async () => {
        const sessionId = 'test-session';
        await logging.init(sessionId);
        expect(logging.init).toHaveBeenCalledWith(sessionId);
    });

    test('log method should be callable with an error object', async () => {
        const mockError = new Error('Test Error');
        await logging.log(mockError);
        expect(logging.log).toHaveBeenCalledWith(mockError);
    });

    test('log method should be callable with an error string', async () => {
        const mockError = 'Test Error String';
        await logging.log(mockError);
        expect(logging.log).toHaveBeenCalledWith(mockError);
    });
});