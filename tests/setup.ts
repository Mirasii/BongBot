
import { server } from './mocks/server.js';
import { jest } from '@jest/globals';

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
