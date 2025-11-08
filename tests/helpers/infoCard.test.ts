import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { http, HttpResponse } from 'msw';
import { setupStandardTestEnvironment, server } from '../utils/testSetup.js';
import type { ExtendedClient } from '../../src/helpers/interfaces.js';

// Setup MSW server and standard test cleanup
setupStandardTestEnvironment();

// Create mock EmbedBuilder class
class MockEmbed {
    data: {
        title: string | null;
        color: string | null;
        thumbnail: { url: string | null } | null;
        description: string | null;
        fields: Array<{ name: string; value: string; inline: boolean }>;
        footer: { text: string; iconURL?: string | undefined } | null;
        timestamp: string | null;
    };

    constructor() {
        this.data = {
            title: null,
            color: null,
            thumbnail: null,
            description: null,
            fields: [],
            footer: null,
            timestamp: null
        };
    }

    setTitle(title: string) {
        this.data.title = title;
        return this;
    }

    setColor(color: string) {
        this.data.color = color;
        return this;
    }

    setThumbnail(url: string | null) {
        this.data.thumbnail = { url };
        return this;
    }

    setDescription(desc: string) {
        this.data.description = desc;
        return this;
    }

    addFields(...fields: Array<{ name: string; value: string; inline: boolean }>) {
        this.data.fields.push(...fields);
        return this;
    }

    setFooter(footer: { text: string; iconURL?: string | undefined }) {
        this.data.footer = footer;
        return this;
    }

    setTimestamp() {
        this.data.timestamp = new Date().toISOString();
        return this;
    }
}

const mockEmbedBuilder = jest.fn().mockImplementation(() => new MockEmbed());

// Mock discord.js EmbedBuilder and Colors
jest.unstable_mockModule('discord.js', () => ({
    EmbedBuilder: mockEmbedBuilder,
    Colors: {
        Purple: '#800080'
    }
}));

// Import after mocks are set up
const infoCard = await import('../../src/helpers/infoCard.js');

describe('infoCard helper', () => {
    const mockBot = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
        version: undefined
    } as unknown as ExtendedClient;

    beforeEach(() => {
        mockEmbedBuilder.mockClear();
        jest.clearAllMocks();
    });

    test('generateCard should return a well-formed info card on successful API calls', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'prod';

        const card = await infoCard.generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.title).toBeDefined();
        expect(card.data.color).toBeDefined();
        expect(card.data.fields).toBeInstanceOf(Array);
    });

    test('generateCard should handle GitHub API failure gracefully', async () => {
        process.env.BRANCH = 'dev';
        process.env.ENV = 'dev';

        // Mock failed GitHub API responses for both releases and branches
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
                return new HttpResponse(null, { status: 500 });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/dev', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

        // Need to re-import to clear the cached apiResponse
        const freshInfoCard = await import('../../src/helpers/infoCard.js?t=' + Date.now());
        const card = await freshInfoCard.generateCard(mockBot);

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
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/main', () => {
                return new HttpResponse(null, { status: 404 });
            })
        );

        // Need to re-import to clear the cached apiResponse
        const freshInfoCard = await import('../../src/helpers/infoCard.js?t=' + Date.now());
        const card = await freshInfoCard.generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.description).toContain('N/A');
        expect(card.data.description).toContain('Could not fetch from API.');
    });

    test('generateCard should handle missing bot avatar gracefully', async () => {
        const mockBotNoAvatar = {
            user: {
                displayAvatarURL: jest.fn(() => null),
            },
            version: undefined
        } as unknown as ExtendedClient;

        const card = await infoCard.generateCard(mockBotNoAvatar);
        expect(card).toBeDefined();
        expect(card.data.thumbnail).toEqual({ url: null });
    });

    test('generateCard should include all required fields', async () => {
        const card = await infoCard.generateCard(mockBot);
        
        expect(card.data.fields).toBeDefined();
        const requiredFields = ['Repository', 'Last Started', 'Node.js', 'Library'];
        for (const fieldName of requiredFields) {
            expect(card.data.fields?.some((f: { name: string }) => f.name.includes(fieldName))).toBe(true);
        }
    });

    test('uses fallback value when no Branch env var provided', async () => {
        // Store original value and unset BRANCH to test null coalescing fallback
        const originalBranch = process.env.BRANCH;
        delete process.env.BRANCH;
        process.env.ENV = 'dev';

        // Need to re-import to clear the cached apiResponse and force new API call
        const freshInfoCard = await import('../../src/helpers/infoCard.js?t=' + Date.now());
        const card = await freshInfoCard.generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.description).toContain('main'); // Should use fallback 'main'
        expect(card.data.description).toContain('abc'); // Should use our mock data
        if (originalBranch !== undefined) process.env.BRANCH = originalBranch;
    });
});