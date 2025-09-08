
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

const mirasiCommand = require('../../src/commands/mirasi');
describe('mirasi command', () => {
    it('should have a data property', () => {
        expect(mirasiCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "mirasi"', () => {
        expect(mirasiCommand.data.name).toBe('mirasi');
    });

    it('should have a description', () => {
        expect(mirasiCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(mirasiCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with mirasi.mp4 as attachment', async () => {
        const result = await mirasiCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('mirasi.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'mirasi'
        };

        const result = await mirasiCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

