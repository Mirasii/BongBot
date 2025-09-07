
const fubukiCommand = require('../../src/commands/fubuki');
const { SlashCommandBuilder } = require('discord.js');
const google = require('../../src/helpers/googleSearch.js');
const ERROR_BUILDER = require('../../src/helpers/errorBuilder.js');

jest.mock('../../src/helpers/googleSearch.js');
jest.mock('../../src/helpers/errorBuilder.js');

describe('fubuki command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have a data property', () => {
        expect(fubukiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "fox"', () => {
        expect(fubukiCommand.data.name).toBe('fox');
    });

    it('should have a description', () => {
        expect(fubukiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(fubukiCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an image URL on success', async () => {
        google.searchImage.mockResolvedValue('http://example.com/fubuki.jpg');
        const result = await fubukiCommand.execute();
        expect(google.searchImage).toHaveBeenCalledWith('Shirakami Fubuki');
        expect(result).toBe('http://example.com/fubuki.jpg');
    });

    it('should return an error message on failure', async () => {
        google.searchImage.mockRejectedValue(new Error('Search failed'));
        ERROR_BUILDER.buildError.mockResolvedValue('Error message');
        const result = await fubukiCommand.execute();
        expect(google.searchImage).toHaveBeenCalledWith('Shirakami Fubuki');
        expect(ERROR_BUILDER.buildError).toHaveBeenCalled();
        expect(result).toBe('Error message');
    });
});
