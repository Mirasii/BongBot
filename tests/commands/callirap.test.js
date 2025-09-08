
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

const callirapCommand = require('../../src/commands/callirap');
describe('callirap command', () => {
    it('should have a data property', () => {
        expect(callirapCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "callirap"', () => {
        expect(callirapCommand.data.name).toBe('callirap');
    });

    it('should have a description', () => {
        expect(callirapCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(callirapCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with callirap.mp4 as attachment', async () => {
        const result = await callirapCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('callirap.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'callirap'
        };

        const result = await callirapCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

