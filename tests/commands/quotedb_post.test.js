const { http, HttpResponse } = require('msw');
const { server } = require('../mocks/server.js');
const { QuoteBuilder } = require('../../src/helpers/quoteBuilder.js');
const { setupMockCleanup } = require('../utils/testSetup.js');
const { testCommandStructure } = require('../utils/commandStructureTestUtils.js');

// Setup standard mock cleanup only (MSW setup is custom in this file)
setupMockCleanup();

// Mock the config module to control API keys and URLs
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

// Test standard command structure
testCommandStructure(quotedbPostCommand, 'create_quote');

// Mock the QuoteBuilder to simplify assertions
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

// Mock the CALLER module
jest.mock('../../src/helpers/caller.js', () => ({
    post: jest.fn(),
}));

// Mock the ERROR_BUILDER module
jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
    buildUnknownError: jest.fn(),
}));

describe('quotedb_post command', () => {
    const mockInteraction = {
        options: {
            getString: jest.fn((optionName) => {
                if (optionName === 'quote') return 'Test Quote';
                if (optionName === 'author') return 'Test Author';
                return null;
            }),
        },
        reply: jest.fn(),
    };

    const mockClient = {};

    beforeAll(() => {
        // Add the quotedb handler to the existing handlers
        server.use(
            http.post('https://quotes.elmu.dev/api/v1/quotes', async ({ request }) => {
                const data = await request.json();
                if (data.quote === 'Test Quote' && data.author === 'Test Author') {
                    return HttpResponse.json({
                        quote: {
                            quote: 'Test Quote',
                            author: 'Test Author',
                            user_id: 'mock_user_id',
                            date: 'mock_date',
                        },
                    }, { status: 200 });
                }
                return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
            })
        );
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
    });

    afterAll(() => server.close());

    test('should successfully create a quote via slash command', async () => {
        require('../../src/helpers/caller.js').post.mockResolvedValueOnce({
            quote: {
                quote: 'Test Quote',
                author: 'Test Author',
                user_id: 'mock_user_id',
                date: 'mock_date',
            },
        });

        const result = await quotedbPostCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/caller.js').post).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }, // This API key will be mocked
            expect.objectContaining({
                quote: 'Test Quote',
                author: 'Test Author',
                user_id: 'mock_user_id',
            })
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('New Quote Created');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([{
            quote: 'Test Quote',
            author: 'Test Author',
            user_id: 'mock_user_id',
            date: 'mock_date',
        }]);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should handle error when creating a quote via slash command', async () => {
        const mockError = new Error('API Error');
        require('../../src/helpers/caller.js').post.mockRejectedValueOnce(mockError);

        await quotedbPostCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(mockInteraction, mockError);
    });

    test('should successfully create a quote via reply', async () => {
        const mockRepliedMessage = {
            reference: true,
            content: 'Replied Quote Content',
            fetchReference: jest.fn().mockResolvedValueOnce({
                content: 'Replied Quote Content',
                member: {
                    displayName: 'Replied Author',
                },
            }),
        };

        require('../../src/helpers/caller.js').post.mockResolvedValueOnce({
            quote: {
                quote: 'Replied Quote Content',
                author: 'Replied Author',
                user_id: 'mock_user_id',
                date: 'mock_date',
            },
        });

        const result = await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

        expect(mockRepliedMessage.fetchReference).toHaveBeenCalledTimes(1);
        expect(require('../../src/helpers/caller.js').post).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }, // This API key will be mocked
            expect.objectContaining({
                quote: 'Replied Quote Content',
                author: 'Replied Author',
                user_id: 'mock_user_id',
            })
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('New Quote Created');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([{
            quote: 'Replied Quote Content',
            author: 'Replied Author',
            user_id: 'mock_user_id',
            date: 'mock_date',
        }]);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return message if no reply reference', async () => {
        const mockMessage = {
            reference: false,
        };

        const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
        expect(result).toBe('You need to reply to a message to create a quote from it.');
    });

    test('should return message if replied message is empty or inaccessible', async () => {
        const mockMessage = {
            reference: true,
            fetchReference: jest.fn().mockResolvedValueOnce({ content: '' }), // Empty content
        };

        const result = await quotedbPostCommand.executeReply(mockMessage, mockClient);
        expect(result).toBe('The message you replied to is empty or I can\'t access it.');
    });

    test('should handle error when creating a quote via reply', async () => {
        const mockRepliedMessage = {
            reference: true,
            content: 'Replied Quote Content',
            fetchReference: jest.fn().mockResolvedValueOnce({
                content: 'Replied Quote Content',
                member: {
                    displayName: 'Replied Author',
                },
            }),
        };
        const mockError = new Error('API Error');
        require('../../src/helpers/caller.js').post.mockRejectedValueOnce(mockError);

        await quotedbPostCommand.executeReply(mockRepliedMessage, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildUnknownError).toHaveBeenCalledWith(mockError);
    });
});
