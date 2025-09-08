
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

const classicCommand = require('../../src/commands/classic');
describe('classic command', () => {
    it('should have a data property', () => {
        expect(classicCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "classic"', () => {
        expect(classicCommand.data.name).toBe('classic');
    });

    it('should have a description', () => {
        expect(classicCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(classicCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with classic.mp4 as attachment', async () => {
        const result = await classicCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('classic.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'classic'
        };

        const result = await classicCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

