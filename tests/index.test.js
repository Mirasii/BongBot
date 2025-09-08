/**
 * @fileoverview Full unit test suite for BongBot
 */
const crypto = require('crypto');

const mockExecute = jest.fn(() => ({ content: 'pong!' }));
const mockExecuteReply = jest.fn(() => ({ content: 'pong reply!' }));
const mockExecuteLegacy = jest.fn(() => ({ content: 'pong legacy!' }));

jest.mock('discord.js', () => {
    const mockCollection = jest.fn((entries) => {
        const map = new Map(entries); // Initialize with entries
        map.set = jest.fn((k, v) => Map.prototype.set.call(map, k, v));
        map.get = jest.fn(k => {
            if (k === 'create_quote' || k === 'chat' || k === 'ping') {
                return require('../src/commands/ping.js');
            }
            return Map.prototype.get.call(map, k);
        });
        map.filter = jest.fn(predicate => {
            const filteredEntries = [];
            for (const [key, value] of map.entries()) {
                if (predicate(value, key, map)) {
                    filteredEntries.push([key, value]);
                }
            }
            return new mockCollection(filteredEntries); // Return a new mockCollection
        });
        // Add forEach to the mock collection
        map.forEach = jest.fn((callback) => {
            for (const [key, value] of map.entries()) {
                callback(value, key, map);
            }
        });
        return map;
    });

    return {
        Client: jest.fn(() => ({
            on: jest.fn(),
            login: jest.fn(),
            user: { id: 'bot123', setPresence: jest.fn() },
            application: { commands: { set: jest.fn() } },
            channels: { fetch: jest.fn() }
        })),
        GatewayIntentBits: { Guilds: 1, GuildMessages: 2, MessageContent: 4 },
        ActivityType: { Playing: 'PLAYING' },
        Collection: mockCollection
    };
});

jest.mock('fs', () => ({
    readdirSync: jest.fn(() => ['ping.js'])
}));

jest.mock('../src/helpers/logging', () => ({
    init: jest.fn(),
    log: jest.fn()
}));

jest.mock('../src/helpers/errorBuilder.js', () => ({
    buildUnknownError: jest.fn(err => ({ content: `Error: ${err.message}`, isError: true }))
}));

jest.mock('../src/helpers/infoCard.js', () => ({
    generateCard: jest.fn(() => ({ title: 'Fake Card' }))
}));

// mock ping command
jest.mock('../src/commands/ping.js', () => ({
    data: { name: 'ping', toJSON: jest.fn(() => ({ name: 'ping' })) },
    execute: mockExecute,
    executeReply: mockExecuteReply,
    executeLegacy: mockExecuteLegacy
}));

describe('BongBot', () => {
    let Discord;
    let mockClient;
    let commandModule;

    beforeAll(() => {
        jest.spyOn(crypto, 'randomUUID').mockReturnValue('fixed-uuid');
        Discord = require('discord.js');
        commandModule = require('../src/commands/ping.js');
        // Load entrypoint AFTER mocks (this is where Client() is actually called)
        require('../src/index.js');
        // Now the client instance exists
        mockClient = Discord.Client.mock.results[0].value;
    });

    it('initializes logging with sessionId', () => {
        const LOGGER = require('../src/helpers/logging');
        expect(LOGGER.init).toHaveBeenCalledWith('fixed-uuid');
    });

    it('loads ping command into bot.commands', () => {
        expect(commandModule.data.toJSON).toHaveBeenCalled();
        expect(mockClient.commands.get('ping')).toBe(commandModule);
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
        let handler;
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find(c => c[0] === 'interactionCreate')[1];
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
                deleteReply: jest.fn()
            };
            await handler(interaction);
            expect(mockExecute).toHaveBeenCalledWith(interaction, mockClient);
            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ content: 'pong!' });
        });

        it('handles command execution errors', async () => {
            const ERROR_BUILDER = require('../src/helpers/errorBuilder');
            mockExecute.mockImplementationOnce(() => { throw new Error('boom'); });

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn()
            };
            await handler(interaction);
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith(
                await ERROR_BUILDER.buildUnknownError(new Error('boom')) // Fixed: Use new Error('boom')
            );
        });

        it('handles command response with isError flag and deletes reply', async () => {
            mockExecute.mockImplementationOnce(() => ({ isError: true, content: 'Error response' }));

            const interaction = {
                isCommand: () => true,
                commandName: 'ping',
                deferReply: jest.fn(),
                followUp: jest.fn(),
                deleteReply: jest.fn()
            };
            await handler(interaction);
            expect(interaction.deferReply).toHaveBeenCalled();
            expect(interaction.deleteReply).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith({ isError: true, content: 'Error response' });
        });
    });

    describe('messageCreate handler', () => {
        let handler;
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find(c => c[0] === 'messageCreate')[1];
        });

        it('handles undefined message properties gracefully', async () => {
            await handler({});
            expect(mockExecuteReply).not.toHaveBeenCalled();
            await handler({ author: null });
            expect(mockExecuteReply).not.toHaveBeenCalled();
            await handler({ author: {}, mentions: null });
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('ignores bot messages', async () => {
            const message = { author: { bot: true }, mentions: { users: new Map() } };
            await handler(message);
            // nothing should throw
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
            const ERROR_BUILDER = require('../src/helpers/errorBuilder');
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
            const ERROR_BUILDER = require('../src/helpers/errorBuilder');
            mockExecuteLegacy.mockImplementationOnce(() => { throw new Error('legacy fail'); });

            const message = {
                author: { bot: false },
                mentions: { users: new Map([['bot123', {}]]) },
                content: `<@bot123> hey`,
                reply: jest.fn().mockRejectedValueOnce(new Error('reply failed'))
            };
            await handler(message);
            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
            expect(message.reply).toHaveBeenCalledTimes(2); // Once for initial reply (failed), once for error reply
        });
    });

    describe('clientReady handler', () => {
        let handler;
        beforeAll(() => {
            handler = mockClient.on.mock.calls.find(c => c[0] === 'clientReady')[1];
        });

        it('handles command registration failure', async () => {
            const LOGGER = require('../src/helpers/logging');
            const error = new Error('Failed to register commands');
            mockClient.application.commands.set.mockRejectedValueOnce(error);
            await handler();
            expect(LOGGER.log).toHaveBeenCalledWith(error);
        });

        it('handles invalid channel configurations', async () => {
            mockClient.channels.fetch.mockResolvedValueOnce(null);
            await handler();
            // Should not throw and continue execution
            expect(mockClient.user.setPresence).toHaveBeenCalled();
        });

        it('sets commands, presence, and sends deployment card', async () => {
            const fakeChannel = {
                isTextBased: () => true,
                messages: {
                    fetch: jest.fn(() => new Discord.Collection([
                        ['1', { author: { id: 'bot123' }, delete: jest.fn() }]
                    ]))
                },
                send: jest.fn()
            };
            mockClient.channels.fetch.mockResolvedValue(fakeChannel);

            await handler();
            await flushPromises();
            expect(mockClient.application.commands.set).toHaveBeenCalled();
            expect(mockClient.user.setPresence).toHaveBeenCalled();
            expect(fakeChannel.send).toHaveBeenCalledWith({ embeds: [{ title: 'Fake Card' }] });
        });

        it('warns if missing manage messages permission', async () => {
            const fakeChannel = {
                isTextBased: () => true,
                messages: { fetch: jest.fn(() => { throw new Error('Forbidden'); }) },
                send: jest.fn()
            };
            mockClient.channels.fetch.mockResolvedValue(fakeChannel);

            const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
            await handler();
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not delete messages'));
            warnSpy.mockRestore();
        });
    });
});

function flushPromises() {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}