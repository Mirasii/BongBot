import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { testCommandStructure, createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';

// Mock Database
const mockDeleteServer = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    deleteServer: mockDeleteServer,
    close: mockDbClose,
};

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking
const { default: RemoveServer } = await import('../../../src/commands/pterodactyl/remove_server.js');

// Create instance with mock dependencies
const removeServerInstance = new RemoveServer(mockDb as any);
const removeServerExecute = removeServerInstance.execute.bind(removeServerInstance);


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
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
            expect(result).toEqual({
                content: 'Successfully removed server **Test Server**!',
                ephemeral: true,
            });
        });

        it('should trim server name before removing', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockReturnValue('  Test Server  ');

            await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
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
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toBe('Error removing server');
        });

        it('should use the injected database', async () => {
            await removeServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            // Verify the injected mock database was used
            expect(mockDeleteServer).toHaveBeenCalledWith('test-user-123', 'Test Server');
        });
    });
});
