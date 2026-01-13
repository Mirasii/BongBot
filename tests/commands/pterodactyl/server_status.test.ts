import { jest } from '@jest/globals';
import type { ChatInputCommandInteraction, Message, ButtonInteraction, StringSelectMenuInteraction } from 'discord.js';
import { testCommandStructure, createMockInteraction } from '../../utils/commandTestUtils.js';

// Setup MSW for mocking fetch
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Setup MSW server FIRST before any imports
const testServerUrl = 'https://panel.example.com';
const testApiKey = 'test-api-key';

const handlers = [
    http.get(`${testServerUrl}/api/client`, () => {
        return HttpResponse.json({
            data: [
                {
                    attributes: {
                        identifier: 'server-123',
                        name: 'Test Server 1',
                        description: 'Test description',
                    },
                },
            ],
        });
    }),
    http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
        return HttpResponse.json({
            attributes: {
                current_state: 'running',
                resources: {
                    memory_bytes: 1073741824, // 1GB in bytes
                    cpu_absolute: 50.5,
                    disk_bytes: 2147483648, // 2GB in bytes
                    uptime: 3600000, // 1 hour in ms
                },
            },
        });
    }),
    http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
        return HttpResponse.json({ success: true });
    }),
];

const server = setupServer(...handlers);

// Start the server before importing modules
server.listen({ onUnhandledRequest: 'bypass' });

// Mock Database
const mockGetServersByUserId = jest.fn();
const mockGetServerById = jest.fn();
const mockDbClose = jest.fn();

const MockDatabase = jest.fn().mockImplementation(() => ({
    getServersByUserId: mockGetServersByUserId,
    getServerById: mockGetServerById,
    close: mockDbClose,
    addServer: jest.fn(),
}));

jest.unstable_mockModule('../../../src/helpers/database.js', () => ({
    default: MockDatabase,
}));

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking and MSW setup
const { execute: serverStatusExecute, setupCollector } = await import('../../../src/commands/pterodactyl/server_status.js');

describe('server_status command', () => {
    let mockInteraction: any;

    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        server.close();
        jest.useRealTimers();
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset handlers to default state for each test
        server.resetHandlers(...handlers);

        // Suppress console.error and console.warn during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        jest.spyOn(console, 'log').mockImplementation(() => {});

        // Setup mock interaction
        const baseInteraction = createMockInteraction({
            commandName: 'server_status',
        });

        mockInteraction = {
            ...baseInteraction,
            user: {
                ...baseInteraction.user,
                id: 'test-user-123',
            },
            options: {
                getString: jest.fn((key: string) => null),
            },
        };

        // Default mock implementations
        mockGetServersByUserId.mockReturnValue([
            {
                id: 1,
                userId: 'test-user-123',
                serverName: 'My Server',
                serverUrl: testServerUrl,
                apiKey: testApiKey,
            },
        ]);

        mockGetServerById.mockReturnValue({
            id: 1,
            userId: 'test-user-123',
            serverName: 'My Server',
            serverUrl: testServerUrl,
            apiKey: testApiKey,
        });

        mockBuildError.mockResolvedValue({
            embeds: [],
            files: [],
            flags: 64,
            isError: true,
        });
    });

    describe('command methods', () => {
        it('should have a setupCollector method', () => {
            expect(setupCollector).toBeInstanceOf(Function);
        });
    });

    describe('execute method - single server users', () => {
        it('should return error if user has no registered servers', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            await serverStatusExecute(mockInteraction);

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('no registered servers')
                })
            );
        });

        it('should return error if servers is null', async () => {
            mockGetServersByUserId.mockReturnValue(null);

            await serverStatusExecute(mockInteraction);

            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('no registered servers')
                })
            );
        });

        it('should fetch and display server status for single server user', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(result.embeds).toBeDefined();
            expect(result.embeds.length).toBe(1);

            const embed = result.embeds[0];
            expect(embed.data.title).toBe('🎮 Game Server Status');
            expect(embed.data.fields).toBeDefined();
            expect(embed.data.fields.length).toBeGreaterThan(0);
        });

        it('should include control components in response', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });
    });

    describe('execute method - multiple server users', () => {
        beforeEach(() => {
            mockGetServersByUserId.mockReturnValue([
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'Server 1',
                    serverUrl: testServerUrl,
                    apiKey: testApiKey,
                },
                {
                    id: 2,
                    userId: 'test-user-123',
                    serverName: 'Server 2',
                    serverUrl: testServerUrl,
                    apiKey: testApiKey,
                },
            ]);
        });

        it('should require server_name parameter when user has multiple servers', async () => {
            mockInteraction.options.getString.mockReturnValue(null);

            await serverStatusExecute(mockInteraction);

            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringMatching(/multiple.*servers.*registered/)
                })
            );
        });

        it('should work with server_name parameter', async () => {
            mockInteraction.options.getString.mockReturnValue('Server 1');

            const result: any = await serverStatusExecute(mockInteraction);

            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(result.embeds).toBeDefined();
            expect(result.embeds[0].data.fields.length).toBeGreaterThan(0);
        });

        it('should return error for invalid server_name', async () => {
            mockInteraction.options.getString.mockReturnValue('Invalid Server');

            await serverStatusExecute(mockInteraction);

            expect(mockDbClose).toHaveBeenCalledTimes(1);
            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('No server found')
                })
            );
        });
    });

    describe('server state display', () => {
        it('should display running server with resource info', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('running');
            expect(fieldValue).toContain('Memory');
            expect(fieldValue).toContain('CPU');
            expect(fieldValue).toContain('Uptime');
        });

        it('should display offline server without resource info', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'offline',
                            resources: {
                                memory_bytes: 0,
                                cpu_absolute: 0,
                                disk_bytes: 0,
                                uptime: 0,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('offline');
            expect(fieldValue).not.toContain('Memory');
        });

        it('should handle unknown server state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.error();
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('unknown');
        });
    });

    describe('error handling', () => {
        it('should handle database error before closing', async () => {
            mockGetServersByUserId.mockImplementation(() => {
                throw new Error('Database error');
            });

            await serverStatusExecute(mockInteraction);

            // Database should NOT be closed if error happens before db.close()
            expect(mockDbClose).toHaveBeenCalledTimes(0);
            expect(mockBuildError).toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.error();
                })
            );

            await serverStatusExecute(mockInteraction);

            expect(mockBuildError).toHaveBeenCalled();
        });

        it('should handle empty server list', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ data: [] });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            expect(result.embeds).toBeDefined();
            const fields = result.embeds[0].data.fields;
            expect(fields === undefined || fields.length === 0).toBe(true);
        });
    });

    describe('helper functions - formatting', () => {
        it('should format bytes correctly', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            // 1073741824 bytes = 1024 MB
            expect(fieldValue).toContain('1024');
        });

        it('should format CPU percentage correctly', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('50.5');
        });

        it('should format uptime in hours and minutes', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 1073741824,
                                cpu_absolute: 50.5,
                                disk_bytes: 2147483648,
                                uptime: 7260000, // 121 minutes = 2h 1m
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toMatch(/2h.*1m/);
        });
    });

    describe('status emojis', () => {
        it('should show green circle for running state', async () => {
            const result: any = await serverStatusExecute(mockInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🟢');
        });

        it('should show red circle for offline state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'offline',
                            resources: {
                                memory_bytes: 0,
                                cpu_absolute: 0,
                                disk_bytes: 0,
                                uptime: 0,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🔴');
        });

        it('should show yellow circle for starting state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'starting',
                            resources: {
                                memory_bytes: 0,
                                cpu_absolute: 0,
                                disk_bytes: 0,
                                uptime: 0,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🟡');
        });
    });

    describe('setupCollector method', () => {
        let mockMessage: any;
        let collectorCallbacks: any;

        beforeEach(() => {
            collectorCallbacks = {};
            mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                ],
                edit: jest.fn().mockResolvedValue(undefined),
            };
        });

        it('should setup a collector with correct timeout', () => {
            setupCollector(mockInteraction, mockMessage);

            expect(mockMessage.createMessageComponentCollector).toHaveBeenCalledWith({
                time: 600000,
            });
        });

        it('should reject interactions from different users', async () => {
            setupCollector(mockInteraction, mockMessage);

            const mockComponentInteraction = {
                user: { id: 'different-user' },
                reply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockComponentInteraction);

            expect(mockComponentInteraction.reply).toHaveBeenCalledWith({
                content: '❌ You cannot control servers for another user.',
                ephemeral: true,
            });
        });

        it('should handle button interaction with stop action', async () => {
            setupCollector(mockInteraction, mockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.deferUpdate).toHaveBeenCalled();
            expect(mockButtonInteraction.followUp).toHaveBeenCalled();
        });

        it('should handle select menu interaction with start action', async () => {
            setupCollector(mockInteraction, mockMessage);

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => true,
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockSelectInteraction);

            expect(mockSelectInteraction.deferUpdate).toHaveBeenCalled();
            expect(mockSelectInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Starting'),
                })
            );
        });

        it('should handle restart action', async () => {
            setupCollector(mockInteraction, mockMessage);

            const mockInteraction2 = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:restart',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockInteraction2);

            expect(mockInteraction2.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Restarting'),
                })
            );
        });

        it('should handle stop all action', async () => {
            setupCollector(mockInteraction, mockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:all:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Stopping all servers'),
                })
            );
        });

        it('should handle server command failure', async () => {
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            setupCollector(mockInteraction, mockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Failed to control server'),
                })
            );
        });

        it('should handle database server not found', async () => {
            mockGetServerById.mockReturnValue(null);

            setupCollector(mockInteraction, mockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:999:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: '❌ Server configuration not found.',
                })
            );
        });

        it('should handle collector error gracefully', async () => {
            mockGetServerById.mockImplementation(() => {
                throw new Error('Database error');
            });

            setupCollector(mockInteraction, mockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('error occurred'),
                })
            );
        });

        it('should clear components when collector ends', () => {
            setupCollector(mockInteraction, mockMessage);

            collectorCallbacks['end']();

            expect(mockMessage.edit).toHaveBeenCalledWith({
                components: [],
            });
        });

        it('should handle message.edit rejection on collector end', async () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            const editError = new Error('Failed to edit');
            mockMessage.edit = jest.fn().mockRejectedValue(editError);

            setupCollector(mockInteraction, mockMessage);

            collectorCallbacks['end']();

            // Give promise time to reject using fake timers
            await jest.runAllTimersAsync();

            expect(consoleErrorSpy).toHaveBeenCalledWith('Error clearing components after collector end:', editError);
            consoleErrorSpy.mockRestore();
        });

        it('should handle unknown component type when disabling components', async () => {
            mockGetServerById.mockReturnValue({
                id: 1,
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: testServerUrl,
                apiKey: testApiKey,
            });

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                    {
                        components: [
                            {
                                type: 99, // Unknown/unsupported type
                                customId: 'unknown_component',
                            },
                        ],
                    },
                ],
                edit: jest.fn().mockResolvedValue(undefined),
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            // Should handle unknown component type gracefully
            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });
    });

    describe('use custom database from environment variable', () => {
        it('should use custom database path from env', async () => {
            const originalEnv = process.env.SERVER_DATABASE;
            process.env.SERVER_DATABASE = 'custom-db.db';

            await serverStatusExecute(mockInteraction);

            expect(MockDatabase).toHaveBeenCalledWith('custom-db.db');

            // Restore
            if (originalEnv) {
                process.env.SERVER_DATABASE = originalEnv;
            } else {
                delete process.env.SERVER_DATABASE;
            }
        });
    });

    describe('edge cases and error paths', () => {
        it('should handle fetchServers error when response not ok', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
                })
            );

            await serverStatusExecute(mockInteraction);

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringContaining('Failed to fetch servers')
                })
            );
        });

        it('should handle fetchServerResources returning null when response not ok', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return new HttpResponse(null, { status: 404 });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            expect(result.embeds).toBeDefined();
            expect(result.embeds[0].data.fields[0].value).toContain('unknown');
        });

        it('should handle sendServerCommand catch block', async () => {
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.error();
                })
            );

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                ],
                edit: jest.fn().mockResolvedValue(undefined),
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Failed to control server'),
                })
            );
        });

        it('should handle uptime less than 1 hour', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 1024000000,
                                cpu_absolute: 45.5,
                                disk_bytes: 5000000000,
                                uptime: 1800000, // 30 minutes
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('30m');
            expect(fieldValue).not.toContain('h');
        });

        it('should show stopping emoji for stopping state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'stopping',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 10.0,
                                disk_bytes: 1000000000,
                                uptime: 600000,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🟠');
        });

        it('should handle StringSelectMenu when disabling components', async () => {
            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 3, // StringSelect
                                customId: 'server_control:1:menu0',
                            },
                        ],
                    },
                ],
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle refreshStatus when dbServer is null', async () => {
            // First call for performAction, second call (in error handler) returns null
            mockGetServerById.mockReturnValueOnce({
                id: 1,
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: testServerUrl,
                apiKey: 'test-api-key',
            }).mockReturnValueOnce(null);

            // Make sendServerCommand fail to trigger the error path that calls refreshStatus
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.error();
                })
            );

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                ],
                edit: jest.fn().mockResolvedValue(undefined),
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            // Should complete without error even though refreshStatus returns early due to null dbServer
            expect(mockButtonInteraction.deferUpdate).toHaveBeenCalled();
            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Failed to control server'),
                })
            );
        });

        it('should poll until state changes with setInterval', async () => {
            let callCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    callCount++;
                    if (callCount < 3) {
                        return HttpResponse.json({
                            attributes: {
                                current_state: 'starting',
                                resources: {
                                    memory_bytes: 512000000,
                                    cpu_absolute: 10.0,
                                    disk_bytes: 1000000000,
                                    uptime: 0,
                                },
                            },
                        });
                    }
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 10.0,
                                disk_bytes: 1000000000,
                                uptime: 600000,
                            },
                        },
                    });
                })
            );

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                ],
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            const collectPromise = collectorCallbacks['collect'](mockButtonInteraction);

            // Fast-forward time to trigger interval callbacks
            // Need to advance by the interval time (500ms) multiple times
            await jest.advanceTimersByTimeAsync(500);
            await jest.advanceTimersByTimeAsync(500);
            await jest.advanceTimersByTimeAsync(500);

            await collectPromise;

            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should trigger setInterval callback when polling', async () => {
            let fetchCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    fetchCount++;
                    // First call returns starting, second call (from interval) also starting, third returns running
                    if (fetchCount < 3) {
                        return HttpResponse.json({
                            attributes: {
                                current_state: 'starting',
                                resources: {
                                    memory_bytes: 512000000,
                                    cpu_absolute: 10.0,
                                    disk_bytes: 1000000000,
                                    uptime: 0,
                                },
                            },
                        });
                    }
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 10.0,
                                disk_bytes: 1000000000,
                                uptime: 600000,
                            },
                        },
                    });
                })
            );

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2,
                                customId: 'server_control:1:server-123:stop',
                            },
                        ],
                    },
                ],
                edit: jest.fn().mockResolvedValue(undefined),
            };

            setupCollector(mockInteraction, testMockMessage);

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => false,
                customId: 'server_control:1:server-123:start',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            const collectPromise = collectorCallbacks['collect'](mockButtonInteraction);

            // Advance timers to trigger setInterval callback multiple times
            await jest.advanceTimersByTimeAsync(500); // First interval tick
            await jest.advanceTimersByTimeAsync(500); // Second interval tick
            await jest.advanceTimersByTimeAsync(500); // Third interval tick

            await collectPromise;

            // The interval callback should have run, making multiple fetches
            expect(fetchCount).toBeGreaterThanOrEqual(3);
        });
    });
});
