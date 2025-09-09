// Mock caller helper
const mockGet = jest.fn();
jest.mock('../../src/helpers/caller.js', () => ({
    get: mockGet
}));

// Mock discord.js EmbedBuilder and Colors
jest.mock('discord.js', () => {
    const MockEmbed = function() {
        this.data = {
            title: null,
            color: null,
            thumbnail: null,
            description: null,
            fields: [],
            footer: null,
            timestamp: null
        };
        this.setTitle = function(title) {
            this.data.title = title;
            return this;
        };
        
        this.setColor = function(color) {
            this.data.color = color;
            return this;
        };
        
        this.setThumbnail = function(url) {
            this.data.thumbnail = { url };
            return this;
        };
        
        this.setDescription = function(desc) {
            this.data.description = desc;
            return this;
        };
        
        this.addFields = function(...fields) {
            this.data.fields.push(...fields);
            return this;
        };
        
        this.setFooter = function(footer) {
            this.data.footer = footer;
            return this;
        };
        
        this.setTimestamp = function() {
            this.data.timestamp = new Date().toISOString();
            return this;
        };
    };

    return {
        EmbedBuilder: jest.fn().mockImplementation(() => new MockEmbed()),
        Colors: { Purple: '#800080' }
    };
});

describe('infoCard helper', () => {
    const mockBot = { user: { displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg') } };

    beforeEach(() => {
        mockGet.mockClear();
        // Reset module cache to ensure fresh API calls
        jest.resetModules();
    });

    // No need to mock Date.now or Math.floor if mocking the entire module

    test('generateCard should return a well-formed info card on successful API calls', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'prod';

        // Mock successful API responses
        mockGet.mockResolvedValueOnce({ tag_name: 'v1.0.0' }) // releases/latest
            .mockResolvedValueOnce({
                commit: { sha: 'abc123def456', commit: { message: 'Test commit message' },
                    html_url: 'https://github.com/Mirasii/BongBot/commit/abc123def456'
                }
            }); // branches/main

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.title).toBeDefined();
        expect(card.data.color).toBeDefined();
        expect(card.data.fields).toBeInstanceOf(Array);
        expect(mockGet).toHaveBeenCalledTimes(2);
        expect(mockGet).toHaveBeenNthCalledWith(
            1,
            'https://api.github.com/repos/Mirasii/BongBot',
            '/releases/latest',
            null,
            { 'User-Agent': 'Node.js-Deploy-Script' }
        );
        expect(mockGet).toHaveBeenNthCalledWith(
            2,
            'https://api.github.com/repos/Mirasii/BongBot',
            '/branches/main',
            null,
            { 'User-Agent': 'Node.js-Deploy-Script' }
        );

        const requiredFields = ['Repository', 'Last Started', 'Node.js', 'Library'];
        for (const fieldName of requiredFields) {
            expect(card.data.fields.some(f => f.name.includes(fieldName))).toBe(true);
        }
    });

    test('generateCard should handle GitHub API failure gracefully', async () => {
        process.env.BRANCH = 'dev';
        process.env.ENV = 'dev';

        // Mock failed GitHub API responses for both releases and branches
        mockGet.mockRejectedValue(new Error('Network response was not ok: 500 Internal Server Error'));

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.title).toBeDefined();
        expect(card.data.color).toBeDefined();
        // Should show fallback values when API fails
        expect(card.data.description).toContain('N/A');
        expect(card.data.description).toContain('Could not fetch from API.');
        expect(card.data.fields).toBeInstanceOf(Array);
    });

    test('generateCard should handle branches API failure specifically', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'dev';

        // Mock successful releases but failed branches
        mockGet
            .mockResolvedValueOnce({ tag_name: 'v1.0.0' }) // releases/latest succeeds
            .mockRejectedValueOnce(new Error('Network response was not ok: 404 Not Found')); // branches/main fails

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.description).toContain('N/A');
        expect(card.data.description).toContain('Could not fetch from API.');
    });

    test('generateCard should handle missing bot avatar gracefully', async () => {
        const mockBotNoAvatar = { user: { displayAvatarURL: jest.fn(() => null), avatarURL: null }};

        // Mock successful API responses
        mockGet
            .mockResolvedValueOnce({ tag_name: 'v1.0.0' })
            .mockResolvedValueOnce({
                commit: { sha: 'abc123def456', commit: { message: 'Test commit message' },
                    html_url: 'https://github.com/Mirasii/BongBot/commit/abc123def456'
                }
            });

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBotNoAvatar);
        expect(card).toBeDefined();
        expect(card.data.thumbnail).toEqual({ url: null });
    });

    test('uses fallback value when no Branch env var provided', async () => {
        // Store original value and unset BRANCH to test null coalescing fallback
        const originalBranch = process.env.BRANCH;
        delete process.env.BRANCH;
        process.env.ENV = 'dev';

        // Mock successful API responses with 'main' branch (fallback)
        mockGet
            .mockResolvedValueOnce({ tag_name: 'v1.0.0' })
            .mockResolvedValueOnce({
                commit: { sha: 'abc123def456', commit: { message: 'Test commit message' },
                    html_url: 'https://github.com/Mirasii/BongBot/commit/abc123def456'
                }
            });

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.description).toContain('main'); // Should use fallback 'main'
        expect(card.data.description).toContain('abc123d'); // Should use our mock data
        if (originalBranch !== undefined) process.env.BRANCH = originalBranch;
    });

    test('generateCard should use cached values for repeated calls', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'prod';

        // Mock successful API responses
        mockGet.mockResolvedValueOnce({ tag_name: 'v1.0.0' }) // releases/latest
            .mockResolvedValueOnce({
                commit: { sha: 'abc123def456', commit: { message: 'Test commit message' },
                    html_url: 'https://github.com/Mirasii/BongBot/commit/abc123def456'
                }
            }); // branches/main

        const { generateCard } = require('../../src/helpers/infoCard.js');
        const card = await generateCard(mockBot);
        const card2 = await generateCard(mockBot); // Call again to test caching

        expect(card).toBeDefined();
        expect(card2).toBeDefined();
        expect(JSON.stringify(card)).toBe(JSON.stringify(card2)); // Should return cached version on second call
        expect(mockGet).toHaveBeenCalledTimes(2); // API should only be called twice total
    });
    
});