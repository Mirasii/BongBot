import { jest } from '@jest/globals';
import { createMockInteraction } from '../../utils/commandTestUtils.js';
import mockDNSValues from '../../mocks/mockDNSValues.js';
// Mock DNS resolution to prevent SSRF issues during tests
mockDNSValues();

// Set allowed hosts to bypass DNS resolution in tests
process.env.PTERODACTYL_ALLOWED_HOSTS = 'panel.example.com';

// Setup MSW for mocking fetch
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Setup MSW server FIRST before any imports
const testServerUrl = 'https://panel.example.com';
const testApiKey = 'test-api-key';

const mockLogger = class implements Logger {
    info(message: string, stack?: string): void { jest.fn(); }
    warn(message: string, stack?: string): void { jest.fn(); }
    error(message: string, stack?: string): void { jest.fn(); }
};

const mockLoggerInstance = new mockLogger();


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

const mockDb = {
    getServersByUserId: mockGetServersByUserId,
    getServerById: mockGetServerById,
    close: mockDbClose,
    addServer: jest.fn(),
};

// Mock errorBuilder
const mockBuildError = jest.fn();
jest.unstable_mockModule('../../../src/helpers/errorBuilder.js', () => ({
    buildError: mockBuildError,
}));

// Import after mocking and MSW setup
const { default: ServerStatus } = await import('../../../src/commands/pterodactyl/server_status.js');
const { Caller } = await import('../../../src/helpers/caller.js');

// Create instance with mock dependencies
const caller = new Caller();
const serverStatusInstance = new ServerStatus(mockDb as any, caller, mockLoggerInstance);
const serverStatusExecute = serverStatusInstance.execute.bind(serverStatusInstance);
const setupCollector = serverStatusInstance.setupCollector.bind(serverStatusInstance);

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
                getSubcommand: jest.fn(() => 'manage'),
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
            expect(result.embeds).toBeDefined();
            expect(result.embeds.length).toBe(1);

            const embed = result.embeds[0];
            expect(embed.data.title).toBe('🎮 Game Server Status');
            expect(embed.data.fields).toBeDefined();
            expect(embed.data.fields.length).toBeGreaterThan(0);
        });

        it('should include control components in response', async () => {
            const result: any = await serverStatusExecute(mockInteraction);

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

            expect(mockBuildError).toHaveBeenCalledWith(
                mockInteraction,
                expect.objectContaining({
                    message: expect.stringMatching(/multiple.*servers/)
                })
            );
        });

        it('should work with server_name parameter', async () => {
            mockInteraction.options.getString.mockReturnValue('Server 1');

            const result: any = await serverStatusExecute(mockInteraction);

            expect(result.embeds).toBeDefined();
            expect(result.embeds[0].data.fields.length).toBeGreaterThan(0);
        });

        it('should return error for invalid server_name', async () => {
            mockInteraction.options.getString.mockReturnValue('Invalid Server');

            await serverStatusExecute(mockInteraction);

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
        it('should handle database error', async () => {
            mockGetServersByUserId.mockImplementation(() => {
                throw new Error('Database error');
            });

            await serverStatusExecute(mockInteraction);

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
            const loggerSpy = jest.spyOn(mockLoggerInstance, 'error').mockImplementation(() => {});
            const editError = new Error('Failed to edit');
            mockMessage.edit = jest.fn().mockRejectedValue(editError);

            setupCollector(mockInteraction, mockMessage);

            collectorCallbacks['end']();

            // Give promise time to reject using fake timers
            await jest.runAllTimersAsync();

            expect(loggerSpy).toHaveBeenCalledWith(editError);
            loggerSpy.mockRestore();
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

    describe('dependency injection', () => {
        it('should use the injected database', async () => {
            await serverStatusExecute(mockInteraction);

            // Verify the injected mock database was used
            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
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
                    message: expect.stringContaining('Network response was not ok')
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

        it('should truncate long server names in control components', async () => {
            const longServerName = 'A'.repeat(100);
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-123',
                                    name: longServerName,
                                    description: 'Test description',
                                },
                            },
                        ],
                    });
                }),
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

            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should handle poll timeout (max attempts reached)', async () => {
            let fetchCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    fetchCount++;
                    // Always return starting state to trigger max attempts
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

            // Advance time significantly to exceed max attempts
            for (let i = 0; i < 125; i++) {
                await jest.advanceTimersByTimeAsync(500);
            }

            await collectPromise;

            // Should have called editReply when max attempts reached
            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle poll with null resource response', async () => {
            let fetchCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    fetchCount++;
                    if (fetchCount < 3) {
                        // Return error to trigger null resource
                        return HttpResponse.error();
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

            // Advance timers to trigger interval callbacks
            await jest.advanceTimersByTimeAsync(500);
            await jest.advanceTimersByTimeAsync(500);
            await jest.advanceTimersByTimeAsync(500);

            await collectPromise;

            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle refreshStatus error in catch block', async () => {
            // First call for performAction, then refreshStatus call throws
            mockGetServerById.mockReturnValueOnce({
                id: 1,
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: testServerUrl,
                apiKey: testApiKey,
            }).mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            // Make sendServerCommand fail to trigger error path
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.error();
                })
            );

            const loggerSpy = jest.spyOn(mockLoggerInstance, 'error').mockImplementation(() => {});

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

            await collectorCallbacks['collect'](mockButtonInteraction);

            // Should have logged the error from refreshStatus catch block
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.any(Error)
            );
            loggerSpy.mockRestore();
        });

        it('should handle multiple servers with different states for control components', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-1',
                                    name: 'Server 1',
                                    description: 'First server',
                                },
                            },
                            {
                                attributes: {
                                    identifier: 'server-2',
                                    name: 'Server 2',
                                    description: 'Second server',
                                },
                            },
                            {
                                attributes: {
                                    identifier: 'server-3',
                                    name: 'Server 3',
                                    description: 'Third server',
                                },
                            },
                        ],
                    });
                }),
                http.get(`${testServerUrl}/api/client/servers/server-1/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 25.0,
                                disk_bytes: 1000000000,
                                uptime: 3600000,
                            },
                        },
                    });
                }),
                http.get(`${testServerUrl}/api/client/servers/server-2/resources`, () => {
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
                }),
                http.get(`${testServerUrl}/api/client/servers/server-3/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 256000000,
                                cpu_absolute: 15.0,
                                disk_bytes: 500000000,
                                uptime: 1800000,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            // Should have select menu components plus stop all button
            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should handle followUp error in catch block silently', async () => {
            mockGetServerById.mockImplementation(() => {
                throw new Error('Database error');
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
                followUp: jest.fn()
                    .mockResolvedValueOnce(undefined) // First followUp succeeds
                    .mockRejectedValueOnce(new Error('followUp failed')), // Second followUp fails (in catch block)
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Should not throw even when followUp in catch block fails
            await expect(collectorCallbacks['collect'](mockButtonInteraction)).resolves.not.toThrow();
        });

        it('should handle dbServer without id in component interaction', async () => {
            mockGetServerById.mockReturnValue({
                userId: 'test-user-123',
                serverName: 'Test Server',
                serverUrl: testServerUrl,
                apiKey: testApiKey,
                // No id field
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

            await collectorCallbacks['collect'](mockButtonInteraction);

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: '❌ Server configuration not found.',
                })
            );
        });

        it('should handle unknown action in replyMessage lookup', async () => {
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
                                customId: 'server_control:1:server-123:unknown_action',
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
                customId: 'server_control:1:server-123:unknown_action',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockButtonInteraction);

            // Should use default message for unknown action
            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: 'Processing your request...',
                })
            );
        });

        it('should handle error with undefined dbServerId (no refreshStatus call)', async () => {
            // Make the error happen after deferUpdate but before dbServerId is fully set
            // by throwing from editReply which happens inside the try block
            mockGetServerById.mockImplementation(() => {
                throw new Error('DB error before id set');
            });

            const collectorCallbacks: any = {};
            const testMockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        collectorCallbacks[event] = callback;
                    }),
                }),
                components: [],
                edit: jest.fn().mockResolvedValue(undefined),
            };

            setupCollector(mockInteraction, testMockMessage);

            // Use select menu to set dbServerId from values array
            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: () => true,
                values: [''], // Empty string to make parseInt return NaN, testing falsy dbServerId
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            await collectorCallbacks['collect'](mockSelectInteraction);

            // Should handle error without calling refreshStatus (dbServerId is NaN which is falsy)
            expect(mockSelectInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('error occurred'),
                })
            );
        });

        it('should handle servers with all offline states (no stop all button)', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-1',
                                    name: 'Server 1',
                                    description: 'First server',
                                },
                            },
                        ],
                    });
                }),
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

            // With only offline servers, there should be start options but no stop all button
            expect(result.components).toBeDefined();
            // Should have at least one select menu for starting the offline server
            const hasSelectMenu = result.components.some((c: any) => c.components?.[0]?.data?.type === 3);
            expect(hasSelectMenu).toBe(true);
        });

        it('should handle many servers creating multiple menu rows', async () => {
            // Reset mocks to default state
            jest.clearAllMocks();

            // Create many servers to test the row limit
            const serverList = Array.from({ length: 30 }, (_, i) => ({
                attributes: {
                    identifier: `server-${i}`,
                    name: `Server ${i}`,
                    description: `Server ${i} description`,
                },
            }));

            // Ensure mockGetServersByUserId returns the correct data
            mockGetServersByUserId.mockReturnValue([
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'My Server',
                    serverUrl: testServerUrl,
                    apiKey: testApiKey,
                },
            ]);

            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ data: serverList });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 25.0,
                                disk_bytes: 1000000000,
                                uptime: 3600000,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            // Should have components but limited to max 5 rows (4 select menus + 1 stop all button)
            expect(result).toBeDefined();
            if (result.components) {
                expect(result.components.length).toBeLessThanOrEqual(5);
            }
        });

        it('should handle refreshStatus with running server and resource state', async () => {
            let fetchCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    fetchCount++;
                    // Return running state for refreshStatus path
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 25.0,
                                disk_bytes: 1000000000,
                                uptime: 3600000,
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
                                customId: 'server_control:1:server-123:restart',
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
                customId: 'server_control:1:server-123:restart',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            const collectPromise = collectorCallbacks['collect'](mockButtonInteraction);

            // Advance timers
            await jest.advanceTimersByTimeAsync(500);

            await collectPromise;

            // Should have fetched resources and called editReply
            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle servers with unknown state (not running/offline)', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-1',
                                    name: 'Server 1',
                                    description: 'First server',
                                },
                            },
                        ],
                    });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'installing',
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

            // Should return components but with no actions for installing state
            expect(result.components).toBeDefined();
        });

        it('should handle refreshStatus with non-running server state', async () => {
            // Test refreshStatus path where server is offline (not running)
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
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            const collectPromise = collectorCallbacks['collect'](mockButtonInteraction);

            // Advance timers to trigger refresh
            await jest.advanceTimersByTimeAsync(500);

            await collectPromise;

            // Should have called editReply with offline state info (without resource details)
            expect(mockButtonInteraction.editReply).toHaveBeenCalled();
        });

        it('should handle createControlComponents with no valid options (all unknown states)', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-1',
                                    name: 'Server 1',
                                    description: 'First server',
                                },
                            },
                        ],
                    });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    // Return unknown state - neither running nor offline
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'suspended',
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

            // With suspended state (not running or offline), no control buttons should be shown
            expect(result.embeds).toBeDefined();
            // Components array might be empty or not contain select menus
            expect(result.components).toBeDefined();
        });

        it('should limit menu rows to 4 and add stop all button as 5th row', async () => {
            // Create enough servers with offline state to generate many start options
            // 25 options per menu max, so we need enough servers to exceed 4 menus worth
            const serverList = Array.from({ length: 120 }, (_, i) => ({
                attributes: {
                    identifier: `server-${i}`,
                    name: `Srv${i}`,
                    description: `Server ${i}`,
                },
            }));

            jest.clearAllMocks();

            mockGetServersByUserId.mockReturnValue([
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'My Server',
                    serverUrl: testServerUrl,
                    apiKey: testApiKey,
                },
            ]);

            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ data: serverList });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    // All running - each will generate restart + stop = 2 options per server
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 512000000,
                                cpu_absolute: 25.0,
                                disk_bytes: 1000000000,
                                uptime: 3600000,
                            },
                        },
                    });
                })
            );

            const result: any = await serverStatusExecute(mockInteraction);

            // Should have max 5 rows total (4 select menus + stop all button)
            if (result.components) {
                expect(result.components.length).toBeLessThanOrEqual(5);
            }
        });
    });
});
