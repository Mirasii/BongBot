const { EmbedBuilder, Colors } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

const { QuoteBuilder, getQuote } = require('../../src/helpers/quoteBuilder.js');

// Mock discord.js EmbedBuilder and Colors
jest.mock('discord.js', () => ({
    EmbedBuilder: jest.fn().mockImplementation(function() {
        this.title = null;
        this.fields = [];
        this.footer = null;
        this.timestamp = null;
        this.color = null;
        this.setTitle = jest.fn(function(title) { this.title = title; return this; });
        this.addFields = jest.fn(function(fields) { this.fields = this.fields.concat(fields); return this; });
        this.setFooter = jest.fn(function(footer) { this.footer = footer; return this; });
        this.setTimestamp = jest.fn(function() { this.timestamp = true; return this; });
        this.setColor = jest.fn(function(color) { this.color = color; return this; });
        this.toJSON = jest.fn(function() {
            return {
                title: this.title,
                fields: this.fields,
                footer: this.footer,
                timestamp: this.timestamp,
                color: this.color,
                mockEmbed: true,
            };
        });
    }),
    Colors: {
        Purple: '#800080',
    },
}));

// Mock the config module
jest.mock('../../src/config/index.js', () => ({
    apis: {
        quotedb: {
            url: "https://quotes.elmu.dev",
            apikey: "mock_api_key",
            user_id: "mock_user_id",
        },
    },
}));

// Mock the CALLER module
jest.mock('../../src/helpers/caller.js', () => ({
    get: jest.fn(),
}));

// Mock the ERROR_BUILDER module
jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));

// Setup standard mock cleanup
setupMockCleanup();

describe('QuoteBuilder class', () => {

    test('constructor should initialize embed', () => {
        const builder = new QuoteBuilder();
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(builder.embed).toBeInstanceOf(EmbedBuilder);
    });

    test('setTitle should correctly set the embed title', () => {
        const builder = new QuoteBuilder();
        const title = 'Test Title';
        builder.setTitle(title);
        expect(builder.embed.setTitle).toHaveBeenCalledWith(`📜 ${title}`);
    });

    test('addQuotes should correctly add quotes as fields', () => {
        const builder = new QuoteBuilder();
        const quotes = [
            { quote: 'Quote 1', author: 'Author 1' },
            { quote: 'Quote 2', author: 'Author 2' },
        ];
        builder.addQuotes(quotes);
        expect(builder.embed.addFields).toHaveBeenCalledWith([
            { name: '*"Quote 1"*', value: '🪶 - Author 1', inline: false },
            { name: '*"Quote 2"*', value: '🪶 - Author 2', inline: false },
        ]);
    });

    test('build should correctly set footer, timestamp, color and return embed', () => {
        const builder = new QuoteBuilder();
        const mockClient = {
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
            },
        };

        const result = builder.build(mockClient);

        expect(builder.embed.setFooter).toHaveBeenCalledWith({
            text: 'BongBot • Quotes from quotes.elmu.dev',
            iconURL: 'http://example.com/bot_avatar.jpg',
        });
        expect(builder.embed.setTimestamp).toHaveBeenCalledTimes(1);
        expect(builder.embed.setColor).toHaveBeenCalledWith(Colors.Purple);
        expect(result).toEqual({
            embeds: [expect.any(EmbedBuilder)],
        });
        expect(mockClient.user.displayAvatarURL).toHaveBeenCalledTimes(1);
    });
});

describe('getQuote function', () => {
    const mockInteraction = {
        options: {
            getInteger: jest.fn(),
            getBoolean: jest.fn(),
        },
        guild: {
            id: 'mock_guild_id',
        },
    };

    const mockClient = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
    };

    beforeEach(() => {
        // Clear all mocks
        jest.clearAllMocks();
        require('../../src/helpers/caller.js').get.mockClear();
        require('../../src/helpers/errorBuilder.js').buildError.mockClear();
    });

    test('should return quotes successfully with default number (1)', async () => {
        mockInteraction.options.getInteger.mockReturnValue(null); // Default to 1
        mockInteraction.options.getBoolean.mockReturnValue(null); // Default to server quotes
        
        const mockQuotes = [
            { quote: 'Test quote', author: 'Test author' }
        ];
        
        require('../../src/helpers/caller.js').get.mockResolvedValue({
            quotes: mockQuotes
        });

        const result = await getQuote('Test Quotes', mockInteraction, '/api/v1/quotes/test', mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/test/server/mock_guild_id',
            'max_quotes=1',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );

        expect(result).toEqual({
            embeds: [expect.any(EmbedBuilder)],
        });
    });

    test('should use user endpoint when server is false', async () => {
        mockInteraction.options.getInteger.mockReturnValue(2);
        mockInteraction.options.getBoolean.mockReturnValue(false); // Use user quotes
        
        const mockQuotes = [
            { quote: 'User quote 1', author: 'Author 1' },
            { quote: 'User quote 2', author: 'Author 2' }
        ];
        
        require('../../src/helpers/caller.js').get.mockResolvedValue({
            quotes: mockQuotes
        });

        await getQuote('User Quotes', mockInteraction, '/api/v1/quotes/user', mockClient);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/user/user/mock_user_id',
            'max_quotes=2',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer mock_api_key' }
        );
    });

    test('should return error when requesting more than 5 quotes', async () => {
        mockInteraction.options.getInteger.mockReturnValue(6);
        
        require('../../src/helpers/errorBuilder.js').buildError.mockResolvedValue('Error response');

        const result = await getQuote('Too Many Quotes', mockInteraction, '/api/v1/quotes/test', mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            expect.objectContaining({
                message: "You can only request up to 5 quotes at a time."
            })
        );
        expect(result).toBe('Error response');
    });

    test('should return error when no quotes are found', async () => {
        mockInteraction.options.getInteger.mockReturnValue(1);
        mockInteraction.options.getBoolean.mockReturnValue(true);
        
        require('../../src/helpers/caller.js').get.mockResolvedValue({
            quotes: []
        });
        
        require('../../src/helpers/errorBuilder.js').buildError.mockResolvedValue('No quotes error');

        const result = await getQuote('Empty Quotes', mockInteraction, '/api/v1/quotes/test', mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            expect.objectContaining({
                message: "No quotes found."
            })
        );
        expect(result).toBe('No quotes error');
    });

    test('should change title from "Quotes" to "Quote" for single quote', async () => {
        mockInteraction.options.getInteger.mockReturnValue(1);
        mockInteraction.options.getBoolean.mockReturnValue(true);
        
        const mockQuotes = [
            { quote: 'Single quote', author: 'Single author' }
        ];
        
        require('../../src/helpers/caller.js').get.mockResolvedValue({
            quotes: mockQuotes
        });

        await getQuote('Random Quotes', mockInteraction, '/api/v1/quotes/random', mockClient);

        // Check that QuoteBuilder setTitle was called with "Random Quote" (singular)
        expect(EmbedBuilder).toHaveBeenCalled();
        const builderInstance = EmbedBuilder.mock.instances[EmbedBuilder.mock.instances.length - 1];
        expect(builderInstance.setTitle).toHaveBeenCalledWith('📜 Random Quote');
    });

    test('should keep plural title for multiple quotes', async () => {
        mockInteraction.options.getInteger.mockReturnValue(2);
        mockInteraction.options.getBoolean.mockReturnValue(true);
        
        const mockQuotes = [
            { quote: 'Quote 1', author: 'Author 1' },
            { quote: 'Quote 2', author: 'Author 2' }
        ];
        
        require('../../src/helpers/caller.js').get.mockResolvedValue({
            quotes: mockQuotes
        });

        await getQuote('Random Quotes', mockInteraction, '/api/v1/quotes/random', mockClient);

        // Check that QuoteBuilder setTitle was called with "Random Quotes" (plural)
        expect(EmbedBuilder).toHaveBeenCalled();
        const builderInstance = EmbedBuilder.mock.instances[EmbedBuilder.mock.instances.length - 1];
        expect(builderInstance.setTitle).toHaveBeenCalledWith('📜 Random Quotes');
    });
});
