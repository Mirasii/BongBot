import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';

// Mock Database
const mockUpdateServer = jest.fn();
const mockDbClose = jest.fn();

const MockDatabase = jest.fn().mockImplementation(() => ({
    updateServer: mockUpdateServer,
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
const { execute: updateServerExecute } = await import('../../../src/commands/pterodactyl/update_server.js');


describe('update_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = createMockInteraction({
            commandName: 'update_server',
            options: {
                getString: jest.fn((name: string, required?: boolean) => {
                    if (name === 'server_name') return 'Test Server';
                    if (name === 'server_url') return 'https://new-panel.example.com';
                    if (name === 'api_key') return null;
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
        it('should update server URL', async () => {
            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(MockDatabase).toHaveBeenCalledWith('pterodactyl.db');
            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: 'https://new-panel.example.com',
            });
            expect(mockDbClose).toHaveBeenCalled();
            expect(result.content).toContain('Successfully updated **Test Server**!');
            expect(result.content).toContain('URL');
        });

        it('should update API key', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return null;
                if (name === 'api_key') return 'new-api-key-123';
                return null;
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('API key');
        });

        it('should update both URL and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return 'https://new-panel.example.com';
                if (name === 'api_key') return 'new-api-key-123';
                return null;
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: 'https://new-panel.example.com',
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('URL');
            expect(result.content).toContain('API key');
        });

        it('should trim server name, URL, and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return '  Test Server  ';
                if (name === 'server_url') return '  https://new-panel.example.com  ';
                if (name === 'api_key') return '  new-api-key-123  ';
                return null;
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: 'https://new-panel.example.com',
                apiKey: 'new-api-key-123',
            });
        });

        it('should handle error when no fields provided', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                return null;
            });

            const testError = new Error('No fields to update. Please provide at least one field (server_url or api_key).');
            mockUpdateServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error: No fields to update',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
        });

        it('should use custom database from environment variable', async () => {
            const originalEnv = process.env.SERVER_DATABASE;
            process.env.SERVER_DATABASE = 'custom-db.db';

            await updateServerExecute(
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

        it('should handle server not found error', async () => {
            const testError = new Error('Server "Test Server" not found for this user.');
            mockUpdateServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error: Server not found',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toContain('Error');
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database error');
            mockUpdateServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error updating server',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toBe('Error updating server');
        });
    });
});
