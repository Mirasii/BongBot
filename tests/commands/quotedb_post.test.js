const { server } = require('../mocks/server.js');
const { QuoteBuilder } = require('../../src/helpers/quoteBuilder.js');
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testCommandStructure, createMockInteraction, createMockClient } = require('../utils/commandTestUtils.js');

setupMockCleanup();
jest.mock('../../src/config/index.js', () => ({
    apis: {
        quotedb: {
            url: "https://quotes.elmu.dev",
            apikey: "mock_api_key",
            user_id: "mock_user_id",
        },
    },
}));

const quotedbPostCommand = require('../../src/commands/quotedb_post.js');

testCommandStructure(quotedbPostCommand, 'create_quote');

const callerMock = require('../../src/helpers/caller.js');
const errorBuilderMock = require('../../src/helpers/errorBuilder.js');

jest.mock('../../src/helpers/quoteBuilder.js', () => {
    return {
        QuoteBuilder: jest.fn().mockImplementation(() => {
            return {
                setTitle: jest.fn().mockReturnThis(),
                addQuotes: jest.fn().mockReturnThis(),
                build: jest.fn().mockReturnValue('Mocked Quote Embed'),
            };
        }),
    };
});

jest.mock('../../src/helpers/caller.js', () => ({
    post: jest.fn(),
}));

jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
    buildUnknownError: jest.fn(),
}));

describe('quotedb_post command execution', () => {
    const MOCK_GUILD = {
        id: 'mock_guild_id',
        name: 'Mock Guild',
    };

    const MOCK_API_CONFIG = {
        url: 'https://quotes.elmu.dev',
        endpoint: '/api/v1/quotes',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' },
    };

    const MOCK_QUOTE_DATA = {
        quote: 'Test Quote',
        author: 'Test Author',
        user_id: 'mock_user_id',
        date: 'mock_date',
    };

    const createQuoteInteraction = (quote = 'Test Quote', author = 'Test Author') => {
        const interaction = createMockInteraction({
            options: {
                getString: jest.fn((optionName) => {
                    if (optionName === 'quote') return quote;
                    if (optionName === 'author') return author;
                    return null;
                }),
            },
            reply: jest.fn(),
        });
        interaction.guild = MOCK_GUILD;
        return interaction;
    };

    const createMockMessage = (overrides = {}) => ({
        guild: MOCK_GUILD,
        ...overrides,
    });

    const expectApiCall = (quote, author) => {
        expect(callerMock.post).toHaveBeenCalledWith(
            MOCK_API_CONFIG.url,
            MOCK_API_CONFIG.endpoint,
            MOCK_API_CONFIG.headers,
            expect.objectContaining({
                quote,
                author,
                user_id: 'mock_user_id',
                date: expect.any(String),
                server: MOCK_GUILD,
            })
        );
    };

    const expectQuoteBuilderCalls = (expectedQuotes) => {
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('New Quote Created');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith(expectedQuotes);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
    };

    const mockClient = createMockClient();

    beforeAll(() => {
        server.listen();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => server.close());

    test('should successfully create a quote via slash command', async () => {
        callerMock.post.mockResolvedValueOnce({
            quote: MOCK_QUOTE_DATA,
        });

        const mockInteraction = createQuoteInteraction();
        const result = await quotedbPostCommand.execute(mockInteraction, mockClient);

        expectApiCall('Test Quote', 'Test Author');
        expectQuoteBuilderCalls([MOCK_QUOTE_DATA]);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should handle error when creating a quote via slash command', async () => {
        const mockError = new Error('API Error');
        callerMock.post.mockRejectedValueOnce(mockError);

        const mockInteraction = createQuoteInteraction();
        await quotedbPostCommand.execute(mockInteraction, mockClient);

        expect(errorBuilderMock.buildError).toHaveBeenCalledWith(mockInteraction, mockError);
    });

    test('should successfully create a quote via reply', async () => {
        const replyQuoteData = {
            quote: 'Replied Quote Content',
            author: 'Replied Author',
            user_id: 'mock_user_id',
            date: 'mock_date',
        };

        const mockRepliedMessage = createMockMessage({
            reference: true,
            content: 'Replied Quote Content',
            fetchReference: jest.fn().mockResolvedValueOnce({
                content: 'Replied Quote Content',
                member: {
                    displayName: 'Replied Author',
                },
            }),
        });

        callerMock.post.mockResolvedValueOnce({
            quote: replyQuoteData,
        });

        const result = await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

        expect(mockRepliedMessage.fetchReference).toHaveBeenCalledTimes(1);
        expectApiCall('Replied Quote Content', 'Replied Author');
        expectQuoteBuilderCalls([replyQuoteData]);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return message if no reply reference', async () => {
        const mockMessage = createMockMessage({
            reference: false,
        });

        const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
        expect(result).toBe('You need to reply to a message to create a quote from it.');
    });

    test('should return message if replied message is empty or inaccessible', async () => {
        const mockMessage = createMockMessage({
            reference: true,
            fetchReference: jest.fn().mockResolvedValueOnce({ content: '' }),
        });

        const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
        expect(result).toBe('The message you replied to is empty or I can\'t access it.');
    });

    test('should handle error when creating a quote via reply', async () => {
        const mockRepliedMessage = createMockMessage({
            reference: true,
            content: 'Replied Quote Content',
            fetchReference: jest.fn().mockResolvedValueOnce({
                content: 'Replied Quote Content',
                member: {
                    displayName: 'Replied Author',
                },
            }),
        });
        
        const mockError = new Error('API Error');
        callerMock.post.mockRejectedValueOnce(mockError);

        await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

        expect(errorBuilderMock.buildUnknownError).toHaveBeenCalledWith(mockError);
    });
});
