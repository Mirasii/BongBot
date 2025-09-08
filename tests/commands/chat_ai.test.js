const chatAiCommand = require('../../src/commands/chat_ai');
const { server } = require('../mocks/server.js');
const { EMBED_BUILDER } = require('../../src/helpers/embedBuilder.js');
const { SlashCommandBuilder } = require('discord.js');
const { http, HttpResponse } = require('msw');

// Mock the config module to control API keys and URLs
jest.mock('../../src/config/index.js', () => ({
    apis: {
        openai: {
            active: true,
            url: "https://api.openai.com",
            apikey: "mock_openai_key",
            model: "gpt-4o",
        },
        googleai: {
            active: false,
            url: "https://generativelanguage.googleapis.com",
            apikey: "mock_googleai_key",
            model: "gemini-2.5-flash-lite",
            image_model: "gemini-2.5-flash-image-preview",
        },
    },
}));

// Import the mocked api after the mock is defined
const api = require('../../src/config/index.js').apis;

jest.mock('../../src/helpers/embedBuilder.js');

describe('chat_ai command', () => {
    beforeAll(() => server.listen());
    afterEach(() => server.resetHandlers());
    afterAll(() => server.close());

    const mockClient = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
    };

    let mockInteraction;

    beforeEach(() => {
        api.openai.active = true;
        api.googleai.active = false;
        EMBED_BUILDER.prototype.constructEmbedWithRandomFile.mockReturnValue('mocked embed');
        EMBED_BUILDER.prototype.constructEmbedWithAttachment.mockReturnValue({
            addFooter: jest.fn().mockReturnThis(),
            build: jest.fn().mockReturnValue('mocked embed with attachment'),
        });

        mockInteraction = {
            options: {
                getString: jest.fn().mockReturnValue('test input'),
            },
            guild: {
                members: {
                    fetch: jest.fn().mockResolvedValue({ nickname: 'test_user' }),
                },
                id: 'test_server',
            },
            user: {
                id: 'test_user_id',
            },
        };
    });

    it('should have a data property', () => {
        expect(chatAiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "chat"', () => {
        expect(chatAiCommand.data.name).toBe('chat');
    });

    it('should have a description', () => {
        expect(chatAiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(chatAiCommand.execute).toBeInstanceOf(Function);
    });

    it('should call OpenAI API when it is active', async () => {
        const result = await chatAiCommand.execute(mockInteraction, mockClient);

        expect(result).toBe('mocked embed');
    });

    it('should call Google AI API when it is active', async () => {
        api.openai.active = false;
        api.googleai.active = true;

        const result = await chatAiCommand.execute(mockInteraction, mockClient);

        expect(result).toBe('mocked embed with attachment');
    });

    it('should return a message when no AI is active', async () => {
        api.openai.active = false;
        api.googleai.active = false;

        const result = await chatAiCommand.execute(mockInteraction, mockClient);

        expect(EMBED_BUILDER.prototype.constructEmbedWithRandomFile).toHaveBeenCalledWith('Hmph! Why are you trying to talk to me when no AI service is active?');
        expect(result).toBe('mocked embed');
    });

    it('should handle legacy commands', async () => {
        const mockMsg = {
            content: '<@123456789> test input',
            guild: {
                members: {
                    fetch: jest.fn().mockResolvedValue({ nickname: 'test_user' }),
                },
                id: 'test_server',
            },
            author: {
                id: 'test_user_id',
            },
        };

        const result = await chatAiCommand.executeLegacy(mockMsg, mockClient);
        expect(result).toBe('mocked embed');
    });

    it('should throw an error when OpenAI API call fails', async () => {
        server.use(
            http.post('https://api.openai.com/v1/chat/completions', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        await expect(chatAiCommand.execute(mockInteraction, mockClient)).rejects.toThrow();
    });
});