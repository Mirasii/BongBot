
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

const noCommand = require('../../src/commands/no');
describe('no command', () => {
    it('should have a data property', () => {
        expect(noCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "no"', () => {
        expect(noCommand.data.name).toBe('no');
    });

    it('should have a description', () => {
        expect(noCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(noCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with no.mp4 as attachment', async () => {
        const result = await noCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('no.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'no'
        };

        const result = await noCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

