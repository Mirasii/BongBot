const chatAiCommand = require('../../src/commands/chat_ai');
const { SlashCommandBuilder } = require('discord.js');
const CALLER = require('../../src/helpers/caller.js');
const { EMBED_BUILDER } = require('../../src/helpers/embedBuilder.js');
const api = require('../../src/config/index.js').apis;

jest.mock('../../src/helpers/caller.js');
jest.mock('../../src/helpers/embedBuilder.js');
jest.mock('@google/generative-ai', () => {
    const mockChat = {
        sendMessage: jest.fn().mockResolvedValue({
            response: {
                text: () => 'test response',
            },
        }),
    };
    const mockTextModel = {
        startChat: jest.fn().mockReturnValue(mockChat),
    };
    const mockImageModel = {
        generateContent: jest.fn().mockResolvedValue({
            response: {
                candidates: [{
                    content: {
                        parts: [{
                            inlineData: {
                                data: 'test_image_data',
                            },
                        }],
                    },
                }],
            },
        }),
    };
    const mockGenAI = {
        getGenerativeModel: jest.fn().mockImplementation((options) => {
            if (options.model.includes('pro-vision')) {
                return mockImageModel;
            }
            return mockTextModel;
        }),
    };
    return {
        GoogleGenerativeAI: jest.fn().mockImplementation(() => mockGenAI),
    };
});

describe('chat_ai command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        api.openai.active = true;
        api.googleai.active = false;
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
        const interaction = {
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

        CALLER.post.mockResolvedValue({ choices: [{ message: { content: 'test response' } }] });
        EMBED_BUILDER.prototype.constructEmbedWithRandomFile.mockReturnValue('test embed');

        const result = await chatAiCommand.execute(interaction);

        expect(CALLER.post).toHaveBeenCalled();
        expect(EMBED_BUILDER.prototype.constructEmbedWithRandomFile).toHaveBeenCalledWith('test response');
        expect(result).toBe('test embed');
    });

    it('should call Google AI API when it is active', async () => {
        api.openai.active = false;
        api.googleai.active = true;

        const interaction = {
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

        EMBED_BUILDER.prototype.constructEmbedWithAttachment.mockReturnValue({ addFooter: jest.fn().mockReturnValue({ build: jest.fn().mockReturnValue('test embed') }) });

        const result = await chatAiCommand.execute(interaction);

        expect(result).toBeDefined();
    });
});