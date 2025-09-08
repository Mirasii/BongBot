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

const quotedbGetRandomCommand = require('../../src/commands/quotedb_get_random.js');

// Test standard command structure
testCommandStructure(quotedbGetRandomCommand, 'random_quotes');

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

describe('quotedb_get_random command execution', () => {
    const mockInteraction = {
        options: {
            getInteger: jest.fn(),
        },
        reply: jest.fn(),
    };

    const mockClient = {};

    beforeAll(() => {
        server.listen();
    });

    afterEach(() => {
        server.resetHandlers();
        // Set up buildError mock to return expected value
        require('../../src/helpers/errorBuilder.js').buildError.mockResolvedValue('Mocked Error Embed');
    });

    afterAll(() => server.close());

    test('should return a single random quote by default', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(null);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            quotes: [{
                quote: 'Random Quote 1',
                author: 'Author 1',
            }],
        });

        const result = await quotedbGetRandomCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/random/user/mock_user_id',
            'max_quotes=1',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.setTitle).toHaveBeenCalledWith('Random Quotes');
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([{
            quote: 'Random Quote 1',
            author: 'Author 1',
        }]);
        expect(QuoteBuilder.mock.results[0].value.build).toHaveBeenCalledWith(mockClient);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return the specified number of random quotes', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(3);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            quotes: [
                { quote: 'Random Quote 1', author: 'Author 1' },
                { quote: 'Random Quote 2', author: 'Author 2' },
                { quote: 'Random Quote 3', author: 'Author 3' },
            ],
        });

        const result = await quotedbGetRandomCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/random/user/mock_user_id',
            'max_quotes=3',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );
        expect(QuoteBuilder).toHaveBeenCalledTimes(1);
        expect(QuoteBuilder.mock.results[0].value.addQuotes).toHaveBeenCalledWith([
            { quote: 'Random Quote 1', author: 'Author 1' },
            { quote: 'Random Quote 2', author: 'Author 2' },
            { quote: 'Random Quote 3', author: 'Author 3' },
        ]);
        expect(result).toBe('Mocked Quote Embed');
    });

    test('should return an error if more than 5 quotes are requested', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(6);

        await quotedbGetRandomCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            new Error("You can only request up to 5 quotes at a time.")
        );
        expect(require('../../src/helpers/caller.js').get).not.toHaveBeenCalled();
    });

    test('should return an empty quote embed if no quotes are found', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(1);
        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({ quotes: [] });

        const result = await quotedbGetRandomCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            expect.objectContaining({ message: "No quotes found." })
        );
        expect(result).toBe('Mocked Error Embed');
    });

    test('should handle API errors', async () => {
        mockInteraction.options.getInteger.mockReturnValueOnce(1);
        const mockError = new Error('API Error');
        require('../../src/helpers/caller.js').get.mockRejectedValueOnce(mockError);

        await quotedbGetRandomCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            mockError
        );
    });
});
