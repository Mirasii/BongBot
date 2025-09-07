
const infoCommand = require('../../src/commands/info');
const { SlashCommandBuilder } = require('discord.js');
const { generateCard } = require('../../src/helpers/infoCard.js');
const ERROR_BUILDER = require('../../src/helpers/errorBuilder.js');

jest.mock('../../src/helpers/infoCard.js');
jest.mock('../../src/helpers/errorBuilder.js');

describe('info command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should have a data property', () => {
        expect(infoCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "info"', () => {
        expect(infoCommand.data.name).toBe('info');
    });

    it('should have a description', () => {
        expect(infoCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(infoCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an embed on success', async () => {
        const mockEmbed = { title: 'Test Embed' };
        generateCard.mockResolvedValue(mockEmbed);
        const result = await infoCommand.execute();
        expect(generateCard).toHaveBeenCalled();
        expect(result).toEqual({ embeds: [mockEmbed] });
    });

    it('should return an error message on failure', async () => {
        generateCard.mockRejectedValue(new Error('Card generation failed'));
        ERROR_BUILDER.buildError.mockResolvedValue('Error message');
        const result = await infoCommand.execute();
        expect(generateCard).toHaveBeenCalled();
        expect(ERROR_BUILDER.buildError).toHaveBeenCalled();
        expect(result).toBe('Error message');
    });
});
