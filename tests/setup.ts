
import { server } from './mocks/server.js';
import { jest } from '@jest/globals';
import path from 'path';

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

// Global test mock for better-sqlite3 to avoid loading native bindings in Jest
const mockRun = jest.fn();
const mockPrepare = jest.fn(() => ({ run: mockRun }));
const mockDb = {
    prepare: mockPrepare,
    exec: jest.fn(),
    close: jest.fn()
};
jest.unstable_mockModule('better-sqlite3', () => ({
    default: jest.fn(() => mockDb)
}));

// Expose the sqlite mocks to tests so we can assert the logger wrote to the DB
// without having to re-mock better-sqlite3 inside each test file.
// Tests can access these at runtime via globalThis.__mockBetterSqliteRun etc.
// @ts-ignore
globalThis.__mockBetterSqliteRun = mockRun;
// @ts-ignore
globalThis.__mockBetterSqlitePrepare = mockPrepare;
// @ts-ignore
globalThis.__mockBetterSqliteDb = mockDb;

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(async () => {
    server.close();
    // Allow pending requests to complete before Jest exits
    await new Promise(resolve => setTimeout(resolve, 100));
});
