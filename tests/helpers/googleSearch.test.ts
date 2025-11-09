import { jest, describe, test, expect, beforeEach } from '@jest/globals';
import { setupMockCleanup } from '../utils/testSetup.js';

// Create mock functions with proper typing
const mockGet = jest.fn<(endpoint: string, path: string, params: string, options: object) => Promise<{ items: Array<{ link: string }> }>>();
const mockSetImage = jest.fn().mockReturnThis();
const mockSetDescription = jest.fn().mockReturnThis();
const mockToJSON = jest.fn().mockReturnValue({ mockEmbed: true });
const mockEmbedBuilder = jest.fn().mockImplementation(() => ({
    setImage: mockSetImage,
    setDescription: mockSetDescription,
    toJSON: mockToJSON,
}));

// Mock the CALLER module
jest.unstable_mockModule('../../src/helpers/caller.js', () => ({
    default: {
        get: mockGet,
    },
}));

// Mock the config module for Google API keys
jest.unstable_mockModule('../../src/config/index.js', () => ({
    default: {
        apis: {
            google: {
                url: "https://www.googleapis.com",
                apikey: "mock_google_api_key",
                cx: "mock_google_cx",
            },
        },
    },
}));

// Mock EmbedBuilder
jest.unstable_mockModule('discord.js', () => ({
    EmbedBuilder: mockEmbedBuilder,
}));

// Import after mocks are set up
const googleSearch = await import('../../src/helpers/googleSearch.js');

// Setup standard mock cleanup
setupMockCleanup();

describe('googleSearch helper', () => {
    const mockMathRandom = jest.spyOn(Math, 'random').mockReturnValue(0.1);

    beforeEach(() => {
        mockMathRandom.mockClear(); // Clear mock calls for Math.random
        mockGet.mockClear();
        mockEmbedBuilder.mockClear();
        mockSetImage.mockClear();
        mockSetDescription.mockClear();
        mockToJSON.mockClear();
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    test('searchImage should return an embed with a random image URL', async () => {
        const mockQuery = 'test query';
        const mockImageLinks = [
            'http://example.com/image1.jpg',
            'http://example.com/image2.png',
            'http://example.com/image3.gif',
        ];

        mockGet.mockResolvedValueOnce({
            items: mockImageLinks.map(link => ({ link: link })),
        });

        const result = await googleSearch.searchImage(mockQuery);

        expect(mockGet).toHaveBeenCalledWith(
            'https://www.googleapis.com',
            '/customsearch/v1',
            expect.stringContaining('q=test+query'),
            {}
        );
        expect(mockEmbedBuilder).toHaveBeenCalledTimes(1);
        expect(mockSetImage).toHaveBeenCalledWith(mockImageLinks[0]); // Math.random(0.1) * 50 = 5, so index 0
        expect(mockSetDescription).toHaveBeenCalledWith(mockImageLinks[0]);
        expect(result).toEqual({
            embeds: [{ mockEmbed: true }],
        });
    });

    test('searchImage should throw an error if no images are found', async () => {
        const mockQuery = 'no images';

        mockGet.mockResolvedValueOnce({
            items: [],
        });

        await expect(googleSearch.searchImage(mockQuery)).rejects.toThrow('No images found');
        expect(mockEmbedBuilder).not.toHaveBeenCalled();
    });

    test('searchImage should handle API errors', async () => {
        const mockQuery = 'error query';
        const mockError = new Error('API call failed');

        mockGet.mockRejectedValueOnce(mockError);

        await expect(googleSearch.searchImage(mockQuery)).rejects.toThrow('API call failed');
        expect(console.error).toHaveBeenCalledWith(mockError);
        expect(mockEmbedBuilder).not.toHaveBeenCalled();
    });
});