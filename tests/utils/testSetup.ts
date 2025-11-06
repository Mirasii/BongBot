/**
 * @fileoverview MSW server setup utilities to eliminate duplication
 */
import { server } from '../mocks/server.js';
/**
 * Standard MSW setup for tests that use HTTP mocking
 * Should be called in describe block of tests that need MSW
 */
const setupMSWServer = () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());
};

/**
 * Standard mock cleanup for tests
 * Includes console mock cleanup and jest mock restoration
 */
const setupMockCleanup = () => {
    beforeEach(() => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.clearAllMocks();
    });
};

/**
 * Combined setup for tests that need both MSW and mock cleanup
 */
const setupStandardTestEnvironment = () => {
    setupMSWServer();
    setupMockCleanup();
};

export {
    setupStandardTestEnvironment,
    setupMSWServer,
    setupMockCleanup,
    server
};
