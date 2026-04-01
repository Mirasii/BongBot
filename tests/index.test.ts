import { jest, describe, it, expect, beforeAll } from '@jest/globals';

const mockExecuteReply = jest.fn<any>(() => Promise.resolve({ content: 'pong reply!' }));
const mockExecuteLegacy = jest.fn<any>(() => Promise.resolve({ content: 'pong legacy!' }));

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

jest.unstable_mockModule('discord.js', () => ({
    Collection: Map,
}));

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
        await import('../src/index.js');
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

            const message = {
                author: { bot: false },
                mentions: { users: { has: () => true } },
                content: '<@bot123> trigger error',
                reply: jest.fn<() => Promise<void>>().mockRejectedValueOnce(new Error('Discord API Down'))
            };

            await messageHandler(message);

            expect(ERROR_BUILDER.buildUnknownError).toHaveBeenCalled();
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