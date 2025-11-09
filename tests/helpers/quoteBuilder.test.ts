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
    },
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