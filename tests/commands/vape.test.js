
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

const vapeCommand = require('../../src/commands/vape');
describe('vape command', () => {
    it('should have a data property', () => {
        expect(vapeCommand.data).toBeInstanceOf(SlashCommandBuilder);
    });

    it('should have a name of "vape"', () => {
        expect(vapeCommand.data.name).toBe('vape');
    });

    it('should have a description', () => {
        expect(vapeCommand.data.description).toBeTruthy();
    });

    it('should have an execute method', () => {
        expect(vapeCommand.execute).toBeInstanceOf(Function);
    });

    it('should return an object with vape.mp4 as attachment', async () => {
        const result = await vapeCommand.execute();
        expect(result).toHaveProperty('files');
        expect(result.files[0]).toHaveProperty('attachment');
        expect(result.files[0].name).toBe('vape.mp4');
    });

    it('should handle error scenarios', async () => {
        fs.readFileSync.mockImplementationOnce(() => {
            throw new Error('File read error');
        });

        const mockInteraction = {
            commandName: 'vape'
        };

        const result = await vapeCommand.execute(mockInteraction);
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('embeds');
        expect(result).toHaveProperty('files');
        expect(result).toHaveProperty('flags', 64); // MessageFlags.Ephemeral
    });
});

