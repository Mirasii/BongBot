
const youCommand = require('../../src/commands/you');
const { SlashCommandBuilder } = require('discord.js');
// Mock embedBuilder
const mockBuild = jest.fn().mockResolvedValue({ files: [{ attachment: 'mock-attachment', name: 'you.png' }] });
const mockConstructEmbedWithImage = jest.fn().mockReturnValue({ build: mockBuild });

jest.mock('../../src/helpers/embedBuilder.js', () => ({
    EMBED_BUILDER: jest.fn().mockImplementation(() => ({
        constructEmbedWithImage: mockConstructEmbedWithImage
    }))
}));

jest.mock('../../src/helpers/errorBuilder', () => ({
    buildError: jest.fn().mockResolvedValue({
        embeds: [],
        files: [],
        flags: 64,
        isError: true
    })
}));

describe('you command', () => {
    it('should have a data property', () => {
        expect(youCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "you"', () => {
        expect(youCommand.data.name).toBe('you');
    });

    it('should have a description', () => {
        expect(youCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(youCommand.execute).toBeInstanceOf(Function);
    });

    it('should return the correct file object', async () => {
        const mockInteraction = {};
        const result = await youCommand.execute(mockInteraction);
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('you.png');
    });

    it('should handle error scenarios', async () => {
        // Make the build function throw an error for this test
        mockBuild.mockRejectedValueOnce(new Error('Build failed'));

        const mockInteraction = {
            commandName: 'you'
        };

        const result = await youCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});
