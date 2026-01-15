import { jest } from '@jest/globals';
import path from 'path';

import crypto from 'crypto';

// Set ENCRYPTION_KEY for tests (32 bytes = 64 hex chars)
process.env.ENCRYPTION_KEY = 'a'.repeat(64);

// Helper to encrypt API keys for mock data
function encryptApiKey(plaintext: string): string {
    const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

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
            expect(mockGet).toHaveBeenCalledWith(server.userId, server.serverUrl, server.serverName);
            // API key is now encrypted, so check first 3 args and that 4th is a string (encrypted)
            expect(mockRun).toHaveBeenCalledWith(
                server.userId,
                server.serverName,
                server.serverUrl,
                expect.any(String)
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
            const plainApiKey = 'test-api-key';
            const encryptedApiKey = encryptApiKey(plainApiKey);
            const mockServer = {
                id: 1,
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: encryptedApiKey,
            };

            mockGet.mockReturnValueOnce(mockServer);

            const result = db.getServerById(1);

            expect(mockPrepare).toHaveBeenCalledWith(
                'SELECT * FROM pterodactyl_servers WHERE id = ?'
            );
            expect(mockGet).toHaveBeenCalledWith(1);
            // API key should be decrypted
            expect(result).toEqual({
                ...mockServer,
                apiKey: plainApiKey,
            });
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
            const encryptedKey1 = encryptApiKey('key1');
            const encryptedKey2 = encryptApiKey('key2');
            const mockServers = [
                {
                    id: 1,
                    userId: 'user123',
                    serverName: 'Server 1',
                    serverUrl: 'https://panel1.example.com',
                    apiKey: encryptedKey1,
                },
                {
                    id: 2,
                    userId: 'user123',
                    serverName: 'Server 2',
                    serverUrl: 'https://panel2.example.com',
                    apiKey: encryptedKey2,
                },
            ];

            mockAll.mockReturnValueOnce(mockServers);

            const result = db.getServersByUserId('user123');

            expect(mockPrepare).toHaveBeenCalledWith(
                'SELECT * FROM pterodactyl_servers WHERE userId = ?'
            );
            expect(mockAll).toHaveBeenCalledWith('user123');
            // API keys should be decrypted
            expect(result).toEqual([
                { ...mockServers[0], apiKey: 'key1' },
                { ...mockServers[1], apiKey: 'key2' },
            ]);
        });

        it('should return empty array when user has no servers', () => {
            mockAll.mockReturnValueOnce([]);

            const result = db.getServersByUserId('user999');

            expect(result).toEqual([]);
        });
    });

    describe('updateServer', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should update server URL', () => {
            mockGet.mockReturnValueOnce({ id: 1 }); // Server exists

            db.updateServer('user123', 'Test Server', {
                serverUrl: 'https://new-panel.example.com',
            });

            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('SELECT id FROM pterodactyl_servers'));
            expect(mockGet).toHaveBeenCalledWith('user123', 'Test Server');
            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE pterodactyl_servers'));
            expect(mockRun).toHaveBeenCalledWith('https://new-panel.example.com', 'user123', 'Test Server');
        });

        it('should update API key', () => {
            mockGet.mockReturnValueOnce({ id: 1 }); // Server exists

            db.updateServer('user123', 'Test Server', {
                apiKey: 'new-api-key',
            });

            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE pterodactyl_servers'));
            // API key is now encrypted
            expect(mockRun).toHaveBeenCalledWith(expect.any(String), 'user123', 'Test Server');
        });

        it('should update both URL and API key', () => {
            mockGet.mockReturnValueOnce({ id: 1 }); // Server exists

            db.updateServer('user123', 'Test Server', {
                serverUrl: 'https://new-panel.example.com',
                apiKey: 'new-api-key',
            });

            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE pterodactyl_servers'));
            // API key is now encrypted, so check URL and user/server name, and any string for encrypted key
            expect(mockRun).toHaveBeenCalledWith('https://new-panel.example.com', expect.any(String), 'user123', 'Test Server');
        });

        it('should throw error when server not found', () => {
            mockGet.mockReturnValueOnce(undefined); // Server doesn't exist

            expect(() => {
                db.updateServer('user123', 'Test Server', {
                    serverUrl: 'https://new-panel.example.com',
                });
            }).toThrow('Server "Test Server" not found for this user.');
        });

        it('should throw error when no fields provided', () => {
            mockGet.mockReturnValueOnce({ id: 1 }); // Server exists

            expect(() => {
                db.updateServer('user123', 'Test Server', {});
            }).toThrow('No fields to update. Please provide at least one field (server_url or api_key).');
        });
    });

    describe('deleteServer', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should successfully delete a server', () => {
            db.deleteServer('user123', 'Test Server');

            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM pterodactyl_servers'));
            expect(mockRun).toHaveBeenCalledWith('user123', 'Test Server');
        });

        it('should handle deletion of non-existent server', () => {
            // Deletion doesn't throw error even if server doesn't exist
            db.deleteServer('user999', 'NonExistent Server');

            expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('DELETE FROM pterodactyl_servers'));
            expect(mockRun).toHaveBeenCalledWith('user999', 'NonExistent Server');
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

    describe('decryption error handling', () => {
        beforeEach(() => {
            db = new Database(testDbPath);
            jest.clearAllMocks();
        });

        it('should throw error for invalid ciphertext format (not 3 parts)', () => {
            // Return a server with invalid ciphertext (only 2 parts instead of 3)
            const invalidCiphertext = 'invalid:format';
            mockGet.mockReturnValueOnce({
                id: 1,
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: invalidCiphertext,
            });

            expect(() => db.getServerById(1)).toThrow('Invalid ciphertext format');
        });

        it('should throw error for ciphertext with 1 part', () => {
            mockGet.mockReturnValueOnce({
                id: 1,
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'onlyonepart',
            });

            expect(() => db.getServerById(1)).toThrow('Invalid ciphertext format');
        });

        it('should throw error for ciphertext with 4 parts', () => {
            mockGet.mockReturnValueOnce({
                id: 1,
                userId: 'user123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'part1:part2:part3:part4',
            });

            expect(() => db.getServerById(1)).toThrow('Invalid ciphertext format');
        });
    });
});
