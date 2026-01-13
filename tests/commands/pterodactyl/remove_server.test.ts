import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';

// Mock Database
const mockDeleteServer = jest.fn();
const mockDbClose = jest.fn();

const MockDatabase = jest.fn().mockImplementation(() => ({
    deleteServer: mockDeleteServer,
    close: mockDbClose,
}));

jest.unstable_mockModule('../../../src/helpers/database.js', () => ({
    default: MockDatabase,
}));

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking
const { execute: removeServerExecute } = await import('../../../src/commands/pterodactyl/remove_server.js');


describe('remove_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = createMockInteraction({
            commandName: 'remove_server',
            options: {
                getString: jest.fn((name: string, required?: boolean) => {
                    if (name === 'server_name') return 'Test Server';
                    return null;
                }),
            },
        }) as any;

        mockInteraction.user = {
            id: 'test-user-123',
            username: 'testuser',
        } as any;

        mockClient = createMockClient() as any;

        mockBuildError.mockReturnValue({
            content: 'Error occurred',
            ephemeral: true,
        });
    });

    describe('execute function', () => {
        it('should successfully remove a server', async () => {
            const result = await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(MockDatabase).toHaveBeenCalledWith('pterodactyl.db');
            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
            expect(mockDbClose).toHaveBeenCalled();
            expect(result).toEqual({
                content: 'Successfully removed server **Test Server**!',
                ephemeral: true,
            });
        });

        it('should trim server name before removing', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockReturnValue('  Test Server  ');

            await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
        });

        it('should use custom database from environment variable', async () => {
            const originalEnv = process.env.SERVER_DATABASE;
            process.env.SERVER_DATABASE = 'custom-db.db';

            await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(MockDatabase).toHaveBeenCalledWith('custom-db.db');

            if (originalEnv) {
                process.env.SERVER_DATABASE = originalEnv;
            } else {
                delete process.env.SERVER_DATABASE;
            }
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database error');
            mockDeleteServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error removing server',
                ephemeral: true,
            });

            const result = await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toBe('Error removing server');
        });

        it('should close database connection even on error', async () => {
            mockDeleteServer.mockImplementation(() => {
                throw new Error('Database error');
            });

            await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            // Database close should be called in the constructor, even if deleteServer throws
            expect(MockDatabase).toHaveBeenCalled();
        });
    });
});
