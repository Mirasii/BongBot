import { jest } from '@jest/globals';
import path from 'path';
import fs from 'fs';

// Mock better-sqlite3
const mockExec = jest.fn();
const mockPrepare = jest.fn();
const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();

const mockDatabase = jest.fn().mockImplementation(() => ({
    exec: mockExec,
    prepare: mockPrepare,
    close: mockClose,
}));

jest.unstable_mockModule('better-sqlite3', () => ({
    default: mockDatabase,
}));

// Import after mocking
const { default: Database } = await import('../../src/helpers/database.js');

describe('Database class', () => {
    let db: InstanceType<typeof Database>;
    const testDbPath = 'test-pterodactyl.db';

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup prepare to return chainable methods
        mockPrepare.mockReturnValue({
            run: mockRun,
            get: mockGet,
            all: mockAll,
        });

        // Default run result
        mockRun.mockReturnValue({
            lastInsertRowid: 1,
            changes: 1,
        });
    });

    afterEach(() => {
        if (db) {
            db.close();
        }
    });

    describe('constructor', () => {
        it('should create a database instance with correct path', () => {
            db = new Database(testDbPath);

            const expectedPath = path.join(process.cwd(), 'data', testDbPath);
            expect(mockDatabase).toHaveBeenCalledWith(expectedPath);
        });

        it('should call initialize and create table', () => {
            db = new Database(testDbPath);

            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('CREATE TABLE IF NOT EXISTS pterodactyl_servers')
            );
        });
    });

    describe('addServer', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should successfully add a new server', () => {
            mockGet.mockReturnValueOnce(undefined); // No existing server
            mockRun.mockReturnValueOnce({ lastInsertRowid: 42, changes: 1 });

            const server = {
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key',
            };

            const result = db.addServer(server);

            expect(mockPrepare).toHaveBeenCalledTimes(2); // Check + Insert
            expect(mockGet).toHaveBeenCalledWith(server.userId, server.serverUrl);
            expect(mockRun).toHaveBeenCalledWith(
                server.userId,
                server.serverName,
                server.serverUrl,
                server.apiKey
            );
            expect(result).toBe(42);
        });

        it('should throw error when server already exists', () => {
            mockGet.mockReturnValueOnce({ id: 1 }); // Existing server

            const server = {
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key',
            };

            expect(() => db.addServer(server)).toThrow(
                'This server is already registered for this user.'
            );
        });

        it('should handle different server URLs for same user', () => {
            mockGet.mockReturnValueOnce(undefined); // No existing server
            mockRun.mockReturnValueOnce({ lastInsertRowid: 5, changes: 1 });

            const server = {
                userId: 'user123',
                serverName: 'Another Server',
                serverUrl: 'https://another-panel.example.com',
                apiKey: 'another-api-key',
            };

            const result = db.addServer(server);

            expect(result).toBe(5);
        });
    });

    describe('getServerById', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should return a server by id', () => {
            const mockServer = {
                id: 1,
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key',
            };

            mockGet.mockReturnValueOnce(mockServer);

            const result = db.getServerById(1);

            expect(mockPrepare).toHaveBeenCalledWith(
                'SELECT * FROM pterodactyl_servers WHERE id = ?'
            );
            expect(mockGet).toHaveBeenCalledWith(1);
            expect(result).toEqual(mockServer);
        });

        it('should return undefined when server not found', () => {
            mockGet.mockReturnValueOnce(undefined);

            const result = db.getServerById(999);

            expect(result).toBeUndefined();
        });
    });

    describe('getServersByUserId', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should return all servers for a user', () => {
            const mockServers = [
                {
                    id: 1,
                    userId: 'user123',
                    serverName: 'Server 1',
                    serverUrl: 'https://panel1.example.com',
                    apiKey: 'key1',
                },
                {
                    id: 2,
                    userId: 'user123',
                    serverName: 'Server 2',
                    serverUrl: 'https://panel2.example.com',
                    apiKey: 'key2',
                },
            ];

            mockAll.mockReturnValueOnce(mockServers);

            const result = db.getServersByUserId('user123');

            expect(mockPrepare).toHaveBeenCalledWith(
                'SELECT * FROM pterodactyl_servers WHERE userId = ?'
            );
            expect(mockAll).toHaveBeenCalledWith('user123');
            expect(result).toEqual(mockServers);
        });

        it('should return empty array when user has no servers', () => {
            mockAll.mockReturnValueOnce([]);

            const result = db.getServersByUserId('user999');

            expect(result).toEqual([]);
        });
    });

    describe('close', () => {
        it('should close the database connection', () => {
            db = new Database(testDbPath);
            jest.clearAllMocks();

            db.close();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });
});
