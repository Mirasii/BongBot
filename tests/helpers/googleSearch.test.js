const { EmbedBuilder } = require('discord.js');
const { setupMockCleanup } = require('../utils/testSetup.js');

const googleSearch = require('../../src/helpers/googleSearch.js');

// Mock the CALLER module
jest.mock('../../src/helpers/caller.js', () => ({
    get: jest.fn(),
}));

// Mock the config module for Google API keys
jest.mock('../../src/config/index.js', () => ({
    apis: {
        google: {
            url: "https://www.googleapis.com",
            apikey: "mock_google_api_key",
            cx: "mock_google_cx",
        },
    },
}));

// Mock EmbedBuilder
jest.mock('discord.js', () => ({
    EmbedBuilder: jest.fn().mockImplementation(() => ({
        setImage: jest.fn().mockReturnThis(),
        setDescription: jest.fn().mockReturnThis(),
        toJSON: jest.fn().mockReturnValue({ mockEmbed: true }),
    })),
}));

// Setup standard mock cleanup
setupMockCleanup();

describe('googleSearch helper', () => {
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);

    beforeEach(() => {
        mockMathRandom.mockClear(); // Clear mock calls for Math.random
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('searchImage should return an embed with a random image URL', async () => {
        const mockQuery = 'test query';
        const mockImageLinks = [
            'http://example.com/image1.jpg',
            'http://example.com/image2.png',
            'http://example.com/image3.gif',
        ];

        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            items: mockImageLinks.map(link => ({ link: link })),
        });

        const result = await googleSearch.searchImage(mockQuery);

        expect(require('../../src/helpers/caller.js').get).toHaveBeenCalledWith(
            'https://www.googleapis.com',
            '/customsearch/v1',
            expect.stringContaining('q=test+query'),
            {}
        );
        expect(EmbedBuilder).toHaveBeenCalledTimes(1);
        expect(EmbedBuilder.mock.results[0].value.setImage).toHaveBeenCalledWith(mockImageLinks[0]); // Math.random(0.1) * 50 = 5, so index 0
        expect(EmbedBuilder.mock.results[0].value.setDescription).toHaveBeenCalledWith(mockImageLinks[0]);
        expect(result).toEqual({
            embeds: [{ mockEmbed: true }],
        });
    });

    test('searchImage should throw an error if no images are found', async () => {
        const mockQuery = 'no images';

        require('../../src/helpers/caller.js').get.mockResolvedValueOnce({
            items: [],
        });

        await expect(googleSearch.searchImage(mockQuery)).rejects.toThrow('No images found');
        expect(EmbedBuilder).not.toHaveBeenCalled();
    });

    test('searchImage should handle API errors', async () => {
        const mockQuery = 'error query';
        const mockError = new Error('API call failed');

        require('../../src/helpers/caller.js').get.mockRejectedValueOnce(mockError);

        await expect(googleSearch.searchImage(mockQuery)).rejects.toThrow('API call failed');
        expect(console.error).toHaveBeenCalledWith(mockError);
        expect(EmbedBuilder).not.toHaveBeenCalled();
    });
});
