import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';

// Mock Database
const mockAddServer = jest.fn();
const mockDbClose = jest.fn();

const MockDatabase = jest.fn().mockImplementation(() => ({
    addServer: mockAddServer,
    getServerById: jest.fn(),
    getServersByUserId: jest.fn(),
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
const registerModule = await import('../../../src/commands/pterodactyl/register_server.js');
const registerCommand = registerModule.default;

describe('register_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    // Use utility function for standard command structure tests
    testCommandStructure(registerCommand, 'register_server');

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock interaction using utility and override specific properties
        const baseInteraction = createMockInteraction({
            commandName: 'register_server',
        });

        mockInteraction = {
            ...baseInteraction,
            user: {
                ...baseInteraction.user,
                id: 'test-user-123', // Override with test-specific ID
            },
            options: {
                getString: jest.fn((key: string, required?: boolean) => {
                    const options: { [key: string]: string } = {
                        server_url: 'https://panel.example.com',
                        api_key: 'test-api-key-123',
                        server_name: 'My Test Server',
                    };
                    return options[key] || null;
                }),
            },
        } as any;

        mockClient = createMockClient() as any;

        // Default mock implementations
        mockAddServer.mockReturnValue(42);
        mockBuildError.mockReturnValue({
            content: 'Error occurred',
            ephemeral: true,
        });
    });

    describe('command options', () => {
        it('should have required options', () => {
            const commandData = registerCommand.data.toJSON();
            expect(commandData.options).toBeDefined();
            expect(commandData.options?.length).toBe(3);

            const optionNames = commandData.options?.map((opt: any) => opt.name);
            expect(optionNames).toContain('server_url');
            expect(optionNames).toContain('api_key');
            expect(optionNames).toContain('server_name');

            // Check all options are required
            commandData.options?.forEach((opt: any) => {
                expect(opt.required).toBe(true);
            });
        });

        it('should have fullDesc property', () => {
            expect(registerCommand.fullDesc).toBeDefined();
            expect(registerCommand.fullDesc.description).toBeTruthy();
        });
    });

    describe('execute method', () => {
        it('should successfully register a new server', async () => {
            mockAddServer.mockReturnValue(42);

            const result = await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(MockDatabase).toHaveBeenCalledWith('pterodactyl.db');
            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'My Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key-123',
            });
            expect(mockDbClose).toHaveBeenCalled();
            expect(result).toEqual({
                content: expect.stringContaining('Successfully registered server'),
                ephemeral: true,
            });
            expect(result.content).toContain('My Test Server');
        });

        it('should remove trailing slash from server URL', async () => {
            const getString = jest.fn((key: string, required?: boolean) => {
                const options: { [key: string]: string } = {
                    server_url: 'https://panel.example.com/',
                    api_key: 'test-api-key',
                    server_name: 'Test Server',
                };
                return options[key] || null;
            });

            mockInteraction.options = { getString } as any;
            mockAddServer.mockReturnValue(1);

            await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: 'https://panel.example.com',
                apiKey: 'test-api-key',
            });
        });

        it('should use custom database from environment variable', async () => {
            const originalEnv = process.env.SERVER_DATABASE;
            process.env.SERVER_DATABASE = 'custom-db.db';

            await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(MockDatabase).toHaveBeenCalledWith('custom-db.db');

            // Restore original env
            if (originalEnv) {
                process.env.SERVER_DATABASE = originalEnv;
            } else {
                delete process.env.SERVER_DATABASE;
            }
        });

        it('should handle database errors', async () => {
            const testError = new Error('Database connection failed');
            mockAddServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error occurred',
                ephemeral: true,
                isError: true,
            });

            const result = await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.isError).toBe(true);
        });

        it('should handle duplicate server error', async () => {
            const duplicateError = new Error(
                'This server is already registered for this user.'
            );
            mockAddServer.mockImplementation(() => {
                throw duplicateError;
            });

            await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, duplicateError);
        });

        it('should handle errors and call buildError', async () => {
            const testError = new Error('Test error');
            mockAddServer.mockImplementation(() => {
                throw testError;
            });

            mockBuildError.mockReturnValue({
                content: 'Error occurred',
                ephemeral: true,
                isError: true,
            });

            await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            // buildError should be called when error occurs
            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            // Note: Database close is not called in error case as db is scoped to try block
        });

        it('should extract all options from interaction correctly', async () => {
            const getString = jest.fn((key: string, required?: boolean) => {
                const map: { [key: string]: string } = {
                    server_url: 'https://custom-panel.com',
                    api_key: 'custom-key-xyz',
                    server_name: 'Custom Server Name',
                };
                return map[key] || null;
            });

            mockInteraction.options = { getString } as any;

            await registerCommand.execute(
                mockInteraction as ChatInputCommandInteraction,
                mockClient as Client
            );

            expect(getString).toHaveBeenCalledWith('server_url', true);
            expect(getString).toHaveBeenCalledWith('api_key', true);
            expect(getString).toHaveBeenCalledWith('server_name', true);

            expect(mockAddServer).toHaveBeenCalledWith({
                userId: 'test-user-123',
                serverName: 'Custom Server Name',
                serverUrl: 'https://custom-panel.com',
                apiKey: 'custom-key-xyz',
            });
        });
    });
});
