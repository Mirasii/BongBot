/**
 * @fileoverview Full unit test suite for BongBot
 */
import { jest, describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const mockExecute = jest.fn<any>(() => ({ content: 'pong!' }));
const mockExecuteReply = jest.fn<any>(() => ({ content: 'pong reply!' }));
const mockExecuteLegacy = jest.fn<any>(() => ({ content: 'pong legacy!' }));

// Mock crypto module
jest.unstable_mockModule('crypto', () => {
    const mockCrypto = {
        randomUUID: jest.fn(() => 'fixed-uuid-1234-5678-9012-abcdef123456')
    };
    return {
        ...mockCrypto,
        default: mockCrypto
    };
});

// Mock discord.js BEFORE any imports
jest.unstable_mockModule('discord.js', () => {
    class MockCollection extends Map {
        constructor(entries?: [string, any][]) {
            super();
        }
        
        filter(predicate: (value: any, key: string, map: Map<string, any>) => boolean) {
            const filteredEntries: [string, any][] = [];
            for (const [key, value] of this.entries()) {
                if (predicate(value, key, this)) {
                    filteredEntries.push([key, value]);
                }
            }
            return new MockCollection(filteredEntries);
        }
    }

    return {
        Client: jest.fn(() => ({
            on: jest.fn(),
            login: jest.fn(),
            user: { id: 'bot123', setPresence: jest.fn() },
            application: { commands: { set: jest.fn() } },
            channels: { fetch: jest.fn() },
            commands: new MockCollection()
        })),
        GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
        ActivityType: { Playing: 'PLAYING' },
        Collection: MockCollection
    };
});

// Mock fs
jest.unstable_mockModule('fs', () => ({
    readdirSync: jest.fn(() => ['ping.js'])
}));

// Mock logging
jest.unstable_mockModule('../src/helpers/logging.js', () => ({
    default: {
        init: jest.fn(),
        log: jest.fn()
    }
}));

// Mock errorBuilder
jest.unstable_mockModule('../src/helpers/errorBuilder.js', () => ({
    buildUnknownError: jest.fn((err: any) => ({ content: `Error: ${err.message}`, isError: true }))
}));

// Mock infoCard
jest.unstable_mockModule('../src/helpers/infoCard.js', () => ({
    generateCard: jest.fn(() => ({ title: 'Fake Card' }))
}));

// Mock config
jest.unstable_mockModule('../src/config/index.js', () => ({
    default: {
        discord: {
            apikey: 'fake-token'
        }
    }
}));

// Mock buildCommands
jest.unstable_mockModule('../src/commands/buildCommands.js', () => ({
    default: jest.fn((bot: any) => {
        // Add ping command to bot.commands
        const pingCommand = {
            data: { name: 'ping', toJSON: jest.fn(() => ({ name: 'ping' })) },
            execute: mockExecute,
            executeReply: mockExecuteReply,
            executeLegacy: mockExecuteLegacy
        };
        bot.commands.set('ping', pingCommand);
        bot.commands.set('create_quote', pingCommand);
        bot.commands.set('chat', pingCommand);
        return [{ name: 'ping' }];
    })
}));

// Mock TikTok/naniko
jest.unstable_mockModule('../src/commands/naniko.js', () => ({
    default: jest.fn()
}));

describe('BongBot', () => {
    let Discord: any;
    let mockClient: any;
    let LOGGER: any;
    let ERROR_BUILDER: any;

    beforeAll(async () => {
        // Import mocked modules
        Discord = await import('discord.js');
        LOGGER = (await import('../src/helpers/logging.js')).default;
        ERROR_BUILDER = await import('../src/helpers/errorBuilder.js');
        
        // Import index.js which will use all the mocks
        await import('../src/index.js');
        
        // Get the client instance
        mockClient = (Discord.Client as any).mock.results[0].value;
    });

    it('initializes logging with sessionId', () => {
        expect(LOGGER.init).toHaveBeenCalledWith('fixed-uuid-1234-5678-9012-abcdef123456');
    });

    it('loads ping command into bot.commands', () => {
        expect(mockClient.commands.get('ping')).toBeDefined();
    });

    it('registers event listeners', () => {
        expect(mockClient.on).toHaveBeenCalledWith('interactionCreate', expect.any(Function));
        expect(mockClient.on).toHaveBeenCalledWith('messageCreate', expect.any(Function));
        expect(mockClient.on).toHaveBeenCalledWith('clientReady', expect.any(Function));
    });

    it('logs in with provided token', () => {
        expect(mockClient.login).toHaveBeenCalled();
    });

    describe('interactionCreate handler', () => {
        let handler: Function;
        
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find((c: any[]) => c[0] === 'interactionCreate')[1];
        });

        it('ignores non-command interactions', async () => {
            const interaction = {
                isCommand: () => false
            };
            await handler(interaction);
            expect(mockExecute).not.toHaveBeenCalled();
        });

        it('ignores unknown commands', async () => {
            const interaction = {
                isCommand: () => true,
                commandName: 'unknown',
                deferReply: jest.fn(),
            };
            await handler(interaction);
            expect(interaction.deferReply).not.toHaveBeenCalled();
        });

        it('executes a command successfully', async () => {
            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: false
            };
            await handler(interaction);
            expect(mockExecute).toHaveBeenCalledWith(interaction, mockClient);
            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ content: 'pong!' });
        });

        it('handles command execution errors', async () => {
            mockExecute.mockImplementationOnce(() => { throw new Error('boom'); });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: true
            };
            await handler(interaction);
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
        });

        it('handles command response with isError flag and deletes reply', async () => {
            mockExecute.mockImplementationOnce(() => ({ isError: true, content: 'Error response' }));

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn(),
                replied: true
            };
            await handler(interaction);
            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ isError: true, content: 'Error response' });
        });
    });

    describe('messageCreate handler', () => {
        let handler: Function;
        
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find((c: any[]) => c[0] === 'messageCreate')[1];
        });

        it('handles undefined message properties gracefully', async () => {
            // Message with no mentions of bot - should be ignored
            await handler({ author: { bot: false }, mentions: { users: new Map() } });
            expect(mockExecuteReply).not.toHaveBeenCalled();
            
            // Message with bot author - should be ignored
            await handler({ author: { bot: true }, mentions: { users: new Map([['bot123', {}]]) } });
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('ignores bot messages', async () => {
            const message = { author: { bot: true }, mentions: { users: new Map() } };
            await handler(message);
        });

        it('handles mention with empty content', async () => {
            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: new Map([['bot123', {}]]) },
                content: `<@bot123>`,
                reply: jest.fn(() => replyMsg)
            };
            await handler(message);
            expect(mockExecuteReply).toHaveBeenCalledWith(message, mockClient);
            expect(replyMsg.delete).toHaveBeenCalled();
        });

        it('handles mention with content', async () => {
            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: new Map([['bot123', {}]]) },
                content: `<@bot123> hello`,
                reply: jest.fn(() => replyMsg)
            };
            await handler(message);
            expect(mockExecuteLegacy).toHaveBeenCalledWith(message, mockClient);
            expect(replyMsg.delete).toHaveBeenCalled();
        });

        it('handles errors gracefully', async () => {
            mockExecuteLegacy.mockImplementationOnce(() => { throw new Error('legacy fail'); });

            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: new Map([['bot123', {}]]) },
                content: `<@bot123> hey`,
                reply: jest.fn(() => replyMsg)
            };
            await handler(message);
            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
        });

        it('handles errors when reply fails during initialization', async () => {
            mockExecuteLegacy.mockImplementationOnce(() => { throw new Error('legacy fail'); });

            const message = {
                author: { bot: false },
                mentions: { users: new Map([['bot123', {}]]) },
                content: `<@bot123> hey`,
                reply: jest.fn<any>().mockRejectedValueOnce(new Error('reply failed'))
            };
            await handler(message);
            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
            expect(message.reply).toHaveBeenCalledTimes(2);
        });
    });

    describe('clientReady handler', () => {
        let handler: Function;
        let originalEnv: string | undefined;
        
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find((c: any[]) => c[0] === 'clientReady')[1];
            originalEnv = process.env.DISCORD_CHANNEL_ID;
        });

        afterAll(() => {
            if (originalEnv) {
                process.env.DISCORD_CHANNEL_ID = originalEnv;
            } else {
                delete process.env.DISCORD_CHANNEL_ID;
            }
        });

        it('handles command registration failure', async () => {
            delete process.env.DISCORD_CHANNEL_ID;
            const error = new Error('Failed to register commands');
            mockClient.application.commands.set.mockRejectedValueOnce(error);
            await handler();
            expect(LOGGER.log).toHaveBeenCalled();
        });

        it('handles invalid channel configurations', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            mockClient.channels.fetch.mockResolvedValueOnce(null);
            await handler();
            expect(mockClient.user.setPresence).toHaveBeenCalled();
        });

        it('sets commands, presence, and sends deployment card', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            
            const mockMessages = new (Discord.Collection as any)([
                ['1', { author: { id: 'bot123' }, delete: jest.fn() }]
            ]);
            
            const fakeChannel = {
                isTextBased: () => true,
                messages: {
                    fetch: jest.fn(async () => mockMessages)
                },
                send: jest.fn()
            };
            mockClient.channels.fetch.mockResolvedValueOnce(fakeChannel);

            await handler();
            await flushPromises();
            expect(mockClient.application.commands.set).toHaveBeenCalled();
            expect(mockClient.user.setPresence).toHaveBeenCalled();
            expect(fakeChannel.send).toHaveBeenCalledWith({ embeds: [{ title: 'Fake Card' }] });
        });

        it('warns if missing manage messages permission', async () => {
            process.env.DISCORD_CHANNEL_ID = 'test-channel-id';
            const fakeChannel = {
                isTextBased: () => true,
                messages: { fetch: jest.fn(async () => { throw new Error('Forbidden'); }) },
                send: jest.fn()
            };
            mockClient.channels.fetch.mockResolvedValueOnce(fakeChannel);

            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            await handler();
            await flushPromises();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not delete messages'));
            warnSpy.mockRestore();
        });
    });
});

function flushPromises(): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}