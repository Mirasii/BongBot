import { jest } from '@jest/globals';

// Mock Database
const mockClose = jest.fn();
const MockDatabase = jest.fn().mockImplementation(() => ({
    close: mockClose,
    getServersByUserId: jest.fn(),
    getServerById: jest.fn(),
    addServer: jest.fn(),
    updateServer: jest.fn(),
    deleteServer: jest.fn(),
}));

jest.unstable_mockModule('../../src/helpers/database.js', () => ({
    default: MockDatabase,
}));

// We need to reset the singleton between tests
// Import after mocking
const { default: DatabasePool } = await import('../../src/services/databasePool.js');

describe('DatabasePool', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Reset the singleton by accessing the private instance
        // @ts-ignore - accessing private field for testing
        DatabasePool['instance'] = undefined;
    });

    describe('getInstance', () => {
        it('should return the same instance on multiple calls', () => {
            const instance1 = DatabasePool.getInstance();
            const instance2 = DatabasePool.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should create a new instance if none exists', () => {
            const instance = DatabasePool.getInstance();
            expect(instance).toBeDefined();
            expect(instance).toBeInstanceOf(DatabasePool);
        });
    });

    describe('getConnection', () => {
        it('should create a new database connection with default filename', () => {
            const pool = DatabasePool.getInstance();
            const connection = pool.getConnection();

            expect(MockDatabase).toHaveBeenCalledWith('pterodactyl.db');
            expect(connection).toBeDefined();
        });

        it('should create a new database connection with custom filename', () => {
            const pool = DatabasePool.getInstance();
            const connection = pool.getConnection('custom.db');

            expect(MockDatabase).toHaveBeenCalledWith('custom.db');
            expect(connection).toBeDefined();
        });

        it('should reuse existing connection for same filename', () => {
            const pool = DatabasePool.getInstance();
            const connection1 = pool.getConnection('test.db');
            const connection2 = pool.getConnection('test.db');

            expect(MockDatabase).toHaveBeenCalledTimes(1);
            expect(connection1).toBe(connection2);
        });

        it('should create separate connections for different filenames', () => {
            const pool = DatabasePool.getInstance();
            const connection1 = pool.getConnection('db1.db');
            const connection2 = pool.getConnection('db2.db');

            expect(MockDatabase).toHaveBeenCalledTimes(2);
            expect(connection1).not.toBe(connection2);
        });

        it('should use SERVER_DATABASE environment variable if set', () => {
            process.env.SERVER_DATABASE = 'env-db.db';
            const pool = DatabasePool.getInstance();
            const connection = pool.getConnection();

            expect(MockDatabase).toHaveBeenCalledWith('env-db.db');
            delete process.env.SERVER_DATABASE;
        });

        it('should prioritize SERVER_DATABASE env over custom filename', () => {
            process.env.SERVER_DATABASE = 'env-priority.db';
            const pool = DatabasePool.getInstance();
            const connection = pool.getConnection('ignored.db');

            expect(MockDatabase).toHaveBeenCalledWith('env-priority.db');
            delete process.env.SERVER_DATABASE;
        });
    });

    describe('closeAll', () => {
        it('should close all connections', () => {
            const pool = DatabasePool.getInstance();
            pool.getConnection('db1.db');
            pool.getConnection('db2.db');

            pool.closeAll();

            expect(mockClose).toHaveBeenCalledTimes(2);
        });

        it('should clear the connections map after closing', () => {
            const pool = DatabasePool.getInstance();
            pool.getConnection('test.db');

            pool.closeAll();

            // Getting a connection after closeAll should create a new one
            MockDatabase.mockClear();
            pool.getConnection('test.db');
            expect(MockDatabase).toHaveBeenCalledTimes(1);
        });

        it('should handle empty connections map', () => {
            const pool = DatabasePool.getInstance();

            // Should not throw
            expect(() => pool.closeAll()).not.toThrow();
            expect(mockClose).not.toHaveBeenCalled();
        });
    });
});
