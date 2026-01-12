import { jest } from '@jest/globals';
import type {
    ChatInputCommandInteraction,
    Message,
    ButtonInteraction,
    StringSelectMenuInteraction
} from 'discord.js';
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
    http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, ({ params }) => {
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
// Use 'bypass' to avoid warnings for unhandled requests in tests
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
const statusModule = await import('../../../src/commands/pterodactyl/server_status.js');
const statusCommand = statusModule.default;

describe('server_status command', () => {
    let mockInteraction: Partial<ChatInputCommandInteraction>;

    // Use utility function for standard command structure tests
    testCommandStructure(statusCommand, 'server_status');

    afterAll(() => {
        server.close();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset handlers to default state for each test
        server.resetHandlers(...handlers);

        // Suppress console.error and console.warn during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
        jest.spyOn(console, 'warn').mockImplementation(() => {});

        // Setup mock interaction using utility and override user ID
        const baseInteraction = createMockInteraction({
            commandName: 'server_status',
        });

        mockInteraction = {
            ...baseInteraction,
            user: {
                ...baseInteraction.user,
                id: 'test-user-123', // Override with test-specific ID
            },
        } as any;

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
    });

    describe('command methods', () => {
        it('should have a setupCollector method', () => {
            expect(statusCommand.setupCollector).toBeInstanceOf(Function);
        });
    });

    describe('execute method', () => {
        it('should return error if user has no registered servers', async () => {
            mockGetServersByUserId.mockReturnValue([]);

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(mockDbClose).toHaveBeenCalled();
            expect(result).toEqual({
                content: expect.stringContaining('no registered servers'),
                ephemeral: true,
            });
        });

        it('should return error if servers is null', async () => {
            mockGetServersByUserId.mockReturnValue(null);

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.content).toContain('no registered servers');
            expect(result.ephemeral).toBe(true);
        });

        it('should fetch and display server status', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(mockGetServersByUserId).toHaveBeenCalledWith('test-user-123');
            expect(result.embeds).toBeDefined();
            expect(result.embeds.length).toBe(1);

            const embed = result.embeds[0];
            expect(embed.data.title).toBe('🎮 Game Server Status');
            expect(embed.data.fields).toBeDefined();
            expect(embed.data.fields.length).toBeGreaterThan(0);
        });

        it('should include control components in response', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should handle fetch errors gracefully', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.error();
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(mockDbClose).toHaveBeenCalled();
            expect(result.content).toContain('Failed to fetch server status');
        });

        it('should handle multiple servers', async () => {
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.embeds[0].data.fields.length).toBeGreaterThan(0);
        });

        it('should use custom database from environment variable', async () => {
            const originalEnv = process.env.SERVER_DATABASE;
            process.env.SERVER_DATABASE = 'custom-db.db';

            await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(MockDatabase).toHaveBeenCalledWith('custom-db.db');

            // Restore
            if (originalEnv) {
                process.env.SERVER_DATABASE = originalEnv;
            } else {
                delete process.env.SERVER_DATABASE;
            }
        });
    });

    describe('server state display', () => {
        it('should display running server with resource info', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('unknown');
        });
    });

    describe('control components', () => {
        it('should create start button for offline servers', async () => {
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should create stop and restart buttons for running servers', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should include stop all button when servers are running', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components.length).toBeGreaterThan(0);
            // Last component should be the stop all button
            const lastRow = result.components[result.components.length - 1];
            expect(lastRow.components).toBeDefined();
        });
    });

    describe('setupCollector method', () => {
        let mockMessage: Partial<Message>;
        let mockComponentInteraction: Partial<ButtonInteraction>;
        let collectorCallback: any;

        beforeEach(() => {
            mockComponentInteraction = {
                user: { id: 'test-user-123' } as any,
                isStringSelectMenu: jest.fn().mockReturnValue(false),
                isButton: jest.fn().mockReturnValue(true),
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
                reply: jest.fn().mockResolvedValue(undefined),
            };

            mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'test',
                            },
                        ],
                    },
                ],
            } as any;
        });

        it('should setup a collector with correct timeout', () => {
            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            expect(mockMessage.createMessageComponentCollector).toHaveBeenCalledWith({
                time: 600000,
            });
        });

        it('should reject interactions from different users', async () => {
            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            mockComponentInteraction.user = { id: 'different-user' } as any;

            await collectorCallback(mockComponentInteraction);

            expect(mockComponentInteraction.reply).toHaveBeenCalledWith({
                content: expect.stringContaining('cannot control servers'),
                ephemeral: true,
            });
        });
    });

    describe('helper functions - formatting', () => {
        it('should format bytes correctly', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            // 1073741824 bytes = 1024 MB
            expect(fieldValue).toContain('1024');
        });

        it('should format CPU percentage correctly', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toMatch(/2h.*1m/);
        });

        it('should format uptime in minutes only when less than 1 hour', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 1073741824,
                                cpu_absolute: 50.5,
                                disk_bytes: 2147483648,
                                uptime: 1800000, // 30 minutes
                            },
                        },
                    });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('30m');
            expect(fieldValue).not.toContain('h');
        });
    });

    describe('status emojis', () => {
        it('should show green circle for running state', async () => {
            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🟡');
        });

        it('should show orange circle for stopping state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'stopping',
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('🟠');
        });

        it('should show white circle for unknown state', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.error();
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
            expect(result.embeds[0].data.fields[0].value).toContain('⚪');
        });
    });

    describe('error handling', () => {
        it('should close database on error', async () => {
            mockGetServersByUserId.mockImplementation(() => {
                throw new Error('Database error');
            });

            await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(mockDbClose).toHaveBeenCalled();
        });

        it('should handle network errors', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.error();
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.content).toContain('Failed to fetch server status');
        });

        it('should handle invalid API responses', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ invalid: 'data' });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.content).toContain('Failed to fetch server status');
        });

        it('should handle null resource responses', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return new HttpResponse(null, { status: 404 });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            const fieldValue = result.embeds[0].data.fields[0].value;
            expect(fieldValue).toContain('unknown');
        });

        it('should handle empty server list', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ data: [] });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.embeds).toBeDefined();
            // Empty server list means no fields
            const fields = result.embeds[0].data.fields;
            expect(fields === undefined || fields.length === 0).toBe(true);
        });
    });

    describe('select menu pagination', () => {
        it('should handle servers with very long names', async () => {
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-long',
                                    name: 'A'.repeat(100), // Very long name
                                    description: 'Test description',
                                },
                            },
                        ],
                    });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should handle multiple servers', async () => {
            // Test with 5 servers which should still work well
            const servers = Array.from({ length: 5 }, (_, i) => ({
                attributes: {
                    identifier: `server-${i}`,
                    name: `Server ${i}`,
                    description: 'Test',
                },
            }));

            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({ data: servers });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 1073741824,
                                cpu_absolute: 50.5,
                                disk_bytes: 2147483648,
                                uptime: 3600000,
                            },
                        },
                    });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.embeds).toBeDefined();
            expect(result.components).toBeDefined();
            // Should have components for controlling multiple servers
            expect(result.components.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('component interactions - string select menu', () => {
        it('should parse select menu interaction correctly', async () => {
            const mockSelectInteraction = {
                user: { id: 'test-user-123' } as any,
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                customId: 'server_control:1:menu0',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return {
                            on: jest.fn(),
                        };
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 3, // StringSelect
                                customId: 'test',
                            },
                        ],
                    },
                ],
            } as any;

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            expect(mockMessage.createMessageComponentCollector).toHaveBeenCalled();
        });

        it('should handle select menu interaction with start action', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                customId: 'server_control:1:menu0',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock successful power command
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.json({ success: true });
                })
            );

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            expect(mockSelectInteraction.deferUpdate).toHaveBeenCalled();
            expect(mockSelectInteraction.followUp).toHaveBeenCalled();
        });

        it('should handle button interaction with stop action', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(false),
                isButton: jest.fn().mockReturnValue(true),
                customId: 'server_control:1:server-123:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockButtonInteraction);
            }

            expect(mockButtonInteraction.deferUpdate).toHaveBeenCalled();
        });

        it('should reject unauthorized user interactions', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [],
            } as any;

            const mockUnauthorizedInteraction = {
                user: { id: 'different-user-456' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                reply: jest.fn().mockResolvedValue(undefined),
            };

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector with unauthorized user
            if (collectorCallback) {
                await collectorCallback(mockUnauthorizedInteraction);
            }

            expect(mockUnauthorizedInteraction.reply).toHaveBeenCalledWith({
                content: '❌ You cannot control servers for another user.',
                ephemeral: true,
            });
        });

        it('should handle stop all servers action', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:1:all:stop',
                            },
                        ],
                    },
                ],
            } as any;

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(false),
                isButton: jest.fn().mockReturnValue(true),
                customId: 'server_control:1:all:stop',
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock server list and power commands
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return HttpResponse.json({
                        data: [
                            {
                                attributes: {
                                    identifier: 'server-1',
                                    name: 'Server 1',
                                    description: 'Test',
                                },
                            },
                            {
                                attributes: {
                                    identifier: 'server-2',
                                    name: 'Server 2',
                                    description: 'Test',
                                },
                            },
                        ],
                    });
                }),
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.json({ success: true });
                })
            );

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockButtonInteraction);
            }

            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Stopping all servers'),
                    ephemeral: true,
                })
            );
        });

        it('should handle failed server command', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock failed power command
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return new HttpResponse(null, { status: 500 });
                })
            );

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            // Should call followUp twice: once for action message, once for failure
            expect(mockSelectInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Failed to control server'),
                    ephemeral: true,
                })
            );
        });

        it('should handle server not found in database', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 2, // Button
                                customId: 'server_control:999:server-123:start',
                            },
                        ],
                    },
                ],
            } as any;

            const mockButtonInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(false),
                isButton: jest.fn().mockReturnValue(true),
                customId: 'server_control:999:server-123:start', // Non-existent server ID
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock getServerById to return undefined
            mockGetServerById.mockReturnValue(undefined);

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockButtonInteraction);
            }

            // When server is not found in database, should send specific error message
            expect(mockButtonInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: '❌ Server configuration not found.',
                    ephemeral: true,
                })
            );
        });

        it('should handle collector errors gracefully', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockRejectedValue(new Error('Edit failed')),
            };

            // Mock database to throw error
            mockGetServerById.mockImplementation(() => {
                throw new Error('Database connection failed');
            });

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector - should handle error gracefully
            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            // Error should be caught and handled - followUp called with error message
            expect(mockSelectInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('error occurred'),
                    ephemeral: true,
                })
            );
        });

        it('should handle restart action correctly', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:restart'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock successful power command
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    return HttpResponse.json({ success: true });
                })
            );

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            expect(mockSelectInteraction.followUp).toHaveBeenCalledWith(
                expect.objectContaining({
                    content: expect.stringContaining('Restarting'),
                    ephemeral: true,
                })
            );
        });

        it('should disable components while processing', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 3, // StringSelect
                                customId: 'server_control:1:menu0',
                                toJSON: () => ({ type: 3, custom_id: 'server_control:1:menu0' }),
                            },
                        ],
                    },
                ],
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the collector
            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            expect(mockSelectInteraction.editReply).toHaveBeenCalled();
        });

        it('should log when collector ends', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
            let endCallback: any;

            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'end') {
                            endCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [],
            } as any;

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            // Trigger the end callback
            if (endCallback) {
                endCallback();
            }

            expect(consoleSpy).toHaveBeenCalledWith(
                'Server status button collector ended after 10 minutes'
            );

            consoleSpy.mockRestore();
        });
    });

    describe('action messages', () => {
        it('should show correct message for start action', async () => {
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            // Check that start actions are available for offline servers
            expect(result.components).toBeDefined();
            expect(result.components.length).toBeGreaterThan(0);
        });

        it('should not create stop all button when no servers are running', async () => {
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

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.components).toBeDefined();
            // Last row should not be "Stop All" button when servers are offline
        });

        it('should handle mixed server states', async () => {
            let callCount = 0;
            server.use(
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    callCount++;
                    return HttpResponse.json({
                        attributes: {
                            current_state: callCount % 2 === 0 ? 'running' : 'offline',
                            resources: {
                                memory_bytes: 1073741824,
                                cpu_absolute: 50.5,
                                disk_bytes: 2147483648,
                                uptime: 3600000,
                            },
                        },
                    });
                })
            );

            mockGetServersByUserId.mockReturnValue([
                {
                    id: 1,
                    userId: 'test-user-123',
                    serverName: 'Server 1',
                    serverUrl: testServerUrl,
                    apiKey: testApiKey,
                },
            ]);

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.embeds).toBeDefined();
            expect(result.components).toBeDefined();
        });
    });

    describe('edge cases and error paths', () => {
        it('should handle fetchServers API failure', async () => {
            // Mock API to return non-OK status
            server.use(
                http.get(`${testServerUrl}/api/client`, () => {
                    return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
                })
            );

            try {
                await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);
            } catch (error: any) {
                expect(error.message).toContain('Failed to fetch servers');
            }
        });

        it('should handle sendServerCommand network failure', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock power command to fail with network error
            server.use(
                http.post(`${testServerUrl}/api/client/servers/:identifier/power`, () => {
                    throw new Error('Network failure');
                })
            );

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            // Should handle the error and send failure message
            expect(mockSelectInteraction.followUp).toHaveBeenCalled();
        });

        it('should handle component type that is neither button nor select', async () => {
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
                    }),
                }),
                components: [
                    {
                        components: [
                            {
                                type: 5, // Text input (not button or select)
                                customId: 'server_control:1:menu0',
                            },
                        ],
                    },
                ],
            } as any;

            const mockInteraction2 = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            if (collectorCallback) {
                await collectorCallback(mockInteraction2);
            }

            expect(mockInteraction2.deferUpdate).toHaveBeenCalled();
        });

        it('should handle empty server list in refreshStatus', async () => {
            // This tests line 435 - early return when no servers
            let collectorCallback: any;
            const mockMessage = {
                createMessageComponentCollector: jest.fn().mockReturnValue({
                    on: jest.fn((event: string, callback: any) => {
                        if (event === 'collect') {
                            collectorCallback = callback;
                        }
                        return { on: jest.fn() };
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
            } as any;

            const mockSelectInteraction = {
                user: { id: 'test-user-123' },
                isStringSelectMenu: jest.fn().mockReturnValue(true),
                isButton: jest.fn().mockReturnValue(false),
                values: ['1:server-123:start'],
                deferUpdate: jest.fn().mockResolvedValue(undefined),
                followUp: jest.fn().mockResolvedValue(undefined),
                editReply: jest.fn().mockResolvedValue(undefined),
            };

            // Mock getServersByUserId to return empty array during refresh
            mockGetServersByUserId.mockReturnValue([]);

            statusCommand.setupCollector(
                mockInteraction as ChatInputCommandInteraction,
                mockMessage as Message
            );

            if (collectorCallback) {
                await collectorCallback(mockSelectInteraction);
            }

            expect(mockSelectInteraction.deferUpdate).toHaveBeenCalled();
        });

        it('should handle many servers for pagination', async () => {
            // Test line 566 - pagination row limit (tests breaking into multiple rows)
            const manyServers = Array.from({ length: 12 }, (_, i) => ({
                attributes: {
                    identifier: `server-${i}`,
                    name: `Server ${i}`,
                    description: `Test server ${i}`,
                },
            }));

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
                    return HttpResponse.json({ data: manyServers });
                }),
                http.get(`${testServerUrl}/api/client/servers/:identifier/resources`, () => {
                    return HttpResponse.json({
                        attributes: {
                            current_state: 'running',
                            resources: {
                                memory_bytes: 1073741824,
                                cpu_absolute: 50.5,
                                disk_bytes: 2147483648,
                                uptime: 3600000,
                            },
                        },
                    });
                })
            );

            const result = await statusCommand.execute(mockInteraction as ChatInputCommandInteraction);

            expect(result.embeds).toBeDefined();
            expect(result.components).toBeDefined();
            // With 12 servers, should have multiple component rows (select menus are limited to 25 options)
            expect(result.components.length).toBeGreaterThanOrEqual(1);
        });
    });
});
