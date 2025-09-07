import { SlashCommandBuilder } from '@discordjs/builders';

const polkaCommand = require('../../src/commands/polka.js');

// Mock the googleSearch module
jest.mock('../../src/helpers/googleSearch.js', () => ({
    searchImage: jest.fn(),
}));

// Mock the ERROR_BUILDER module
jest.mock('../../src/helpers/errorBuilder.js', () => ({
    buildError: jest.fn(),
}));

describe('polka command', () => {
    const mockInteraction = {
        reply: jest.fn(),
    };

    const mockClient = {};

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('should successfully return an image URL', async () => {
        require('../../src/helpers/googleSearch.js').searchImage.mockResolvedValueOnce('http://example.com/polka_image.jpg');

        const result = await polkaCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/googleSearch.js').searchImage).toHaveBeenCalledWith('Omaru Polka');
        expect(result).toBe('http://example.com/polka_image.jpg');
    });

    test('should handle errors from google.searchImage', async () => {
        const mockError = new Error('Google Search Error');
        require('../../src/helpers/googleSearch.js').searchImage.mockRejectedValueOnce(mockError);

        await polkaCommand.execute(mockInteraction, mockClient);

        expect(require('../../src/helpers/errorBuilder.js').buildError).toHaveBeenCalledWith(
            mockInteraction,
            mockError
        );
    });
});
