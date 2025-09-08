
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

const creeperCommand = require('../../src/commands/creeper');
describe('creeper command', () => {
    it('should have a data property', () => {
        expect(creeperCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "creeper"', () => {
        expect(creeperCommand.data.name).toBe('creeper');
    });

    it('should have a description', () => {
        expect(creeperCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(creeperCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with creeper.webm as attachment', async () => {
        const result = await creeperCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('creeper.webm');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'creeper'
        };

        const result = await creeperCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

