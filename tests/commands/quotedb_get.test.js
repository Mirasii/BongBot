import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';
import { QuoteBuilder } from '../../src/helpers/quoteBuilder.js';

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

const quotedbGetCommand = require('../../src/commands/quotedb_get.js');

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
    get: jest.fn(),
}));

// Mock the ERROR_BUILDER module
jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));

describe('quotedb_get command', () => {
    const mockInteraction = {
        options: {
            getInteger: jest.fn(),
        },
        reply: jest.fn(),
    };

    const mockClient = {};

    beforeAll(() => {
        server.use(
            http.get('https://quotes.elmu.dev/api/v1/quotes/search/user/:userId', ({ request, params }) => {
                const url = new URL(request.url);
                const maxQuotes = url.searchParams.get('max_quotes');
                const userId = params.userId;

                if (userId !== 'mock_user_id') {
                    return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }

                if (maxQuotes === '0') {
                    return HttpResponse.json({ quotes: [] }, { status: 200 });
                }

                const quotes = [];
                for (let i = 0; i < parseInt(maxQuotes || 1); i++) {
                    quotes.push({
                        quote: `Recent Quote ${i + 1}`,
                        author: `Author ${i + 1}`,
                    });
                }
                return HttpResponse.json({ quotes: quotes }, { status: 200 });
            })
        );
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
        jest.clearAllMocks();
    });

    afterAll(() => server.close());

    test('should return a single recent quote by default', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(null);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            quotes: [{
                quote: 'Recent Quote 1',
                author: 'Author 1',
            }],
        });

        const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/search/user/mock_user_id',
            'max_quotes=1',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('Recent Quotes');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([{
            quote: 'Recent Quote 1',
            author: 'Author 1',
        }]);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return the specified number of recent quotes', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(3);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            quotes: [
                { quote: 'Recent Quote 1', author: 'Author 1' },
                { quote: 'Recent Quote 2', author: 'Author 2' },
                { quote: 'Recent Quote 3', author: 'Author 3' },
            ],
        });

        const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/search/user/mock_user_id',
            'max_quotes=3',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([
            { quote: 'Recent Quote 1', author: 'Author 1' },
            { quote: 'Recent Quote 2', author: 'Author 2' },
            { quote: 'Recent Quote 3', author: 'Author 3' },
        ]);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return an error if more than 5 quotes are requested', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(6);

        await quotedbGetCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            new Error("You can only request up to 5 quotes at a time.")
        );
        expect(require('../../src/helpers/caller.js').get).not.toHaveBeenCalled();
    });

    test('should return an empty quote embed if no quotes are found', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(1);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({ quotes: [] });

        const result = await quotedbGetCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).not.toHaveBeenCalled();
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('Recent Quotes');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([]);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should handle API errors', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(1);
        const mockError = new Error('API Error');
        require('../../src/helpers/caller.js').get.mockRejectedValueOnce(mockError);

        await quotedbGetCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            mockError
        );
    });
});
