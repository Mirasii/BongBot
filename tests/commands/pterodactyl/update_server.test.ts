import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Client } from 'discord.js';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { createMockInteraction, createMockClient } from '../../utils/commandTestUtils.js';
import mockDNSValues from '../../mocks/mockDNSValues.js';
// Mock DNS resolution to prevent SSRF issues during tests
mockDNSValues();

// Set allowed hosts to bypass DNS resolution in tests
process.env.PTERODACTYL_ALLOWED_HOSTS = 'new-panel.example.com,existing-panel.example.com';

// Setup MSW for mocking pterodactyl API calls
const testServerUrl = 'https://new-panel.example.com';
const existingServerUrl = 'https://existing-panel.example.com';

const handlers = [
    http.get(`${testServerUrl}/api/client`, () => {
        return HttpResponse.json({ data: [] });
    }),
    http.get(`${existingServerUrl}/api/client`, () => {
        return HttpResponse.json({ data: [] });
    }),
];

const server = setupServer(...handlers);

// Mock Database
const mockUpdateServer = jest.fn();
const mockGetServersByUserId = jest.fn();
const mockDbClose = jest.fn();

const mockDb = {
    updateServer: mockUpdateServer,
    getServersByUserId: mockGetServersByUserId,
    close: mockDbClose,
};

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking
const { default: UpdateServer } = await import('../../../src/commands/pterodactyl/update_server.js');
const { Caller } = await import('../../../src/helpers/caller.js');

// Create instance with mock dependencies
const caller = new Caller();
const updateServerInstance = new UpdateServer(mockDb as any, caller);
const updateServerExecute = updateServerInstance.execute.bind(updateServerInstance);


describe('update_server command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;
    let mockClient: Partial<Client>;

    beforeAll(() => {
        server.listen({ onUnhandledRequest: 'bypass' });
    });

    afterAll(() => {
        server.close();
    });

    afterEach(() => {
        server.resetHandlers(...handlers);
    });

    beforeEach(() => {
        jest.clearAllMocks();

        mockInteraction = createMockInteraction({
            commandName: 'update_server',
            options: {
                getString: jest.fn((name: string, required?: boolean) => {
                    if (name === 'server_name') return 'Test Server';
                    if (name === 'server_url') return testServerUrl;
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

        // Default mock - user has an existing server
        mockGetServersByUserId.mockReturnValue([
            {
                id: 1,
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: existingServerUrl,
                apiKey: 'existing-api-key',
            },
        ]);
    });

    describe('execute function', () => {
        it('should update server URL', async () => {
            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
            });
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
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('API key');
        });

        it('should update both URL and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return testServerUrl;
                if (name === 'api_key') return 'new-api-key-123';
                return null;
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
                apiKey: 'new-api-key-123',
            });
            expect(result.content).toContain('URL');
            expect(result.content).toContain('API key');
        });

        it('should trim server name, URL, and API key', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return '  Test Server  ';
                if (name === 'server_url') return `  ${testServerUrl}  `;
                if (name === 'api_key') return '  new-api-key-123  ';
                return null;
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
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
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
        });

        it('should handle server not found error', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            mockBuildError.mockReturnValue({
                content: 'Error: Server not found',
                ephemeral: true,
            });

            const result = await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('not found')
                })
            );
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
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(mockInteraction, testError);
            expect(result.content).toBe('Error updating server');
        });

        it('should handle pterodactyl API validation failure', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return new HttpResponse(null, { status: 401 });
                })
            );

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('Failed to connect to the Pterodactyl panel')
                })
            );
            expect(mockUpdateServer).not.toHaveBeenCalled();
        });

        it('should remove trailing slash from server URL', async () => {
            (mockInteraction.options!.getString as jest.Mock).mockImplementation((name: string) => {
                if (name === 'server_name') return 'Test Server';
                if (name === 'server_url') return `${testServerUrl}/`;
                if (name === 'api_key') return null;
                return null;
            });

            await updateServerExecute(
                mockInteraction as ChatInputCommandInteraction
            );

            expect(mockUpdateServer).toHaveBeenCalledWith('test-user-123', 'Test Server', {
                serverUrl: testServerUrl,
            });
        });
    });
});
