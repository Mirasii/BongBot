import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { setupMockCleanup } from '../utils/testSetup.js';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';

// Create mock EmbedBuilder class
class MockEmbedBuilder {
    title: string | null = null;
    fields: Array<{ name: string; value: string; inline: boolean }> = [];
    footer: { text: string; iconURL?: string } | null = null;
    timestamp: boolean | null = null;
    color: string | number | null = null;

    setTitle = jest.fn((title: string) => {
        this.title = title;
        return this;
    });

    addFields = jest.fn((fields: Array<{ name: string; value: string; inline: boolean }>) => {
        this.fields = this.fields.concat(fields);
        return this;
    });

    setFooter = jest.fn((footer: { text: string; iconURL?: string }) => {
        this.footer = footer;
        return this;
    });

    setTimestamp = jest.fn(() => {
        this.timestamp = true;
        return this;
    });

    setColor = jest.fn((color: string | number) => {
        this.color = color;
        return this;
    });

    toJSON = jest.fn(() => ({
        title: this.title,
        fields: this.fields,
        footer: this.footer,
        timestamp: this.timestamp,
        color: this.color,
        mockEmbed: true,
    }));
}

const mockEmbedBuilderConstructor = jest.fn(() => new MockEmbedBuilder());

// Mock discord.js EmbedBuilder and Colors
jest.unstable_mockModule('discord.js', () => ({
    EmbedBuilder: mockEmbedBuilderConstructor,
    Colors: {
        Purple: 10181046,
        Red: 16711680,
    },
    MessageFlags: {
        Ephemeral: 1 << 6,
    },
    AttachmentBuilder: jest.fn(),
    Client: jest.fn(),
    Collection: jest.fn(),
    ChatInputCommandInteraction: jest.fn(),
    CommandInteraction: jest.fn(),
}));

// Import after mocks are set up
const { default: QuoteBuilder } = await import('../../src/helpers/quoteBuilder.js');
const { Colors } = await import('discord.js');

// Setup standard mock cleanup
setupMockCleanup();

describe('QuoteBuilder class', () => {
    beforeEach(() => {
        mockEmbedBuilderConstructor.mockClear();
    });

    test('constructor should initialize embed', () => {
        const builder = new QuoteBuilder();
        expect(mockEmbedBuilderConstructor).toHaveBeenCalledTimes(1);
    });

    test('setTitle should correctly set the embed title', () => {
        const builder = new QuoteBuilder();
        const title = 'Test Title';
        builder.setTitle(title);
        
        // Get the mock instance that was created
        const mockInstance = mockEmbedBuilderConstructor.mock.results[0].value as MockEmbedBuilder;
        expect(mockInstance.setTitle).toHaveBeenCalledWith(`📜 ${title}`);
    });

    test('addQuotes should correctly add quotes as fields', () => {
        const builder = new QuoteBuilder();
        const quotes = [
            { quote: 'Quote 1', author: 'Author 1' },
            { quote: 'Quote 2', author: 'Author 2' },
        ];
        builder.addQuotes(quotes);
        
        // Get the mock instance that was created
        const mockInstance = mockEmbedBuilderConstructor.mock.results[0].value as MockEmbedBuilder;
        expect(mockInstance.addFields).toHaveBeenCalledWith([
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
        } as unknown as ExtendedClient;

        const result = builder.build(mockClient);

        // Get the mock instance that was created
        const mockInstance = mockEmbedBuilderConstructor.mock.results[0].value as MockEmbedBuilder;
        expect(mockInstance.setFooter).toHaveBeenCalledWith({
            text: 'BongBot • Quotes from quotes.elmu.dev',
            iconURL: 'http://example.com/bot_avatar.jpg',
        });
        expect(mockInstance.setTimestamp).toHaveBeenCalled();
        expect(mockInstance.setColor).toHaveBeenCalledWith(Colors.Purple);
        expect(result).toEqual({
            embeds: [expect.any(MockEmbedBuilder)],
        });
        expect(mockClient.user?.displayAvatarURL).toHaveBeenCalled();
    });
});

describe('QuoteBuilder getQuote method', () => {
    // Mock the config module
    const mockApis = {
        quotedb: {
            url: 'https://quotes.elmu.dev',
            apikey: 'test_api_key',
            user_id: 'test_user_id',
        },
    };

    const mockCallerGet = jest.fn<() => Promise<any>>();
    const mockBuildError = jest.fn<() => Promise<string>>().mockResolvedValue('Mocked Error Embed');

    beforeEach(() => {
        mockEmbedBuilderConstructor.mockClear();
        mockCallerGet.mockClear();
        mockBuildError.mockClear();
    });

    test('should return error when more than 5 quotes requested', async () => {
        // Need to re-import with mocked dependencies
        jest.unstable_mockModule('../../src/config/index.js', () => ({
            apis: mockApis,
        }));

        jest.unstable_mockModule('../../src/helpers/caller.js', () => ({
            default: {
                get: mockCallerGet,
            },
        }));

        jest.unstable_mockModule('../../src/helpers/errorBuilder.js', () => ({
            buildError: mockBuildError,
        }));

        const { default: QuoteBuilderWithMocks } = await import('../../src/helpers/quoteBuilder.js?cacheBust=1');

        const builder = new QuoteBuilderWithMocks();
        const mockInteraction = {
            options: {
                getInteger: jest.fn(() => 6),
                getBoolean: jest.fn(() => null),
            },
            guild: {
                id: 'test_guild_id',
            },
        } as any;

        const mockClient = {
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
            },
        } as unknown as ExtendedClient;

        const result = await builder.getQuote('/api/v1/quotes/random', 'Random Quotes', mockClient, mockInteraction);

        expect(mockBuildError).toHaveBeenCalledWith(
            mockInteraction,
            expect.objectContaining({ message: 'You can only request up to 5 quotes at a time.' })
        );
        expect(mockCallerGet).not.toHaveBeenCalled();
        expect(result).toBe('Mocked Error Embed');
    });

    test('should return error when no quotes found', async () => {
        mockCallerGet.mockResolvedValueOnce({ quotes: [] });

        const { default: QuoteBuilderWithMocks } = await import('../../src/helpers/quoteBuilder.js?cacheBust=2');

        const builder = new QuoteBuilderWithMocks();
        const mockInteraction = {
            options: {
                getInteger: jest.fn(() => 1),
                getBoolean: jest.fn(() => null),
            },
            guild: {
                id: 'test_guild_id',
            },
        } as any;

        const mockClient = {
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
            },
        } as unknown as ExtendedClient;

        const result = await builder.getQuote('/api/v1/quotes/random', 'Random Quotes', mockClient, mockInteraction);

        expect(mockBuildError).toHaveBeenCalledWith(
            mockInteraction,
            expect.objectContaining({ message: 'No quotes found.' })
        );
        expect(result).toBe('Mocked Error Embed');
    });

    test('should successfully fetch and build quotes for server', async () => {
        mockCallerGet.mockResolvedValueOnce({
            quotes: [
                { quote: 'Test Quote 1', author: 'Author 1' },
                { quote: 'Test Quote 2', author: 'Author 2' },
            ],
        });

        const { default: QuoteBuilderWithMocks } = await import('../../src/helpers/quoteBuilder.js?cacheBust=3');

        const builder = new QuoteBuilderWithMocks();
        const mockInteraction = {
            options: {
                getInteger: jest.fn(() => 2),
                getBoolean: jest.fn(() => true),
            },
            guild: {
                id: 'test_guild_id',
            },
        } as any;

        const mockClient = {
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
            },
        } as unknown as ExtendedClient;

        const result = await builder.getQuote('/api/v1/quotes/random', 'Random Quotes', mockClient, mockInteraction);

        expect(mockCallerGet).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/random/server/test_guild_id',
            'max_quotes=2',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer test_api_key' }
        );
        expect(result).toHaveProperty('embeds');
    });

    test('should successfully fetch and build quotes for user', async () => {
        mockCallerGet.mockResolvedValueOnce({
            quotes: [
                { quote: 'User Quote', author: 'User Author' },
            ],
        });

        const { default: QuoteBuilderWithMocks } = await import('../../src/helpers/quoteBuilder.js?cacheBust=4');

        const builder = new QuoteBuilderWithMocks();
        const mockInteraction = {
            options: {
                getInteger: jest.fn(() => null),
                getBoolean: jest.fn(() => false),
            },
            guild: {
                id: 'test_guild_id',
            },
        } as any;

        const mockClient = {
            user: {
                displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
            },
        } as unknown as ExtendedClient;

        const result = await builder.getQuote('/api/v1/quotes/search', 'Recent Quotes', mockClient, mockInteraction);

        expect(mockCallerGet).toHaveBeenCalledWith(
            'https://quotes.elmu.dev',
            '/api/v1/quotes/search/user/test_user_id',
            'max_quotes=1',
            { 'Content-Type': 'application/json', 'Authorization': 'Bearer test_api_key' }
        );
        expect(result).toHaveProperty('embeds');
    });
});