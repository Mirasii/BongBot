import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';

// Mock Database
const mockGetServersByUserId = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    addServer: jest.fn(),
    getServerById: jest.fn(),
    getServersByUserId: mockGetServersByUserId,
    close: mockDbClose,
};

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking
const { default: ListServers } = await import('../../../src/commands/pterodactyl/list_servers.js');

// Create instance with mock dependencies
const listServersInstance = new ListServers(mockDb as any);
const listServersExecute = listServersInstance.execute.bind(listServersInstance);

describe('list_servers command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock interaction using utility
        mockInteraction = createMockInteraction({
            commandName: 'list_servers',
        }) as any;

        mockInteraction.user = {
            id: 'test-user-123',
            username: 'testuser',
        } as any;

        mockClient = createMockClient() as any;

        // Default mock implementations
        mockBuildError.mockReturnValue({
            content: 'Error occurred',
            ephemeral: true,
        });
    });

    describe('execute function', () => {
        it('should successfully list servers when user has servers', async () => {
            const mockServers = [
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'Server 1',
                    serverUrl: 'https://panel1.example.com',
                    apiKey: 'key1',
                },
                {
                    id: 2,
                    userId: 'test-user-123',
                    serverName: 'Server 2',
                    serverUrl: 'https://panel2.example.com',
                    apiKey: 'key2',
                },
            ];

            mockGetServersByUserId.mockReturnValue(mockServers);

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(result).toHaveProperty('embeds');
            expect(result.embeds).toHaveLength(1);
            expect(result.embeds[0].data.title).toBe('🎮 Registered Servers');
            expect(result.embeds[0].data.color).toBe(0x0099ff);
            expect(result.embeds[0].data.fields).toHaveLength(2);
            expect(result.embeds[0].data.fields![0].name).toBe('Server 1');
            expect(result.embeds[0].data.fields![0].value).toBe('URL: https://panel1.example.com');
            expect(result.embeds[0].data.fields![1].name).toBe('Server 2');
            expect(result.embeds[0].data.fields![1].value).toBe('URL: https://panel2.example.com');
        });

        it('should handle no registered servers', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(result).toHaveProperty('embeds');
            expect(result.embeds).toHaveLength(1);
            expect(result.embeds[0].data.title).toBe('🎮 Registered Servers');
            expect(result.embeds[0].data.description).toBe('You have no registered servers.');
            expect(result.embeds[0].data.fields).toBeUndefined();
        });

        it('should handle a single server', async () => {
            const mockServers = [
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'My Server',
                    serverUrl: 'https://panel.example.com',
                    apiKey: 'api-key-123',
                },
            ];

            mockGetServersByUserId.mockReturnValue(mockServers);

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(result).toHaveProperty('embeds');
            expect(result.embeds[0].data.fields).toHaveLength(1);
            expect(result.embeds[0].data.fields![0].name).toBe('My Server');
            expect(result.embeds[0].data.fields![0].value).toBe('URL: https://panel.example.com');
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database connection failed');
            mockGetServersByUserId.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error occurred',
                ephemeral: true,
                isError: true,
            });

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect((result as any).isError).toBe(true);
        });

        it('should handle multiple servers with various names and URLs', async () => {
            const mockServers = [
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'Production Server',
                    serverUrl: 'https://prod.example.com',
                    apiKey: 'key1',
                },
                {
                    id: 2,
                    userId: 'test-user-123',
                    serverName: 'Development Server',
                    serverUrl: 'https://dev.example.com',
                    apiKey: 'key2',
                },
                {
                    id: 3,
                    userId: 'test-user-123',
                    serverName: 'Test Server',
                    serverUrl: 'https://test.example.com',
                    apiKey: 'key3',
                },
            ];

            mockGetServersByUserId.mockReturnValue(mockServers);

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(result.embeds[0].data.fields).toHaveLength(3);
            expect(result.embeds[0].data.fields![0].name).toBe('Production Server');
            expect(result.embeds[0].data.fields![1].name).toBe('Development Server');
            expect(result.embeds[0].data.fields![2].name).toBe('Test Server');
        });

        it('should include timestamp in embed', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            const result = await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(result.embeds[0].data.timestamp).toBeDefined();
        });

        it('should pass correct user ID to database query', async () => {
            mockInteraction.user = {
                id: 'different-user-456',
                username: 'differentuser',
            } as any;

            mockGetServersByUserId.mockReturnValue([]);

            await listServersExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockGetServersByUserId).toHaveBeenCalledWith('different-user-456');
        });
    });
});
