/**
 * @fileoverview Updated unit test suite for BongBot (Core-Refactored)
 */
import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// Define mocks for the command execution
const mockExecuteReply = jest.fn<any>(() => Promise.resolve({ content: 'pong reply!' }));
const mockExecuteLegacy = jest.fn<any>(() => Promise.resolve({ content: 'pong legacy!' }));

// 1. Mock @pookiesoft/bongbot-core BEFORE any imports
jest.unstable_mockModule('@pookiesoft/bongbot-core', () => {
    return {
        startWithFunctions: jest.fn(async () => ({
            user: { id: 'bot123' },
            on: jest.fn(),
            logger: { info: jest.fn(), error: jest.fn() },
            commands: new Map([
                ['create_quote', { executeReply: mockExecuteReply }],
                ['chat', { executeLegacy: mockExecuteLegacy }]
            ])
        }))
    };
});

// 2. Mock discord.js
jest.unstable_mockModule('discord.js', () => ({
    Collection: Map,
}));

// 3. Mock internal helpers/configs
jest.unstable_mockModule('../src/config/index.js', () => ({
    validateRequiredConfig: jest.fn()
}));

jest.unstable_mockModule('../src/helpers/errorBuilder.js', () => ({
    buildUnknownError: jest.fn((err: any) => ({ content: `Error: ${err.message}` }))
}));

jest.unstable_mockModule('../src/commands/buildCommands.js', () => ({
    default: jest.fn()
}));

jest.unstable_mockModule('../src/commands/naniko.js', () => ({
    default: jest.fn().mockImplementation(() => ({}))
}));

describe('BongBot index.ts', () => {
    let bongCore: any;
    let mockBot: any;

    beforeAll(async () => {
        bongCore = await import('@pookiesoft/bongbot-core');
        // Import index.ts to trigger the initialization logic
        await import('../src/index.js');
        // Get the result of startWithFunctions from the mock
        mockBot = await (bongCore.startWithFunctions as any).mock.results[0].value;
    });

    it('initializes the bot with core package', () => {
        expect(bongCore.startWithFunctions).toHaveBeenCalledWith(
            'PookieSoft',
            'BongBot',
            expect.any(Function),
            ['setupCollector']
        );
    });

    describe('messageCreate handler', () => {
        let messageHandler: Function;

        beforeAll(() => {
            // Find the handler registered to messageCreate
            messageHandler = mockBot.on.mock.calls.find((c: any[]) => c[0] === 'messageCreate')[1];
        });

        it('ignores messages from other bots', async () => {
            const message = { author: { bot: true } };
            await messageHandler(message);
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('ignores messages that do not mention the bot', async () => {
            const message = {
                author: { bot: false },
                mentions: { users: { has: () => false } }
            };
            await messageHandler(message);
            expect(mockExecuteReply).not.toHaveBeenCalled();
        });

        it('executes "create_quote" when content is empty (just a mention)', async () => {
            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: { has: () => true } },
                content: '<@bot123>',
                reply: jest.fn<({ }) => Promise<{ delete: Function }>>().mockResolvedValue(replyMsg)
            };

            await messageHandler(message);

            expect(mockExecuteReply).toHaveBeenCalled();
            expect(replyMsg.delete).toHaveBeenCalled();
            // Verify final response was sent
            expect(message.reply).toHaveBeenCalledWith({ content: 'pong reply!' });
        });

        it('executes "chat" when mention contains text', async () => {
            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: { has: () => true } },
                content: '<@bot123> how are you?',
                reply: jest.fn<({ }) => Promise<{ delete: Function }>>().mockResolvedValue(replyMsg)
            };

            await messageHandler(message);

            expect(mockExecuteLegacy).toHaveBeenCalled();
            expect(message.reply).toHaveBeenCalledWith({ content: 'pong legacy!' });
        });

        it('handles errors via errorBuilder', async () => {
            const ERROR_BUILDER = await import('../src/helpers/errorBuilder.js');
            mockExecuteLegacy.mockRejectedValueOnce(new Error('AI Failed'));

            const replyMsg = { delete: jest.fn() };
            const message = {
                author: { bot: false },
                mentions: { users: { has: () => true } },
                content: '<@bot123> break it',
                reply: jest.fn<() => Promise<{ delete: Function }>>().mockResolvedValue(replyMsg)
            };

            await messageHandler(message);

            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
            expect(replyMsg.delete).toHaveBeenCalled();
        });
        
        it('handles errors when initial reply fails (branch coverage for line 34)', async () => {
        const ERROR_BUILDER = await import('../src/helpers/errorBuilder.js');

        // Force the initial "thinking" reply to fail
        const message = {
            author: { bot: false },
            mentions: { users: { has: () => true } },
            content: '<@bot123> trigger error',
            // This rejection happens BEFORE 'reply' is assigned
            reply: jest.fn<() => Promise<void>>().mockRejectedValueOnce(new Error('Discord API Down'))
        };

        await messageHandler(message);

        // This ensures that the code reached the catch block
        expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();

        // This confirms the second message.reply (the error response) was attempted
        // even though the first reply didn't exist to be deleted
        expect(message.reply).toHaveBeenCalledTimes(2);
    });
    });

    it('initializes TikTok client on clientReady', async () => {
        const TikTok = (await import('../src/commands/naniko.js')).default;
        const readyHandler = mockBot.on.mock.calls.find((c: any[]) => c[0] === 'clientReady')[1];

        readyHandler();
        expect(TikTok).toHaveBeenCalled();
    });

});