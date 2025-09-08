const { EmbedBuilder, Colors } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

const { QuoteBuilder } = require('../../src/helpers/quoteBuilder.js');

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
