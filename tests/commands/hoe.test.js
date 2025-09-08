
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

const hoeCommand = require('../../src/commands/hoe');
describe('hoe command', () => {
    it('should have a data property', () => {
        expect(hoeCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "hoe"', () => {
        expect(hoeCommand.data.name).toBe('hoe');
    });

    it('should have a description', () => {
        expect(hoeCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(hoeCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with hoe.mp4 as attachment', async () => {
        const result = await hoeCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('hoe.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'hoe'
        };

        const result = await hoeCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

