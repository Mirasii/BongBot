import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server.js';

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
        };        this.setTitle = function(title) {
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
        Colors: {
            Purple: '#800080'
        }
    };
});

// Do not mock the entire module to test actual implementation
const infoCard = require('../../src/helpers/infoCard.js');

const { generateCard } = require('../../src/helpers/infoCard.js');

describe('infoCard helper', () => {
    const mockBot = {
        user: {
            displayAvatarURL: jest.fn(() => 'http://example.com/bot_avatar.jpg'),
        },
    };

    // No need to mock Date.now or Math.floor if mocking the entire module

    beforeAll(() => server.listen());
    afterEach(() => {
        server.resetHandlers();
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => {}); // Mock console.warn
    });
    afterAll(() => server.close());

    test('generateCard should return a well-formed info card on successful API calls', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'prod';

        // Mock all required GitHub API endpoints
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
                return HttpResponse.json({
                    tag_name: 'v1.0.0'
                });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/main', () => {
                return HttpResponse.json({
                    commit: {
                        sha: 'abc123',
                        commit: {
                            message: 'Test commit',
                            author: {
                                name: 'Test Author',
                                date: new Date().toISOString()
                            }
                        },
                        author: {
                            avatar_url: 'http://example.com/avatar.jpg'
                        }
                    }
                });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/commits', () => {
                return HttpResponse.json([
                    {
                        sha: 'abc123',
                        commit: {
                            message: 'Test commit',
                            author: {
                                name: 'Test Author',
                                date: new Date().toISOString()
                            }
                        },
                        author: {
                            avatar_url: 'http://example.com/avatar.jpg'
                        }
                    }
                ]);
            })
        );

        const card = await infoCard.generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.title).toBeDefined();
        expect(card.data.color).toBeDefined();
        expect(card.data.fields).toBeInstanceOf(Array);
    });

    test('generateCard should handle GitHub API failure gracefully', async () => {
        process.env.BRANCH = 'dev';
        process.env.ENV = 'dev';

        // Reset the cached apiResponse to force a new API call
        const infoCardModule = require('../../src/helpers/infoCard.js');
        jest.resetModules();
        const freshInfoCard = require('../../src/helpers/infoCard.js');

        // Mock failed GitHub API responses for both releases and branches
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
                return new HttpResponse(null, { status: 500 });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/dev', () => {
                return new HttpResponse(null, { status: 500 });
            })
        );

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

        // Reset modules to clear cache
        jest.resetModules();
        const freshInfoCard = require('../../src/helpers/infoCard.js');

        // Mock successful releases but failed branches
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
                return HttpResponse.json({
                    tag_name: 'v1.0.0'
                });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/main', () => {
                return new HttpResponse(null, { status: 404 });
            })
        );

        const card = await freshInfoCard.generateCard(mockBot);

        expect(card).toBeDefined();
        expect(card.data.description).toContain('N/A');
        expect(card.data.description).toContain('Could not fetch from API.');
    });

    test('generateCard should handle different environments correctly', async () => {
        process.env.BRANCH = 'main';
        process.env.ENV = 'prod';

        // Mock GitHub API response
        server.use(
            http.get('https://api.github.com/repos/Mirasii/BongBot/branches/main', () => {
                return HttpResponse.json({
                    commit: {
                        sha: 'abc123',
                        html_url: 'https://github.com/Mirasii/BongBot/commit/abc123',
                        commit: {
                            message: 'Test commit'
                        }
                    }
                });
            }),
            http.get('https://api.github.com/repos/Mirasii/BongBot/releases/latest', () => {
                return HttpResponse.json({
                    tag_name: 'v1.0.0'
                });
            })
        );

        const card = await infoCard.generateCard(mockBot);
        expect(card.data.color).toBe('#800080');
        expect(card.data.description).toContain('main');
    });

    test('generateCard should handle missing bot avatar gracefully', async () => {
        const mockBotNoAvatar = {
            user: {
                displayAvatarURL: jest.fn(() => null),
                avatarURL: null
            }
        };

        const card = await infoCard.generateCard(mockBotNoAvatar);
        expect(card).toBeDefined();
        expect(card.data.thumbnail).toEqual({ url: null });
    });

    test('generateCard should include all required fields', async () => {
        const card = await infoCard.generateCard(mockBot);
        
        const requiredFields = ['Repository', 'Last Started', 'Node.js', 'Library'];
        for (const fieldName of requiredFields) {
            expect(card.data.fields.some(f => f.name.includes(fieldName))).toBe(true);
        }
    });
});