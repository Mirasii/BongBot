
const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

jest.mock('fs', () => ({
    readFileSync: jest.fn()
}));

// Mock the error builder to avoid deep dependencies
jest.mock('../../src/helpers/errorBuilder', () => ({
    buildError: jest.fn().mockResolvedValue({
        embeds: [],
        files: [],
        flags: 64,
        isError: true
    })
}));

const danceCommand = require('../../src/commands/dance');
describe('dance command', () => {
    it('should have a data property', () => {
        expect(danceCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "dance"', () => {
        expect(danceCommand.data.name).toBe('dance');
    });

    it('should have a description', () => {
        expect(danceCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(danceCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with dance.mp4 as attachment', async () => {
        const result = await danceCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('dance.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'dance'
        };

        const result = await danceCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

