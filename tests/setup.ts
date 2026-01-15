
import { server } from './mocks/server.js';
import { jest } from '@jest/globals';

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(async () => {
    server.close();
    // Allow pending requests to complete before Jest exits
    await new Promise(resolve => setTimeout(resolve, 100));
});
